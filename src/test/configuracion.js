import '@testing-library/jest-dom'
import { restaurarGlobales } from './globales.js'
import { server } from './servidor.js'
import { reiniciarClienteApollo } from '../services/clienteApollo.js'
import { vaciarCache } from '../services/clienteHttp.js'

// Setup común de Jest (setupFilesAfterEnv): corre en cada archivo de pruebas, antes de sus pruebas.
// - API simulada: el servidor MSW con los handlers del sitio. Una petición sin handler es un
//   error de la prueba (onUnhandledRequest: 'error'), no una advertencia que se pierde.
// - Después de cada prueba se limpia el estado global para que ninguna dependa de otra: globales
//   reemplazados, handlers agregados, almacenamiento (modo de simulación y tema), caché del
//   cliente HTTP y caché del cliente Apollo de la aplicación.
// Los archivos con @jest-environment node (sin window) usan solo la parte que no depende del DOM

const hayDom = typeof window !== 'undefined'

// APIs del navegador que jsdom no implementa y que usa la aplicación
if (hayDom) {
  // BotonTema lee la preferencia de color del sistema; sin preferencia oscura
  window.matchMedia = (consulta) => ({
    matches: false,
    media: consulta,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })
  // VolverArriba sube al inicio al navegar; jsdom no hace scroll y avisa "Not implemented"
  window.scrollTo = () => {}
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(async () => {
  // Primero los globales: una prueba pudo reemplazar localStorage o sessionStorage
  restaurarGlobales()
  server.resetHandlers()
  if (hayDom) {
    localStorage.clear()
    sessionStorage.clear()
  }
  vaciarCache()
  await reiniciarClienteApollo()
})

afterAll(() => server.close())
