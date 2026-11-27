import { conTiempoLimite } from './tiempoLimite.js'
import { TIEMPO_LIMITE_MS } from '../config/api.js'
import { DEMORA_LENTA } from '../mocks/handlers.js'
import { normalizarError, TIPOS_ERROR } from '../utils/errores.js'

// Pruebas de la implementación única del tiempo límite, con temporizadores falsos: no se esperan
// 15 s reales. ejecutar simula una petición que respeta la señal, como fetch

// Petición simulada: se resuelve con valor a los ms indicados o se rechaza con AbortError
// cuando se aborta su señal. Guarda la señal recibida para revisarla
function peticionSimulada(ms, valor = 'datos') {
  const simulada = { signal: null }
  simulada.ejecutar = (signal) => {
    simulada.signal = signal
    return new Promise((resolver, rechazar) => {
      if (signal.aborted) {
        rechazar(new DOMException('Abortado', 'AbortError'))
        return
      }
      const temporizador = setTimeout(() => resolver(valor), ms)
      signal.addEventListener('abort', () => {
        clearTimeout(temporizador)
        rechazar(new DOMException('Abortado', 'AbortError'))
      })
    })
  }
  return simulada
}

// Promesa con su resultado ya capturado, para revisarlo después de avanzar los temporizadores
function capturar(promesa) {
  const resultado = { estado: 'pendiente' }
  promesa.then(
    (valor) => Object.assign(resultado, { estado: 'resuelta', valor }),
    (error) => Object.assign(resultado, { estado: 'rechazada', error }),
  )
  return resultado
}

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

describe('conTiempoLimite', () => {
  it('el plazo es de 15 s y supera la respuesta lenta del mock', () => {
    expect(TIEMPO_LIMITE_MS).toBe(15000)
    expect(DEMORA_LENTA).toBeLessThan(TIEMPO_LIMITE_MS)
  })

  it('una respuesta dentro del plazo se entrega y el temporizador se limpia', async () => {
    const simulada = peticionSimulada(DEMORA_LENTA)
    const resultado = capturar(conTiempoLimite(simulada.ejecutar))

    await jest.advanceTimersByTimeAsync(DEMORA_LENTA)

    expect(resultado).toEqual({ estado: 'resuelta', valor: 'datos' })
    expect(jest.getTimerCount()).toBe(0)
  })

  it('al vencer el plazo se rechaza con "tiempo-agotado" y se aborta la petición', async () => {
    const simulada = peticionSimulada(60000)
    const resultado = capturar(conTiempoLimite(simulada.ejecutar))

    await jest.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS - 1)
    expect(resultado.estado).toBe('pendiente')

    await jest.advanceTimersByTimeAsync(1)
    expect(resultado.estado).toBe('rechazada')
    expect(resultado.error).toBeInstanceOf(Error)
    expect(normalizarError(resultado.error).tipo).toBe(TIPOS_ERROR.tiempoAgotado)
    expect(simulada.signal.aborted).toBe(true)
    expect(jest.getTimerCount()).toBe(0)
  })

  it('vence aunque la petición ignore la señal', async () => {
    const resultado = capturar(conTiempoLimite(() => new Promise(() => {})))

    await jest.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS)

    expect(normalizarError(resultado.error).tipo).toBe(TIPOS_ERROR.tiempoAgotado)
  })

  it('cancelar antes del plazo da "cancelado", no "tiempo-agotado"', async () => {
    const controlador = new AbortController()
    const simulada = peticionSimulada(60000)
    const resultado = capturar(conTiempoLimite(simulada.ejecutar, { signal: controlador.signal }))
    await jest.advanceTimersByTimeAsync(1000)

    controlador.abort()
    await jest.advanceTimersByTimeAsync(0)

    expect(normalizarError(resultado.error).tipo).toBe(TIPOS_ERROR.cancelado)
    expect(simulada.signal.aborted).toBe(true)
    // El temporizador del plazo se limpió: no vence después
    expect(jest.getTimerCount()).toBe(0)
  })

  it('cancelar después de vencer no cambia el resultado', async () => {
    const controlador = new AbortController()
    const resultado = capturar(
      conTiempoLimite(peticionSimulada(60000).ejecutar, { signal: controlador.signal }),
    )

    await jest.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS)
    controlador.abort()
    await jest.advanceTimersByTimeAsync(0)

    expect(normalizarError(resultado.error).tipo).toBe(TIPOS_ERROR.tiempoAgotado)
  })

  it('con una señal ya cancelada, la petición recibe la señal abortada', async () => {
    const controlador = new AbortController()
    controlador.abort()
    const simulada = peticionSimulada(1000)

    const resultado = capturar(conTiempoLimite(simulada.ejecutar, { signal: controlador.signal }))
    await jest.advanceTimersByTimeAsync(0)

    expect(simulada.signal.aborted).toBe(true)
    expect(normalizarError(resultado.error).tipo).toBe(TIPOS_ERROR.cancelado)
  })

  it('al terminar se quita el listener de la señal externa', async () => {
    const controlador = new AbortController()
    const quitar = jest.spyOn(controlador.signal, 'removeEventListener')

    const resultado = capturar(
      conTiempoLimite(peticionSimulada(100).ejecutar, { signal: controlador.signal }),
    )
    await jest.advanceTimersByTimeAsync(100)

    expect(resultado.estado).toBe('resuelta')
    expect(quitar).toHaveBeenCalledWith('abort', expect.any(Function))
  })
})
