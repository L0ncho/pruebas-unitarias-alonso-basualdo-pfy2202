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
