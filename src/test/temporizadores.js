import { act } from '@testing-library/react'

// APIs de tiempo que Jest puede simular. Jest no tiene la opción toFake de Vitest: se indica
// cuáles no simular (doNotFake)
const APIS_SIMULABLES = [
  'Date',
  'hrtime',
  'nextTick',
  'performance',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
]

// Simula solo la fecha (Date.now, new Date), con los temporizadores reales: las demoras del mock
// corren de verdad y la hora se controla con jest.setSystemTime. Equivale a
// vi.useFakeTimers({ toFake: ['Date'] })
export function simularSoloFecha() {
  jest.useFakeTimers({ doNotFake: APIS_SIMULABLES.filter((api) => api !== 'Date') })
}

// Avanza los temporizadores falsos dentro de act: las actualizaciones de React que provoca el
// tiempo (respuestas del mock, tiempo límite) se aplican sin advertencias de act()
export async function avanzar(ms) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms)
  })
}
