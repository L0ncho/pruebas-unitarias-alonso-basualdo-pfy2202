import { setupServer } from 'msw/node'
import { handlers } from '../mocks/handlers.js'

// Misma base que usan el cliente y los handlers: BASE_URL es "/" fuera de la compilación
export { API } from '../mocks/handlers.js'

// Servidor de pruebas con los mismos handlers que usa el sitio, más los handlers propios de
// cada archivo de pruebas. Cada prueba puede reemplazar una respuesta con server.use (errores);
// resetHandlers vuelve a los handlers con que se creó el servidor
export function crearServidor(...handlersPrueba) {
  return setupServer(...handlers, ...handlersPrueba)
}
