import { estaVigente } from './vigencia.js'
import { normalizarError, TIPOS_ERROR } from './errores.js'

// Estado que muestran las vistas a partir de una consulta: { datos, cargando, error }.
// Funciones puras usadas por useConsulta (REST) y useOpcionesViaje (GraphQL), para que ambas
// APIs se vean igual. La regla común: mientras se actualiza, los datos que ya había siguen
// visibles (la vista los marca con aria-busy); nunca se reemplazan por el indicador de carga

// REST (useConsulta).
// - hayRuta: false cuando no se consulta (id inválido)
// - enCache: datos guardados para la ruta (vigentes o vencidos) o undefined
// - vigente: si el dato en caché seguía vigente al entrar a la vista
// - terminada: si ya llegó la respuesta (o el error) de la consulta actual
// - forzada: si la consulta actual es un reintento
// - ultimo: último resultado { datos, error } de este consumidor
export function derivarEstadoConsulta({ hayRuta, enCache, vigente, terminada, forzada, ultimo }) {
  if (!hayRuta) return { datos: undefined, cargando: false, error: null }

  // Un dato vigente no genera petición; uno vencido o ausente sí, y también un reintento
  const cargando = !terminada && (forzada || enCache === undefined || !vigente)
  return {
    // El dato en caché se muestra aunque esté vencido; sin caché, los últimos datos mientras carga
    datos: enCache ?? (cargando ? ultimo.datos : undefined),
    cargando,
    error: terminada ? ultimo.error : null,
  }
}

// GraphQL (useOpcionesViaje), desde el resultado de useQuery. loading es true tanto al cargar con
// datos de una caché vencida (cache-and-network, networkStatus 1) como al reintentar (refetch,
// networkStatus 4): en ambos casos se mantienen los datos. Una cancelación no es un error
export function derivarEstadoOpcionesViaje({ data, loading, error }) {
  const errorNormalizado = error ? normalizarError(error) : null
  return {
    datos: data?.destino ?? undefined,
    cargando: loading,
    error: errorNormalizado?.tipo === TIPOS_ERROR.cancelado ? null : errorNormalizado,
  }
}

// Política de caché de Apollo para una visita: con un dato vencido se muestra la caché y se pide
// a la red (cache-and-network); después de esa petición vuelve a cache-first, así una escritura
// posterior en la caché no dispara otra petición. Vigente o sin dato: cache-first, como siempre
export function politicaCacheApollo(recibidoEn, momento) {
  if (recibidoEn === undefined || estaVigente(recibidoEn, momento)) {
    return { fetchPolicy: 'cache-first' }
  }
  return { fetchPolicy: 'cache-and-network', nextFetchPolicy: 'cache-first' }
}
