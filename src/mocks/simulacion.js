import { ALMACENES, guardarAlmacenamiento, leerAlmacenamiento } from '../utils/almacenamiento.js'

// Único lugar donde se definen la clave y los modos de simulación de la API.
// Lo usan los handlers (para decidir la respuesta) y el selector del pie (para cambiar el modo)
export const CLAVE_SIMULACION = 'airfly-simulacion'

export const MODOS = {
  normal: 'normal',
  errorServidor: 'error-servidor',
  sinConexion: 'sin-conexion',
  lenta: 'lenta',
  sinRespuesta: 'sin-respuesta',
}

export const OPCIONES_SIMULACION = [
  { valor: MODOS.normal, etiqueta: 'Normal' },
  { valor: MODOS.errorServidor, etiqueta: 'Error del servidor (500)' },
  { valor: MODOS.sinConexion, etiqueta: 'Sin conexión' },
  { valor: MODOS.lenta, etiqueta: 'Respuesta lenta (4 s)' },
  { valor: MODOS.sinRespuesta, etiqueta: 'Sin respuesta' },
]

const valoresValidos = new Set(Object.values(MODOS))

// Si no hay modo guardado, no es válido o sessionStorage no está disponible (bloqueado o
// inexistente), se usa "normal"
export function leerModoSimulacion() {
  const guardado = leerAlmacenamiento(ALMACENES.sesion, CLAVE_SIMULACION)
  return valoresValidos.has(guardado) ? guardado : MODOS.normal
}

// Sin acceso a sessionStorage no se guarda: la simulación sigue en modo normal
export function guardarModoSimulacion(modo) {
  if (!valoresValidos.has(modo)) return
  guardarAlmacenamiento(ALMACENES.sesion, CLAVE_SIMULACION, modo)
}
