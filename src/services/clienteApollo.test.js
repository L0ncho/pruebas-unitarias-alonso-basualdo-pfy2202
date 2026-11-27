import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors'
import { graphql, http, HttpResponse } from 'msw'
import { crearClienteApollo, leerRecepcion } from './clienteApollo.js'
import { OPCIONES_VIAJE, variablesOpcionesViaje } from './consultas.js'
import { TIEMPO_LIMITE_MS, VIGENCIA_CACHE_MS } from '../config/api.js'
import { DEMORA_LENTA, ENDPOINT_GRAPHQL } from '../mocks/handlers.js'
import { guardarModoSimulacion, MODOS } from '../mocks/simulacion.js'
import { waitFor } from '@testing-library/react'
import { server } from '../test/servidor.js'
import { simularSoloFecha } from '../test/temporizadores.js'
import { derivarEstadoOpcionesViaje, politicaCacheApollo } from '../utils/consulta.js'
import { normalizarError, TIPOS_ERROR } from '../utils/errores.js'

// Integración del cliente Apollo real (HttpLink + InMemoryCache) con el handler GraphQL real
// en msw/node. Cada prueba usa un cliente nuevo para partir con la caché vacía.
// El endpoint es relativo a la base ("/graphql" con BASE_URL "/"): el interceptor de fetch de
// MSW lo resuelve contra la location de jsdom (http://localhost/). El servidor MSW y la
// limpieza de sessionStorage están en src/test/configuracion.js

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

beforeEach(() => {
  cliente = crearClienteApollo()
  peticiones = []
  server.events.on('request:start', ({ request }) => peticiones.push(request))
})

afterEach(() => {
  server.events.removeAllListeners()
  server.resetHandlers()
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

describe('validación de OpcionesViaje', () => {
  // Respuesta 200 con un destino que trae los campos pedidos, salvo los cambios indicados
  function destinoValido(cambios = {}) {
    return {
      __typename: 'Destino',
      id: 4,
      nombre: 'Bariloche',
      pais: 'Argentina',
      descripcion: 'Lagos',
      notaLlegada: null,
      vuelos: [],
      hoteles: [],
      ...cambios,
    }
  }

  function responderDestino(destino) {
    server.use(graphql.query('OpcionesViaje', () => HttpResponse.json({ data: { destino } })))
  }

  function responderTexto(cuerpo, init) {
    server.use(http.post(ENDPOINT_GRAPHQL, () => new HttpResponse(cuerpo, init)))
  }

  // Objeto Destino:4 de la caché normalizada (undefined si no se guardó)
  function guardadoEnCache() {
    return cliente.cache.extract()[cliente.cache.identify({ __typename: 'Destino', id: 4 })]
  }

  it('un destino válido llega y queda en caché', async () => {
    responderDestino(destinoValido())
    const { data } = await consultar('4')
    expect(data.destino.nombre).toBe('Bariloche')
    expect(guardadoEnCache()).toBeDefined()
  })

  it.each([
    ['sin nombre', { nombre: undefined }],
    ['un vuelo con el precio en texto', {
      vuelos: [{
        __typename: 'Vuelo', id: 1, aerolinea: 'A', origen: 'O', llegada: 'L', fechaIda: 'f',
        horaSalidaIda: 'h', horaLlegadaIda: 'h', duracionIdaMinutos: 1, fechaVuelta: 'f',
        horaSalidaVuelta: 'h', horaLlegadaVuelta: 'h', duracionVueltaMinutos: 1, escalas: 0,
        precio: '1000', asientosDisponibles: 1,
      }],
    }],
    ['hoteles null', { hoteles: null }],
  ])('un destino %s da "datos-incompletos" (un Error, no UnconventionalError) y no entra a la caché', async (_caso, cambios) => {
    responderDestino(destinoValido(cambios))

    const error = await errorDeConsulta('4')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).not.toBe('UnconventionalError')
    expect(normalizarError(error)).toEqual({
      tipo: TIPOS_ERROR.datosIncompletos,
      estado: null,
      mensaje: expect.stringMatching(/incompleta/),
    })
    expect(guardadoEnCache()).toBeUndefined()
    expect(cliente.cache.extract().ROOT_QUERY?.['destino({"id":"4"})']).toBeUndefined()
  })

  it('destino null sin errors da "datos-incompletos"', async () => {
    responderDestino(null)
    expect(normalizarError(await errorDeConsulta('4')).tipo).toBe(TIPOS_ERROR.datosIncompletos)
  })

  it('destino null con NOT_FOUND sigue siendo "no-encontrado"', async () => {
    expect(normalizarError(await errorDeConsulta('99')).tipo).toBe(TIPOS_ERROR.noEncontrado)
  })

  it('tras datos inválidos, reintentar vuelve a la red y guarda los datos válidos', async () => {
    server.use(
      graphql.query('OpcionesViaje', () => HttpResponse.json({ data: { destino: destinoValido({ pais: 7 }) } }), {
        once: true,
      }),
    )
    await errorDeConsulta('4')

    // La segunda petición llega al handler real
    const { data } = await consultar('4')
    expect(data.destino.nombre).toBe('Valparaíso')
    expect(guardadoEnCache()).toBeDefined()
    expect(peticiones).toHaveLength(2)
  })

  it('un JSON ilegible con 200 da "datos-incompletos"', async () => {
    responderTexto('{"data": {"destino":', { headers: { 'Content-Type': 'application/json' } })
    expect(normalizarError(await errorDeConsulta('4')).tipo).toBe(TIPOS_ERROR.datosIncompletos)
  })

  it.each(['text/html', 'application/graphql-response+json'])(
    'un 500 con HTML (content-type %s) sigue siendo "servidor"',
    async (tipoContenido) => {
      responderTexto('<html><body>Error</body></html>', {
        status: 500,
        headers: { 'Content-Type': tipoContenido },
      })
      expect(normalizarError(await errorDeConsulta('4'))).toMatchObject({
        tipo: TIPOS_ERROR.servidor,
        estado: 500,
      })
    },
  )
})

describe('tiempo límite en GraphQL', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  function capturar(promesa) {
    const resultado = { estado: 'pendiente' }
    promesa.then(
      (valor) => Object.assign(resultado, { estado: 'resuelta', valor }),
      (error) => Object.assign(resultado, { estado: 'rechazada', error }),
    )
    return resultado
  }

  it('modo "sin respuesta": a los 15 s da "tiempo-agotado" (un Error) y nada queda en caché', async () => {
    guardarModoSimulacion(MODOS.sinRespuesta)
    const resultado = capturar(consultar('4'))

    await jest.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS - 1)
    expect(resultado.estado).toBe('pendiente')

    await jest.advanceTimersByTimeAsync(1)
    expect(resultado.estado).toBe('rechazada')
    expect(resultado.error).toBeInstanceOf(Error)
    expect(resultado.error.name).not.toBe('UnconventionalError')
    expect(normalizarError(resultado.error)).toEqual({
      tipo: TIPOS_ERROR.tiempoAgotado,
      estado: null,
      mensaje: expect.stringMatching(/tardó demasiado/),
    })
    expect(peticiones[0].signal.aborted).toBe(true)
    expect(cliente.cache.extract().ROOT_QUERY?.['destino({"id":"4"})']).toBeUndefined()
  })

  it('el cuerpo que no termina de llegar también agota el plazo', async () => {
    server.use(
      http.post(
        ENDPOINT_GRAPHQL,
        () => new HttpResponse(new ReadableStream({ start() {} }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    const resultado = capturar(consultar('4'))

    await jest.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS)

    expect(normalizarError(resultado.error).tipo).toBe(TIPOS_ERROR.tiempoAgotado)
  })

  it('modo "respuesta lenta": responde a los 4 s sin agotar el plazo', async () => {
    guardarModoSimulacion(MODOS.lenta)
    const resultado = capturar(consultar('4'))

    await jest.advanceTimersByTimeAsync(DEMORA_LENTA)

    expect(resultado.estado).toBe('resuelta')
    expect(resultado.valor.data.destino.id).toBe(4)
  })

  it('cancelar antes del plazo da "cancelado", nunca "tiempo-agotado"', async () => {
    guardarModoSimulacion(MODOS.sinRespuesta)
    const controlador = new AbortController()
    const resultado = capturar(
      cliente.query({
        query: OPCIONES_VIAJE,
        variables: variablesOpcionesViaje('4'),
        context: { fetchOptions: { signal: controlador.signal } },
      }),
    )

    await jest.advanceTimersByTimeAsync(2000)
    controlador.abort()
    await jest.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS)

    expect(normalizarError(resultado.error).tipo).toBe(TIPOS_ERROR.cancelado)
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

describe('vigencia de la caché de Apollo', () => {
  // Solo se finge la hora (Date): la demora del mock sigue con temporizadores reales
  const INICIO = new Date('2026-12-01T12:00:00Z')
  const OPERACION = 'OpcionesViaje'
  const VARIABLES = variablesOpcionesViaje('3')

  beforeEach(() => {
    simularSoloFecha()
    jest.setSystemTime(INICIO)
  })
  afterEach(() => jest.useRealTimers())

  function avanzarHora(ms) {
    jest.setSystemTime(Date.now() + ms)
  }

  function esperar(ms) {
    return new Promise((resolver) => setTimeout(resolver, ms))
  }

  // Observa la consulta con la política que elegiría useOpcionesViaje al entrar al destino
  // (las mismas opciones que recibe useQuery) y guarda cada resultado que entrega Apollo
  function observarComoElHook() {
    const politica = politicaCacheApollo(leerRecepcion(cliente, OPERACION, VARIABLES), Date.now())
    const emisiones = []
    const observable = cliente.watchQuery({ query: OPCIONES_VIAJE, variables: VARIABLES, ...politica })
    const suscripcion = observable.subscribe((resultado) => emisiones.push(resultado))
    return { politica, emisiones, observable, suscripcion }
  }

  function guardadoEnCache() {
    return cliente.cache.extract()[cliente.cache.identify({ __typename: 'Destino', id: 3 })]
  }

  describe('registro de recepción', () => {
    it('anota la hora de una respuesta válida y la renueva con cada respuesta', async () => {
      expect(leerRecepcion(cliente, OPERACION, VARIABLES)).toBeUndefined()

      await consultar('3')
      expect(leerRecepcion(cliente, OPERACION, VARIABLES)).toBe(INICIO.getTime())

      avanzarHora(60000)
      await cliente.query({ query: OPCIONES_VIAJE, variables: VARIABLES, fetchPolicy: 'network-only' })
      expect(leerRecepcion(cliente, OPERACION, VARIABLES)).toBe(INICIO.getTime() + 60000)
    })

    it('no anota errores (NOT_FOUND, 500) ni datos inválidos', async () => {
      await errorDeConsulta('99')
      expect(leerRecepcion(cliente, OPERACION, variablesOpcionesViaje('99'))).toBeUndefined()

      guardarModoSimulacion(MODOS.errorServidor)
      await errorDeConsulta('3')
      guardarModoSimulacion(MODOS.normal)

      server.use(graphql.query('OpcionesViaje', () => HttpResponse.json({ data: { destino: { id: 3 } } })))
      await errorDeConsulta('3')

      expect(leerRecepcion(cliente, OPERACION, VARIABLES)).toBeUndefined()
    })

    it('cada cliente tiene su propio registro', async () => {
      await consultar('3')
      expect(leerRecepcion(crearClienteApollo(), OPERACION, VARIABLES)).toBeUndefined()
    })
  })

  it('un dato vigente (4:59): cache-first, se entrega desde la caché y no pide', async () => {
    await consultar('3')
    avanzarHora(VIGENCIA_CACHE_MS - 1000)

    const { politica, emisiones, suscripcion } = observarComoElHook()
    await waitFor(() => expect(emisiones.length).toBeGreaterThan(0))
    await esperar(1000)
    suscripcion.unsubscribe()

    expect(politica.fetchPolicy).toBe('cache-first')
    expect(emisiones.every((r) => r.loading === false && r.data.destino.id === 3)).toBe(true)
    expect(peticiones).toHaveLength(1)
  })

  it('un dato vencido (5:00): se entrega al instante con loading y se actualiza con 1 sola petición', async () => {
    await consultar('3')
    avanzarHora(VIGENCIA_CACHE_MS)

    const { politica, emisiones, observable, suscripcion } = observarComoElHook()
    expect(politica).toEqual({ fetchPolicy: 'cache-and-network', nextFetchPolicy: 'cache-first' })

    await waitFor(() => expect(emisiones.at(-1)?.loading).toBe(false))

    // Primera emisión: los datos de la caché, con loading (la vista los mantiene con aria-busy)
    expect(emisiones[0]).toMatchObject({ loading: true, data: { destino: { id: 3 } } })
    expect(derivarEstadoOpcionesViaje(emisiones[0])).toMatchObject({
      cargando: true,
      datos: expect.objectContaining({ id: 3 }),
    })
    // Ninguna emisión deja la vista sin datos
    expect(emisiones.every((r) => r.data?.destino?.id === 3)).toBe(true)
    expect(peticiones).toHaveLength(2)
    // La vigencia vuelve a contar desde la nueva respuesta (la hora falsa solo avanza con avanzarHora)
    expect(leerRecepcion(cliente, OPERACION, VARIABLES)).toBeGreaterThanOrEqual(INICIO.getTime() + VIGENCIA_CACHE_MS)

    // nextFetchPolicy: después de la actualización vuelve a cache-first; una escritura en la
    // caché no dispara otra petición
    expect(observable.options.fetchPolicy).toBe('cache-first')
    cliente.cache.modify({
      id: cliente.cache.identify({ __typename: 'Destino', id: 3 }),
      fields: { descripcion: () => 'Descripción cambiada' },
    })
    await esperar(1000)
    suscripcion.unsubscribe()
    expect(peticiones).toHaveLength(2)
  })

  it.each([
    ['un 500', () => guardarModoSimulacion(MODOS.errorServidor), TIPOS_ERROR.servidor],
    ['sin conexión', () => guardarModoSimulacion(MODOS.sinConexion), TIPOS_ERROR.red],
    [
      'datos inválidos',
      () => server.use(graphql.query('OpcionesViaje', () => HttpResponse.json({ data: { destino: { id: 3 } } }))),
      TIPOS_ERROR.datosIncompletos,
    ],
  ])('si la actualización falla con %s, se mantienen los datos junto al error', async (_caso, fallar, tipo) => {
    await consultar('3')
    const recibido = leerRecepcion(cliente, OPERACION, VARIABLES)
    avanzarHora(VIGENCIA_CACHE_MS)
    fallar()

    const { emisiones, suscripcion } = observarComoElHook()
    await waitFor(() => expect(emisiones.at(-1)?.error).toBeDefined())
    suscripcion.unsubscribe()

    const ultima = emisiones.at(-1)
    expect(derivarEstadoOpcionesViaje(ultima)).toEqual({
      datos: expect.objectContaining({ id: 3 }),
      cargando: false,
      error: expect.objectContaining({ tipo }),
    })
    expect(peticiones).toHaveLength(2)
    // El dato vencido sigue en la caché y sigue vencido: no se anotó la respuesta fallida
    expect(guardadoEnCache()).toBeDefined()
    expect(leerRecepcion(cliente, OPERACION, VARIABLES)).toBe(recibido)
  })

  it('si la actualización agota el plazo, se mantienen los datos junto al error', async () => {
    await consultar('3')
    // Ahora se fingen también los temporizadores para no esperar 15 s. now conserva la hora
    // fingida: sin él, Jest reinicia el reloj a la hora real
    jest.useFakeTimers({ now: Date.now() })
    jest.setSystemTime(Date.now() + VIGENCIA_CACHE_MS)
    guardarModoSimulacion(MODOS.sinRespuesta)

    const { emisiones, suscripcion } = observarComoElHook()
    await jest.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS)
    suscripcion.unsubscribe()

    expect(derivarEstadoOpcionesViaje(emisiones.at(-1))).toEqual({
      datos: expect.objectContaining({ id: 3 }),
      cargando: false,
      error: expect.objectContaining({ tipo: TIPOS_ERROR.tiempoAgotado }),
    })
    expect(guardadoEnCache()).toBeDefined()
  })
})
