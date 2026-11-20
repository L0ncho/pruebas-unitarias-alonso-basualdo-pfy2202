import { useEffect, useState } from 'react'
import { cacheVigente, leerCache, obtenerJson } from '../services/clienteHttp.js'
import { ahora } from '../services/reloj.js'
import { derivarEstadoConsulta } from '../utils/consulta.js'
import { TIPOS_ERROR } from '../utils/errores.js'

// Consulta genérica a la API. recurso: { ruta, validar } (ver services/destinos.js); con recurso
// null no se hace ninguna petición (por ejemplo, un id inválido).
// Devuelve { datos, cargando, error, reintentar }:
// - Con un dato vigente en caché no hay petición ni indicador de carga.
// - Con un dato vencido, se muestra al instante y se actualiza en segundo plano (cargando true,
//   como al reintentar). Si la actualización falla, el dato sigue visible junto al error.
// - Mientras carga se mantienen visibles los últimos datos obtenidos.
// - reintentar pide de nuevo al servidor aunque haya caché.
// El efecto depende de la ruta y del validador, no del objeto: un recurso creado de nuevo en
// cada render no repite la petición
export function useConsulta(recurso) {
  const ruta = recurso?.ruta ?? null
  const validar = recurso?.validar
  // La vigencia se evalúa con el momento en que se entra a la ruta, en el render y en el efecto
  // por igual. Así un dato que vence mientras se está en la vista no deja un indicador de carga
  // sin petición; se actualiza en la próxima visita
  const [visita, setVisita] = useState(() => ({ ruta, momento: ahora() }))
  // El reintento queda atado a su ruta; al cambiar de ruta deja de aplicar
  const [reintento, setReintento] = useState({ ruta: null, numero: 0 })
  // Último resultado: clave de la consulta que lo produjo, últimos datos obtenidos y error
  const [resultado, setResultado] = useState({ clave: null, datos: undefined, error: null })

  // Nueva ruta, nueva visita (ajuste de estado durante el render, sin efecto)
  if (visita.ruta !== ruta) setVisita({ ruta, momento: ahora() })

  const momentoVisita = visita.ruta === ruta ? visita.momento : undefined
  const numeroReintento = reintento.ruta === ruta ? reintento.numero : 0
  const clave = ruta === null ? null : `${ruta}#${numeroReintento}`

  // Estado derivado: nada de esto se guarda
  const { datos, cargando, error } = derivarEstadoConsulta({
    hayRuta: ruta !== null,
    enCache: ruta === null ? undefined : leerCache(ruta),
    vigente: ruta !== null && momentoVisita !== undefined && cacheVigente(ruta, momentoVisita),
    terminada: resultado.clave === clave,
    forzada: numeroReintento > 0,
    ultimo: resultado,
  })

  useEffect(() => {
    if (ruta === null || momentoVisita === undefined) return

    const forzar = numeroReintento > 0
    if (!forzar && cacheVigente(ruta, momentoVisita)) return

    const claveConsulta = `${ruta}#${numeroReintento}`
    const controlador = new AbortController()

    obtenerJson(ruta, { signal: controlador.signal, forzar, validar })
      .then((datosNuevos) => {
        setResultado({ clave: claveConsulta, datos: datosNuevos, error: null })
        // Terminado el reintento, la ruta vuelve a usar la caché si se visita otra vez
        if (forzar) setReintento((actual) => ({ ruta: null, numero: actual.numero }))
      })
      .catch((errorConsulta) => {
        // Una cancelación nunca se muestra como error
        if (errorConsulta.tipo === TIPOS_ERROR.cancelado) return
        setResultado((anterior) => ({ clave: claveConsulta, datos: anterior.datos, error: errorConsulta }))
      })

    return () => controlador.abort()
  }, [ruta, validar, numeroReintento, momentoVisita])

  function reintentar() {
    if (ruta === null) return
    setReintento((actual) => ({ ruta, numero: actual.numero + 1 }))
  }

  return { datos, cargando, error, reintentar }
}
