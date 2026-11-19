import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'

// Cliente GraphQL de la aplicación. Apollo se usa solo para GraphQL: lo REST va por clienteHttp.

// Relativo a la base del sitio, para que funcione también en GitHub Pages
const ENDPOINT = `${import.meta.env.BASE_URL}graphql`

// Mismo criterio que el cliente REST: solo el rechazo de fetch es una falla de red. Se marca con
// red: true (normalizarError lo traduce a "red"); una cancelación se deja pasar tal cual.
// fetch se lee en cada llamada, así las pruebas en Node usan el fetch interceptado por MSW
async function fetchConFallaDeRed(url, opciones) {
  try {
    return await fetch(url, opciones)
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw Object.assign(new Error('No se pudo conectar con el servidor.', { cause: error }), {
      red: true,
    })
  }
}

// Crea un cliente con su propia caché. La aplicación usa uno solo (clienteApollo); las pruebas
// crean uno nuevo para partir con la caché vacía
export function crearClienteApollo() {
  return new ApolloClient({
    link: new HttpLink({ uri: ENDPOINT, fetch: fetchConFallaDeRed }),
    // Caché normalizada por tipo e id (Destino:7, Vuelo:101, Hotel:201): un destino ya consultado
    // se lee desde aquí sin repetir la petición
    cache: new InMemoryCache({
      typePolicies: {
        Destino: { keyFields: ['id'] },
        Vuelo: { keyFields: ['id'] },
        Hotel: { keyFields: ['id'] },
      },
    }),
  })
}

export const clienteApollo = crearClienteApollo()
