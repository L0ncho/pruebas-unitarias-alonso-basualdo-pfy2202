import { server } from './servidor.js'

// Registra las peticiones que recibe el servidor MSW cuya ruta (pathname) es la indicada, por
// ejemplo "/api/destinos" o "/graphql". Devuelve el arreglo, que se va llenando: las pruebas
// cuentan con él cuántas peticiones de red hubo. El setup quita el listener después de cada prueba
export function registrarPeticiones(ruta) {
  const peticiones = []
  server.events.on('request:start', ({ request }) => {
    if (new URL(request.url).pathname === ruta) peticiones.push(request)
  })
  return peticiones
}
