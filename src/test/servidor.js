import { setupServer } from 'msw/node'
import { handlers } from '../mocks/handlers.js'

// Misma base que usan el cliente y los handlers: BASE_URL es "/" en las pruebas (src/test/entorno.js)
export { API } from '../mocks/handlers.js'

// Servidor de pruebas único, con los mismos handlers que usa el sitio. Lo inicia y lo cierra
// src/test/configuracion.js. Cada archivo agrega sus handlers propios con server.use en un
// beforeEach (o en la misma prueba para simular un error); resetHandlers, que corre después
// de cada prueba, vuelve a los handlers del sitio
export const server = setupServer(...handlers)
