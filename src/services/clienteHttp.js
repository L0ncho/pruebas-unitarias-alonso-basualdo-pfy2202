import { ahora } from './reloj.js'
import { conTiempoLimite } from './tiempoLimite.js'
import { crearErrorDatosIncompletos, normalizarError } from '../utils/errores.js'
import { estaVigente } from '../utils/vigencia.js'

// Cliente HTTP único de la aplicación.
// - Caché en memoria por URL con vigencia (VIGENCIA_CACHE_MS desde que llega la respuesta): un
//   dato vigente no se vuelve a pedir (salvo con forzar); uno vencido se sigue pudiendo leer con
//   leerCache, pero obtenerJson lo pide de nuevo. Si esa petición falla, el dato vencido se queda.
// - Peticiones en curso compartidas: varios consumidores de la misma URL esperan una sola
//   petición de red.
// - Cancelación por consumidor: cada uno pasa su signal; al cancelar, solo se rechaza su promesa.
//   La petición de red se aborta cuando ya no queda ningún consumidor esperándola.
// - Tiempo límite por petición de red (incluida la lectura del cuerpo): al vencer, todos los
//   consumidores que la esperan reciben "tiempo-agotado".
// - Validación: un JSON ilegible o datos que no pasan el validador dan "datos-incompletos".
// - Un error o un dato inválido nunca se guarda en caché.

// Relativa a la base del sitio, para que funcione también en GitHub Pages
const BASE_API = `${import.meta.env.BASE_URL}api`

// url → { datos, recibidoEn }
const cache = new Map()
const enCurso = new Map()

function construirUrl(ruta) {
  return `${BASE_API}${ruta}`
}

function errorCancelado() {
  return normalizarError(new DOMException('La consulta se canceló.', 'AbortError'))
}

// Consulta síncrona de la caché: permite saber en el primer render si hay datos y evitar el
// indicador de carga. Entrega el dato aunque esté vencido: la vista lo muestra mientras se actualiza
export function leerCache(ruta) {
  return cache.get(construirUrl(ruta))?.datos
}

// Si el dato en caché de la ruta está vigente en momento (por defecto, ahora)
export function cacheVigente(ruta, momento = ahora()) {
  return estaVigente(cache.get(construirUrl(ruta))?.recibidoEn, momento)
}

async function leerMensaje(respuesta) {
  try {
    const cuerpo = await respuesta.json()
    return typeof cuerpo?.mensaje === 'string' ? cuerpo.mensaje : undefined
  } catch {
    return undefined
  }
}

async function pedir(url, signal) {
  let respuesta
  try {
    respuesta = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    // Solo el rechazo de fetch se considera falla de red
    throw normalizarError(error?.name === 'AbortError' ? error : { red: true })
  }

  if (!respuesta.ok) {
    throw normalizarError({ estado: respuesta.status, mensaje: await leerMensaje(respuesta) })
  }

  try {
    return await respuesta.json()
  } catch (error) {
    // Una cancelación durante la lectura del cuerpo sigue siendo una cancelación
    if (error?.name === 'AbortError') throw normalizarError(error)
    // Una respuesta 2xx con un cuerpo ilegible: los datos no llegaron completos
    throw normalizarError(crearErrorDatosIncompletos(error))
  }
}

function crearPeticion(url, validar) {
  const peticion = { controlador: new AbortController(), consumidores: 0, promesa: null }

  // El plazo cubre la petición de red compartida, no a cada consumidor. La señal externa es la
  // del controlador de la petición: se aborta cuando ya nadie la espera (cancelación)
  peticion.promesa = conTiempoLimite((signal) => pedir(url, signal), {
    signal: peticion.controlador.signal,
  })
    .catch((error) => {
      throw normalizarError(error)
    })
    .then((datos) => {
      // Se valida antes de guardar: un dato inválido nunca entra a la caché
      if (validar && !validar(datos)) throw normalizarError(crearErrorDatosIncompletos())
      // La vigencia se cuenta desde que llega una respuesta válida
      cache.set(url, { datos, recibidoEn: ahora() })
      return datos
    })
    .finally(() => {
      if (enCurso.get(url) === peticion) enCurso.delete(url)
    })
  // Cada consumidor recibe el error en su propia promesa; esto evita un rechazo sin manejar
  // cuando la petición se aborta porque ya nadie la espera
  peticion.promesa.catch(() => {})

  enCurso.set(url, peticion)
  return peticion
}

// El abort se difiere a una microtarea: en StrictMode React desmonta y vuelve a montar el efecto
// en la misma tarea, y así el segundo montaje se une a la petición en curso en vez de repetirla
function soltar(url, peticion) {
  peticion.consumidores -= 1
  if (peticion.consumidores > 0) return

  queueMicrotask(() => {
    if (peticion.consumidores === 0 && enCurso.get(url) === peticion) {
      enCurso.delete(url)
      peticion.controlador.abort()
    }
  })
}

// Devuelve los datos de la ruta. Opciones:
// - signal: cancela la espera de este consumidor (se rechaza con tipo "cancelado")
// - forzar: ignora la caché y pide los datos de nuevo (se une a una petición en curso si existe)
// - validar: función (datos) => boolean. Si devuelve false, se rechaza con "datos-incompletos"
//   y nada queda en caché. Una petición compartida usa el validador de quien la creó; por eso
//   cada ruta se pide con su validador desde un solo lugar (el recurso de su servicio)
// Sin forzar, responde desde la caché solo si el dato está vigente; si venció, lo pide de nuevo
// (con el mismo tiempo límite y la misma validación)
export function obtenerJson(ruta, { signal, forzar = false, validar } = {}) {
  const url = construirUrl(ruta)

  if (signal?.aborted) return Promise.reject(errorCancelado())
  if (!forzar && cacheVigente(ruta)) return Promise.resolve(cache.get(url).datos)

  const peticion = enCurso.get(url) ?? crearPeticion(url, validar)
  peticion.consumidores += 1

  return new Promise((resolver, rechazar) => {
    let pendiente = true

    function alCancelar() {
      if (!pendiente) return
      pendiente = false
      rechazar(errorCancelado())
      soltar(url, peticion)
    }

    signal?.addEventListener('abort', alCancelar, { once: true })

    peticion.promesa
      .then(
        (datos) => {
          if (!pendiente) return
          pendiente = false
          resolver(datos)
        },
        (error) => {
          if (!pendiente) return
          pendiente = false
          rechazar(error)
        },
      )
      .finally(() => signal?.removeEventListener('abort', alCancelar))
  })
}
