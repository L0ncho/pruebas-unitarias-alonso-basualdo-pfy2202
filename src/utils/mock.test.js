import { describe, expect, it } from 'vitest'
import { ESTADOS_MOCK, esFallaDescargaModulo, estadoMock, soportaServiceWorker } from './mock.js'

// Errores tal como los entregan los navegadores
const descargaChrome = new TypeError(
  'Failed to fetch dynamically imported module: https://l0ncho.github.io/viajes/assets/browser.js',
)
const descargaFirefox = new TypeError(
  'error loading dynamically imported module: https://l0ncho.github.io/viajes/assets/browser.js',
)
const descargaSafari = new TypeError('Importing a module script failed.')
// Chrome con el almacenamiento bloqueado: MSW lee localStorage al importarse
const almacenamientoBloqueado = new DOMException(
  "Failed to read the 'localStorage' property from 'Window': Access is denied for this document.",
  'SecurityError',
)
const errorDeCodigo = new TypeError("Cannot read properties of undefined (reading 'x')")

describe('soportaServiceWorker', () => {
  it('es true si navigator.serviceWorker tiene register', () => {
    expect(soportaServiceWorker({ serviceWorker: { register: () => {} } })).toBe(true)
  })

  it.each([
    ['sin serviceWorker (ventana privada de Firefox)', {}],
    ['serviceWorker undefined', { serviceWorker: undefined }],
    ['serviceWorker sin register', { serviceWorker: {} }],
    ['sin navigator', undefined],
  ])('es false %s', (_caso, navegador) => {
    expect(soportaServiceWorker(navegador)).toBe(false)
  })

  it('es false si leer serviceWorker lanza SecurityError', () => {
    const navegador = {
      get serviceWorker() {
        throw new DOMException('Access is denied', 'SecurityError')
      },
    }
    expect(soportaServiceWorker(navegador)).toBe(false)
  })
})

describe('esFallaDescargaModulo', () => {
  it.each([
    ['Chrome y Edge', descargaChrome],
    ['Firefox', descargaFirefox],
    ['Safari', descargaSafari],
  ])('reconoce la falla de descarga de %s', (_navegador, error) => {
    expect(esFallaDescargaModulo(error)).toBe(true)
  })

  it.each([
    ['SecurityError por almacenamiento bloqueado', almacenamientoBloqueado],
    ['un TypeError del propio código', errorDeCodigo],
    ['un Error con el mismo mensaje pero sin ser TypeError', new Error(descargaChrome.message)],
    ['null', null],
    ['un texto', 'Failed to fetch dynamically imported module'],
  ])('no la confunde con %s', (_caso, error) => {
    expect(esFallaDescargaModulo(error)).toBe(false)
  })
})

describe('estadoMock', () => {
  it('sin errores y con soporte queda "activo"', () => {
    expect(estadoMock({ soportado: true })).toBe(ESTADOS_MOCK.activo)
  })

  it('sin soporte de Service Workers queda "sin-service-worker"', () => {
    expect(estadoMock({ soportado: false })).toBe(ESTADOS_MOCK.sinServiceWorker)
    expect(estadoMock({ soportado: false, errorArranque: new Error('x') })).toBe(
      ESTADOS_MOCK.sinServiceWorker,
    )
  })

  it.each([descargaChrome, descargaFirefox, descargaSafari])(
    'si el import() falla por la red queda "error-carga" (%s)',
    (error) => {
      expect(estadoMock({ soportado: true, errorImportacion: error })).toBe(ESTADOS_MOCK.errorCarga)
    },
  )

  it('con el almacenamiento bloqueado (SecurityError al importar) queda "error-inicio"', () => {
    expect(estadoMock({ soportado: true, errorImportacion: almacenamientoBloqueado })).toBe(
      ESTADOS_MOCK.errorInicio,
    )
  })

  it('cualquier otro error al importar queda "error-inicio"', () => {
    expect(estadoMock({ soportado: true, errorImportacion: errorDeCodigo })).toBe(
      ESTADOS_MOCK.errorInicio,
    )
  })

  it('si worker.start() falla queda "error-inicio"', () => {
    const registroRechazado = new DOMException('Failed to register a ServiceWorker', 'SecurityError')
    expect(estadoMock({ soportado: true, errorArranque: registroRechazado })).toBe(
      ESTADOS_MOCK.errorInicio,
    )
  })
})
