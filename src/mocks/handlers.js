import { delay, HttpResponse } from 'msw'
import { leerModoSimulacion, MODOS } from './simulacion.js'

// Rutas relativas a la base del sitio, para que funcionen también en GitHub Pages
export const API = `${import.meta.env.BASE_URL}api`

const DEMORA_MINIMA = 400
const DEMORA_MAXIMA = 900
const DEMORA_LENTA = 4000

const MENSAJE_ERROR_SERVIDOR = 'El servidor tuvo un problema. Intenta nuevamente en unos momentos.'

function demoraNormal() {
  return DEMORA_MINIMA + Math.floor(Math.random() * (DEMORA_MAXIMA - DEMORA_MINIMA + 1))
}

// Simulación de la red, común a REST y GraphQL: lee el modo del selector del pie, espera la
// demora que corresponde y devuelve el modo. Cada API arma después su propia respuesta de falla
export async function esperarRed() {
  const modo = leerModoSimulacion()
  await delay(modo === MODOS.lenta ? DEMORA_LENTA : demoraNormal())
  return modo
}

// Respuesta REST para los modos de falla; null si la petición debe responderse normal
export function respuestaFallaRest(modo) {
  if (modo === MODOS.sinConexion) {
    return HttpResponse.error()
  }
  if (modo === MODOS.errorServidor) {
    return HttpResponse.json({ mensaje: MENSAJE_ERROR_SERVIDOR }, { status: 500 })
  }
  return null
}

// 404 REST con cuerpo { mensaje }
export function noEncontrado(mensaje) {
  return HttpResponse.json({ mensaje }, { status: 404 })
}

// Los recursos REST y la consulta GraphQL se agregan en los pasos siguientes
export const handlers = []
