import { gql } from '@apollo/client'
import { convertirEntero } from '../utils/ids.js'

// Vuelos y hoteles de un destino, con los datos del destino que muestra su página, en una
// sola petición. Se piden solo los campos que se muestran
export const OPCIONES_VIAJE = gql`
  query OpcionesViaje($id: ID!) {
    destino(id: $id) {
      id
      nombre
      pais
      descripcion
      vuelos {
        id
        aerolinea
        origen
        fechaIda
        fechaVuelta
        escalas
        precio
        asientosDisponibles
      }
      hoteles {
        id
        nombre
        estrellas
        zona
        fechaEntrada
        fechaSalida
        precioPorNoche
        habitacionesDisponibles
      }
    }
  }
`

// Variables de OPCIONES_VIAJE a partir del id de la URL, o null si el id no es válido
// (entonces no se consulta). El id va normalizado: "7" y "007" comparten la entrada de caché
export function variablesOpcionesViaje(destinoId) {
  const id = convertirEntero(destinoId)
  return id === null ? null : { id: String(id) }
}
