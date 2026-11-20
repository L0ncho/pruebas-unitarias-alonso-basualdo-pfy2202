import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client'
import { map } from 'rxjs'
import { conTiempoLimite } from './tiempoLimite.js'
import { crearErrorDatosIncompletos } from '../utils/errores.js'
import { validarOpcionesViaje } from '../utils/validacion.js'

// Cliente GraphQL de la aplicación. Apollo se usa solo para GraphQL: lo REST va por clienteHttp.

// Relativo a la base del sitio, para que funcione también en GitHub Pages
const ENDPOINT = `${import.meta.env.BASE_URL}graphql`

// fetch del HttpLink, con los mismos criterios que el cliente REST:
// - Tiempo límite (el mismo conTiempoLimite): cubre la petición y la lectura del cuerpo. Por eso
//   el cuerpo se lee aquí y se entrega a Apollo en una Response nueva con el mismo código y
//   encabezados; Apollo la procesa igual que antes.
// - Solo el rechazo de fetch es una falla de red: se marca con red: true (normalizarError lo
//   traduce a "red"). Una cancelación se deja pasar tal cual.
// La señal externa es la que pasa Apollo (se aborta cuando la consulta ya no tiene observadores).
// fetch se lee en cada llamada, así las pruebas en Node usan el fetch interceptado por MSW
async function fetchConTiempoLimite(url, opciones = {}) {
  return conTiempoLimite(
    async (signal) => {
      let respuesta
      try {
        respuesta = await fetch(url, { ...opciones, signal })
      } catch (error) {
        if (error?.name === 'AbortError') throw error
        throw Object.assign(new Error('No se pudo conectar con el servidor.', { cause: error }), {
          red: true,
        })
      }

      const cuerpo = await respuesta.text()
      // Response no admite cuerpo con estos códigos
      const sinCuerpo = [101, 204, 205, 304].includes(respuesta.status)
      return new Response(sinCuerpo ? null : cuerpo, {
        status: respuesta.status,
        statusText: respuesta.statusText,
        headers: respuesta.headers,
      })
    },
    { signal: opciones.signal },
  )
}

// Validación de cada operación por su nombre. Una operación sin validador pasa sin revisar
const VALIDADORES = {
  OpcionesViaje: (data) => validarOpcionesViaje(data?.destino),
}

// Valida el resultado antes de que Apollo lo escriba en la caché: el error lanzado aquí corta
// la escritura, así un dato inválido nunca entra a InMemoryCache.
// Con el arreglo errors no se valida: Apollo lo entrega como CombinedGraphQLErrors (por ejemplo,
// destino null con NOT_FOUND sigue siendo "no encontrado")
const enlaceValidacion = new ApolloLink((operation, forward) =>
  forward(operation).pipe(
    map((resultado) => {
      const validar = VALIDADORES[operation.operationName]
      const tieneErrores = Array.isArray(resultado.errors) && resultado.errors.length > 0
      if (validar && !tieneErrores && !validar(resultado.data)) {
        throw crearErrorDatosIncompletos()
      }
      return resultado
    }),
  ),
)

// Crea un cliente con su propia caché. La aplicación usa uno solo (clienteApollo); las pruebas
// crean uno nuevo para partir con la caché vacía
export function crearClienteApollo() {
  return new ApolloClient({
    link: ApolloLink.from([enlaceValidacion, new HttpLink({ uri: ENDPOINT, fetch: fetchConTiempoLimite })]),
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
