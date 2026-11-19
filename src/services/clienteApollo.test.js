import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearClienteApollo } from './clienteApollo.js'
import { OPCIONES_VIAJE, variablesOpcionesViaje } from './consultas.js'
import { guardarModoSimulacion, MODOS } from '../mocks/simulacion.js'
import { crearAlmacenamiento } from '../test/almacenamiento.js'
import { crearServidor } from '../test/servidor.js'
import { normalizarError, TIPOS_ERROR } from '../utils/errores.js'

// Integración del cliente Apollo real (HttpLink + InMemoryCache) con el handler GraphQL real
// en msw/node. Cada prueba usa un cliente nuevo para partir con la caché vacía.
// El endpoint es relativo a la base ("/graphql" con BASE_URL "/"): en Node lo resuelve el
// interceptor de fetch de MSW contra la location de src/test/configuracion.js

const server = crearServidor()

let cliente
let peticiones

function consultar(destinoId) {
  return cliente.query({ query: OPCIONES_VIAJE, variables: variablesOpcionesViaje(destinoId) })
}

// Ejecuta la consulta esperando que falle y devuelve el error tal como lo entrega Apollo
async function errorDeConsulta(destinoId) {
  try {
    await consultar(destinoId)
  } catch (error) {
    return error
  }
  throw new Error('La consulta debía fallar')
}

beforeAll(() => {
  vi.stubGlobal('sessionStorage', crearAlmacenamiento())
  server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  cliente = crearClienteApollo()
  peticiones = []
  server.events.on('request:start', ({ request }) => peticiones.push(request))
})

afterEach(() => {
  server.events.removeAllListeners()
  sessionStorage.clear()
})

afterAll(() => {
  server.close()
  vi.unstubAllGlobals()
})

describe('consultas y caché', () => {
  it('trae el destino con vuelos y hoteles normalizados por id en la caché', async () => {
    const { data } = await consultar('3')

    expect(data.destino).toMatchObject({ __typename: 'Destino', id: 3, nombre: 'Puerto Natales' })
    expect(data.destino.vuelos).toHaveLength(2)
    expect(data.destino.hoteles).toHaveLength(3)
    // La petición fue a la ruta relativa a la base, resuelta contra la location
    expect(new URL(peticiones[0].url).pathname).toBe('/graphql')

    // Cada objeto queda una sola vez en la caché, identificado por su tipo e id
    const cache = cliente.cache.extract()
    for (const objeto of [
      { __typename: 'Destino', id: 3 },
      { __typename: 'Vuelo', id: 106 },
      { __typename: 'Hotel', id: 206 },
    ]) {
      expect(cache).toHaveProperty([cliente.cache.identify(objeto)])
    }
  })

  it('volver a un destino ya consultado no repite la petición', async () => {
    const primera = await consultar('3')
    const segunda = await consultar('3')

    expect(segunda.data).toEqual(primera.data)
    expect(peticiones).toHaveLength(1)
  })

  it('"7" y "007" usan la misma entrada de caché', async () => {
    expect(variablesOpcionesViaje('007')).toEqual(variablesOpcionesViaje('7'))

    await consultar('7')
    await consultar('007')

    expect(peticiones).toHaveLength(1)
  })

  it('un error no queda en caché: la consulta siguiente vuelve a la red', async () => {
    guardarModoSimulacion(MODOS.errorServidor)
    await errorDeConsulta('5')

    guardarModoSimulacion(MODOS.normal)
    const { data } = await consultar('5')

    expect(data.destino.nombre).toBe('Cusco')
    expect(peticiones).toHaveLength(2)
  })
})

describe('errores de Apollo y su tipo normalizado', () => {
  // Comportamiento verificado de Apollo 4.3: un 500 cuyo cuerpo trae el arreglo errors no llega
  // como ServerError sino como CombinedGraphQLErrors (sin código HTTP). Se normaliza por
  // extensions.code INTERNAL_SERVER_ERROR. Un ServerError (cuerpo sin errors) también queda
  // como "servidor": lo cubre errores.test.js
  it('modo "error del servidor" (500): Apollo entrega CombinedGraphQLErrors y queda como "servidor"', async () => {
    guardarModoSimulacion(MODOS.errorServidor)

    const error = await errorDeConsulta('1')

    expect(CombinedGraphQLErrors.is(error)).toBe(true)
    expect(ServerError.is(error)).toBe(false)
    expect(normalizarError(error)).toEqual({
      tipo: TIPOS_ERROR.servidor,
      estado: null,
      mensaje: 'El servidor tuvo un problema. Intenta nuevamente en unos momentos.',
    })
  })

  it('modo "sin conexión": queda como "red"', async () => {
    guardarModoSimulacion(MODOS.sinConexion)

    const error = await errorDeConsulta('1')

    expect(normalizarError(error)).toEqual({
      tipo: TIPOS_ERROR.red,
      estado: null,
      mensaje: expect.stringContaining('conexión'),
    })
  })

  it('destino inexistente: Apollo entrega CombinedGraphQLErrors y queda como "no-encontrado"', async () => {
    const error = await errorDeConsulta('99')

    expect(CombinedGraphQLErrors.is(error)).toBe(true)
    expect(normalizarError(error)).toEqual({
      tipo: TIPOS_ERROR.noEncontrado,
      estado: null,
      mensaje: 'No existe un destino con el id «99».',
    })
  })

  it('una consulta cancelada queda como "cancelado"', async () => {
    const controlador = new AbortController()
    const consulta = cliente.query({
      query: OPCIONES_VIAJE,
      variables: variablesOpcionesViaje('4'),
      context: { fetchOptions: { signal: controlador.signal } },
    })
    controlador.abort()

    const error = await consulta.then(
      () => null,
      (motivo) => motivo,
    )
    expect(normalizarError(error).tipo).toBe(TIPOS_ERROR.cancelado)
  })
})

describe('variablesOpcionesViaje', () => {
  it.each(['abc', '0', '-1', '1.5', '', null, undefined])('con el id inválido %j devuelve null', (id) => {
    expect(variablesOpcionesViaje(id)).toBeNull()
  })

  it('normaliza el id como texto del entero', () => {
    expect(variablesOpcionesViaje('007')).toEqual({ id: '7' })
  })
})
