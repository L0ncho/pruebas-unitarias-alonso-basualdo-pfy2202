import { obtenerJson } from './clienteHttp.js'
import { validarListadoDestinos } from '../utils/validacion.js'

// Ruta del listado de destinos, relativa a la base de la API. Es también la clave de la caché
// del cliente
export const RUTA_DESTINOS = '/destinos'

// Recurso del listado: la ruta junto con su validador, definidos en un solo lugar. Lo usan
// useDestinos (vía useConsulta) y obtenerDestinos, así ningún punto de entrada pide la ruta
// sin validar la respuesta
export const RECURSO_DESTINOS = { ruta: RUTA_DESTINOS, validar: validarListadoDestinos }

// Listado de destinos con su país y actividades populares.
// Opciones del cliente HTTP: signal (cancelación) y forzar (ignorar la caché)
export function obtenerDestinos(opciones) {
  return obtenerJson(RECURSO_DESTINOS.ruta, { ...opciones, validar: RECURSO_DESTINOS.validar })
}
