import { obtenerJson } from './clienteHttp.js'

// Ruta del listado de destinos, relativa a la base de la API.
// La usa useDestinos (vía useConsulta) y es también la clave de la caché del cliente
export const RUTA_DESTINOS = '/destinos'

// Listado de destinos con su país y actividades populares.
// Opciones del cliente HTTP: signal (cancelación) y forzar (ignorar la caché)
export function obtenerDestinos(opciones) {
  return obtenerJson(RUTA_DESTINOS, opciones)
}
