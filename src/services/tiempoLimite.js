import { TIEMPO_LIMITE_MS } from '../config/api.js'
import { crearErrorTiempoAgotado } from '../utils/errores.js'

// Tiempo límite de una petición, común al cliente REST y al fetch del cliente Apollo.
// ejecutar(signal) hace la petición y lee el cuerpo con la señal que recibe.
// - Si vence el plazo, se rechaza de inmediato con un error marcado tiempoAgotado (sin esperar
//   a que fetch atienda el abort) y se aborta la petición.
// - Si la señal externa se cancela antes, se propaga la cancelación tal cual (AbortError).
// La marca es propia y no se lee signal.reason: así un tiempo agotado nunca se confunde con
// una cancelación. No usa AbortSignal.any ni AbortSignal.timeout (compatibilidad con Safari 16.4)
export function conTiempoLimite(ejecutar, { signal, ms = TIEMPO_LIMITE_MS } = {}) {
  const controlador = new AbortController()

  function alCancelar() {
    controlador.abort()
  }

  if (signal?.aborted) {
    controlador.abort()
  } else {
    signal?.addEventListener('abort', alCancelar, { once: true })
  }

  let temporizador
  const vencimiento = new Promise((_resolver, rechazar) => {
    temporizador = setTimeout(() => {
      rechazar(crearErrorTiempoAgotado())
      controlador.abort()
    }, ms)
  })

  // Si gana el vencimiento, el rechazo posterior de la petición abortada se descarta
  const peticion = Promise.resolve().then(() => ejecutar(controlador.signal))

  return Promise.race([peticion, vencimiento]).finally(() => {
    clearTimeout(temporizador)
    signal?.removeEventListener('abort', alCancelar)
  })
}
