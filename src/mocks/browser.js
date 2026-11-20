import { setupWorker } from 'msw/browser'
import { esPeticionDeLaApi, handlers } from './handlers.js'

export const worker = setupWorker(...handlers)

// El mock queda activo también en producción (GitHub Pages). El worker y su alcance usan la base
// del sitio. Una petición a la API sin manejador muestra una advertencia en la consola y sigue a
// la red: así no se convierte en un error de red ("sin conexión"), como haría la estrategia
// "error". Las peticiones que no son de la API (scripts, estilos, imágenes) siguen sin aviso
export function iniciarMock() {
  return worker.start({
    serviceWorker: {
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
      options: { scope: import.meta.env.BASE_URL },
    },
    onUnhandledRequest(request, print) {
      if (esPeticionDeLaApi(request.url)) print.warning()
    },
    quiet: !import.meta.env.DEV,
  })
}
