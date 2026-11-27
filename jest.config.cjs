// Configuración de Jest. .cjs porque el paquete es "type": "module". Jest corre con la
// transformación de Babel a CommonJS (babel.config.cjs), no con el modo ESM experimental

// Paquetes de node_modules que se publican solo como ESM y Babel debe transformar
const PAQUETES_ESM = ['react-router', '@remix-run/route-pattern', '@apollo/client', 'until-async', 'rettime']

/** @type {import('jest').Config} */
module.exports = {
  // jsdom con los globales de Node que MSW 2 necesita (fetch, Response, streams,
  // BroadcastChannel...) y las condiciones de exportación correctas para msw/node
  testEnvironment: 'jest-fixed-jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/configuracion.js'],
  testMatch: ['<rootDir>/src/**/*.test.{js,jsx}'],

  // .mjs y .cjs incluidos: algunos paquetes ESM se resuelven a su build .mjs (por ejemplo, rettime)
  transform: { '\\.[mc]?[jt]sx?$': 'babel-jest' },
  // Se transforma también cualquier build .mjs de node_modules: varias dependencias de MSW
  // (rettime, @open-draft/*...) se resuelven a su versión ESM con las condiciones de jest-fixed-jsdom
  transformIgnorePatterns: [`/node_modules/(?!(?:${PAQUETES_ESM.join('|')})/)(?!.*\\.mjs$)`],

  moduleNameMapper: {
    // import.meta no existe en CommonJS: el módulo de entorno se reemplaza por su versión de pruebas
    '(^|/)config/entorno(\\.js)?$': '<rootDir>/src/test/entorno.js',
    // Los estilos no se procesan en las pruebas
    '\\.css$': '<rootDir>/src/test/estilos.js',
  },

  // Igual que Vitest: no se simulan queueMicrotask ni process.nextTick. clienteHttp difiere el
  // abort con queueMicrotask (doble efecto de StrictMode) y MSW e undici usan nextTick
  fakeTimers: { doNotFake: ['nextTick', 'queueMicrotask'] },

  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    // Arranque del navegador: monta la aplicación e inicia el Service Worker
    '!src/main.jsx',
    '!src/mocks/browser.js',
    // Jest nunca carga este archivo: moduleNameMapper lo reemplaza por src/test/entorno.js
    '!src/config/entorno.js',
    '!src/test/**',
    '!src/**/*.test.{js,jsx}',
  ],
  coverageReporters: ['text', 'text-summary', 'html'],
  // Mínimo de cobertura global: npm run test:coverage falla si algún porcentaje queda bajo el umbral
  coverageThreshold: {
    global: { statements: 80, functions: 80, lines: 80, branches: 70 },
  },
}
