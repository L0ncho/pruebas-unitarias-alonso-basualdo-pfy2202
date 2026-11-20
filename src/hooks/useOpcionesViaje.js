import { skipToken, useApolloClient, useQuery } from '@apollo/client/react'
import { useState } from 'react'
import { leerRecepcion } from '../services/clienteApollo.js'
import { OPCIONES_VIAJE, variablesOpcionesViaje } from '../services/consultas.js'
import { ahora } from '../services/reloj.js'
import { derivarEstadoOpcionesViaje, politicaCacheApollo } from '../utils/consulta.js'

const OPERACION = 'OpcionesViaje'

// Vuelos y hoteles de un destino (GraphQL), con la misma forma que useConsulta:
// { datos, cargando, error, reintentar }. datos es el destino con sus vuelos y hoteles.
// - Con un id inválido no hay petición: cargando false, error null y datos undefined.
// - Dato vigente (VIGENCIA_CACHE_MS): cache-first, sin repetir la petición.
// - Dato vencido: cache-and-network. Se muestra al instante con cargando true (aria-busy en la
//   vista, como al reintentar) y se reemplaza al llegar la respuesta. Si falla, Apollo mantiene
//   los datos anteriores junto al error, igual que un reintento fallido.
// - La política se elige una vez por visita (al entrar al destino), no en cada render.
// - reintentar pide de nuevo al servidor; mientras tanto Apollo mantiene los datos que había.
// - Nunca se usan los datos de otro destino (previousData) y una cancelación no es un error.
export function useOpcionesViaje(destinoId) {
  const cliente = useApolloClient()
  const variables = variablesOpcionesViaje(destinoId)
  const idVariables = variables?.id ?? null

  // Política fijada al entrar al destino (ajuste de estado durante el render, sin efecto)
  const [visita, setVisita] = useState(() => ({
    id: idVariables,
    politica: politicaCacheApollo(leerRecepcion(cliente, OPERACION, variables), ahora()),
  }))
  if (visita.id !== idVariables) {
    setVisita({
      id: idVariables,
      politica: politicaCacheApollo(leerRecepcion(cliente, OPERACION, variables), ahora()),
    })
  }

  const resultado = useQuery(
    OPCIONES_VIAJE,
    variables === null ? skipToken : { variables, ...visita.politica },
  )

  if (variables === null) {
    return { datos: undefined, cargando: false, error: null, reintentar: () => {} }
  }

  function reintentar() {
    // El error de un reintento llega por error; aquí solo se evita el rechazo sin manejar
    resultado.refetch().catch(() => {})
  }

  return { ...derivarEstadoOpcionesViaje(resultado), reintentar }
}
