import { skipToken, useQuery } from '@apollo/client/react'
import { OPCIONES_VIAJE, variablesOpcionesViaje } from '../services/consultas.js'
import { normalizarError, TIPOS_ERROR } from '../utils/errores.js'

// Vuelos y hoteles de un destino (GraphQL), con la misma forma que useConsulta:
// { datos, cargando, error, reintentar }. datos es el destino con sus vuelos y hoteles.
// - Con un id inválido no hay petición: cargando false, error null y datos undefined.
// - cache-first: volver a un destino ya consultado no repite la petición.
// - reintentar pide de nuevo al servidor; mientras tanto Apollo mantiene los datos que había.
// - Nunca se usan los datos de otro destino (previousData) y una cancelación no es un error.
export function useOpcionesViaje(destinoId) {
  const variables = variablesOpcionesViaje(destinoId)

  const { data, loading, error, refetch } = useQuery(
    OPCIONES_VIAJE,
    variables === null ? skipToken : { variables, fetchPolicy: 'cache-first' },
  )

  if (variables === null) {
    return { datos: undefined, cargando: false, error: null, reintentar: () => {} }
  }

  const errorNormalizado = error ? normalizarError(error) : null

  function reintentar() {
    // El error de un reintento llega por error; aquí solo se evita el rechazo sin manejar
    refetch().catch(() => {})
  }

  return {
    datos: data?.destino ?? undefined,
    cargando: loading,
    error: errorNormalizado?.tipo === TIPOS_ERROR.cancelado ? null : errorNormalizado,
    reintentar,
  }
}
