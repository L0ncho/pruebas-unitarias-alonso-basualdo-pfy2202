import { setupWorker } from 'msw/browser'
import { esPeticionDeLaApi, handlers } from './handlers.js'
import { BASE_URL, ES_DESARROLLO } from '../config/entorno.js'

export const worker = setupWorker(...handlers)

// El mock queda activo también en producción (GitHub Pages). El worker y su alcance usan la base
// del sitio. Una petición a la API sin manejador muestra una advertencia en la consola y sigue a
// la red: así no se convierte en un error de red ("sin conexión"), como haría la estrategia
// "error". Las peticiones que no son de la API (scripts, estilos, imágenes) siguen sin aviso
export function iniciarMock() {
  return worker.start({
    serviceWorker: {
      url: `${BASE_URL}mockServiceWorker.js`,
      options: { scope: BASE_URL },
    },
    onUnhandledRequest(request, print) {
      if (esPeticionDeLaApi(request.url)) print.warning()
    },
    quiet: !ES_DESARROLLO,
  })
}
