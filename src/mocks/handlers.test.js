import { print } from 'graphql'
import { destinos, hoteles, vuelos } from './datos.js'
import { ENDPOINT_GRAPHQL, esPeticionDeLaApi } from './handlers.js'
import { guardarModoSimulacion, MODOS, OPCIONES_SIMULACION } from './simulacion.js'
import { OPCIONES_VIAJE } from '../services/consultas.js'
import { API } from '../test/servidor.js'

// Pruebas de los handlers REST y GraphQL reales con msw/node, sin pasar por los clientes:
// así se verifica la respuesta tal como la entrega la API simulada. El servidor MSW y la
// limpieza de sessionStorage (modo de simulación) están en src/test/configuracion.js

describe('GET /api/destinos', () => {
  it('en modo normal responde la lista con país y actividades', async () => {
    const respuesta = await fetch(`${API}/destinos`)
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(200)
    expect(cuerpo.map((destino) => destino.id)).toEqual(destinos.map((destino) => destino.id))
    for (const destino of cuerpo) {
      expect(destino).toEqual({
        id: expect.any(Number),
        nombre: expect.any(String),
        pais: expect.any(String),
        descripcion: expect.any(String),
        actividades: expect.any(Array),
      })
      expect(destino.actividades.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('los ids son enteros positivos y no se repiten', async () => {
    const cuerpo = await (await fetch(`${API}/destinos`)).json()
    const ids = cuerpo.map((destino) => destino.id)

    expect(ids.every((id) => Number.isInteger(id) && id > 0)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('en modo "error del servidor" responde 500 con { mensaje }', async () => {
    guardarModoSimulacion(MODOS.errorServidor)

    const respuesta = await fetch(`${API}/destinos`)

    expect(respuesta.status).toBe(500)
    expect(await respuesta.json()).toEqual({ mensaje: expect.stringMatching(/servidor/) })
  })

  it('en modo "sin conexión" la petición falla como un error de red', async () => {
    guardarModoSimulacion(MODOS.sinConexion)

    await expect(fetch(`${API}/destinos`)).rejects.toThrow(TypeError)
  })
})

describe('modo "sin respuesta"', () => {
  // Temporizadores falsos: se avanza mucho más que cualquier demora del mock sin esperar
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it.each([
    ['REST', () => ({ url: `${API}/destinos`, opciones: {} })],
    [
      'GraphQL',
      () => ({
        url: ENDPOINT_GRAPHQL,
        opciones: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: print(OPCIONES_VIAJE), variables: { id: '1' } }),
        },
      }),
    ],
  ])('%s nunca responde; solo termina si el cliente aborta', async (_api, peticion) => {
    guardarModoSimulacion(MODOS.sinRespuesta)
    const { url, opciones } = peticion()
    const controlador = new AbortController()
    let estado = 'pendiente'
    const respuesta = fetch(url, { ...opciones, signal: controlador.signal }).then(
      () => (estado = 'respondida'),
      (error) => (estado = error.name),
    )

    await jest.advanceTimersByTimeAsync(60000)
    expect(estado).toBe('pendiente')

    controlador.abort()
    await respuesta
    expect(estado).toBe('AbortError')
  })

  it('el selector ofrece el modo "Sin respuesta"', () => {
    expect(OPCIONES_SIMULACION).toContainEqual({ valor: MODOS.sinRespuesta, etiqueta: 'Sin respuesta' })
  })
})

describe('datos de vuelos y hoteles', () => {
  // Diferencia con UTC de cada aeropuerto entre diciembre de 2026 y marzo de 2027 (Chile
  // continental en horario de verano). Solo para verificar los datos: la app no la usa
  const UTC_POR_AEROPUERTO = {
    SCL: -3, CJC: -3, ANF: -3, PMC: -3, PNT: -3, AEP: -3, EZE: -3, IPC: -5, CUZ: -5, CUN: -5,
  }
  const codigo = (aeropuerto) => aeropuerto.match(/\(([A-Z]{3})\)$/)[1]
  const minutos = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3))

  // Hora local de llegada (en minutos desde la medianoche del día de salida) según la salida,
  // la duración y los husos horarios de ambos aeropuertos
  function llegadaCalculada(salida, duracion, desde, hasta) {
    const utcSalida = minutos(salida) - UTC_POR_AEROPUERTO[desde] * 60
    return utcSalida + duracion + UTC_POR_AEROPUERTO[hasta] * 60
  }

  it.each(vuelos.map((vuelo) => [vuelo.id, vuelo]))(
    'el vuelo %i tiene horas HH:MM coherentes con la duración y llega el mismo día',
    (_id, vuelo) => {
      const origen = codigo(vuelo.origen)
      const destino = codigo(vuelo.llegada)
      const tramos = [
        [vuelo.horaSalidaIda, vuelo.horaLlegadaIda, vuelo.duracionIdaMinutos, origen, destino],
        [vuelo.horaSalidaVuelta, vuelo.horaLlegadaVuelta, vuelo.duracionVueltaMinutos, destino, origen],
      ]

      for (const [salida, llegada, duracion, desde, hasta] of tramos) {
        expect(salida).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
        expect(llegada).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
        expect(Number.isInteger(duracion) && duracion > 0).toBe(true)
        const calculada = llegadaCalculada(salida, duracion, desde, hasta)
        expect(calculada).toBe(minutos(llegada))
        expect(calculada).toBeLessThan(24 * 60)
      }
    },
  )

  it('un vuelo con escalas dura más que uno directo de la misma ruta', () => {
    for (const conEscala of vuelos.filter((vuelo) => vuelo.escalas > 0)) {
      const directos = vuelos.filter(
        (vuelo) =>
          vuelo.escalas === 0 && vuelo.origen === conEscala.origen && vuelo.llegada === conEscala.llegada,
      )
      for (const directo of directos) {
        expect(conEscala.duracionIdaMinutos).toBeGreaterThan(directo.duracionIdaMinutos)
      }
    }
  })

  it('cada vuelo tiene origen y llegada con código IATA, distintos entre sí', () => {
    for (const vuelo of vuelos) {
      expect(vuelo.origen).toMatch(/\([A-Z]{3}\)$/)
      expect(vuelo.llegada).toMatch(/\([A-Z]{3}\)$/)
      expect(vuelo.llegada).not.toBe(vuelo.origen)
    }
  })

  it('cada estadía tiene al menos un vuelo del destino con el que calza', () => {
    for (const hotel of hoteles) {
      const calza = vuelos.some(
        (vuelo) =>
          vuelo.destinoId === hotel.destinoId &&
          hotel.fechaEntrada >= vuelo.fechaIda &&
          hotel.fechaSalida <= vuelo.fechaVuelta,
      )
      expect(calza).toBe(true)
    }
  })

  it.each([
    ['vuelos', vuelos],
    ['hoteles', hoteles],
  ])('los %s tienen ids únicos y un destinoId existente', (_nombre, lista) => {
    const ids = lista.map((item) => item.id)
    const idsDestinos = new Set(destinos.map((destino) => destino.id))

    expect(new Set(ids).size).toBe(ids.length)
    expect(lista.every((item) => idsDestinos.has(item.destinoId))).toBe(true)
  })

  it('hay vuelos y hoteles sin disponibilidad', () => {
    expect(vuelos.some((vuelo) => vuelo.asientosDisponibles === 0)).toBe(true)
    expect(hoteles.some((hotel) => hotel.habitacionesDisponibles === 0)).toBe(true)
  })
})

describe('GraphQL: consulta OpcionesViaje', () => {
  // Petición GraphQL tal como la envía un cliente: POST con la consulta en texto
  async function consultar(id, consulta = print(OPCIONES_VIAJE)) {
    return fetch(ENDPOINT_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: consulta, variables: { id } }),
    })
  }

  it('trae el destino con sus vuelos y hoteles en una sola respuesta', async () => {
    const respuesta = await consultar('1')
    const { data, errors } = await respuesta.json()

    expect(respuesta.status).toBe(200)
    expect(errors).toBeUndefined()
    expect(data.destino).toMatchObject({ id: 1, nombre: 'San Pedro de Atacama', pais: 'Chile' })
    expect(data.destino.vuelos.map((vuelo) => vuelo.id)).toEqual([101, 102, 103])
    expect(data.destino.hoteles.map((hotel) => hotel.id)).toEqual([201, 202, 203])
    // Solo los campos pedidos: destinoId no es parte del esquema y actividades no se pidió
    expect(data.destino.vuelos[0]).toEqual({
      id: 101,
      aerolinea: 'AeroAndes',
      origen: 'Santiago (SCL)',
      llegada: 'Calama (CJC)',
      fechaIda: '2026-12-10',
      horaSalidaIda: '07:10',
      horaLlegadaIda: '09:15',
      duracionIdaMinutos: 125,
      fechaVuelta: '2026-12-15',
      horaSalidaVuelta: '18:40',
      horaLlegadaVuelta: '20:45',
      duracionVueltaMinutos: 125,
      escalas: 0,
      precio: 189990,
      asientosDisponibles: 12,
    })
    expect(data.destino).not.toHaveProperty('actividades')
    // San Pedro de Atacama no tiene aeropuerto propio: la nota lo explica
    expect(data.destino.notaLlegada).toMatch(/Calama/)
  })

  it('un destino con aeropuerto propio responde notaLlegada null', async () => {
    const { data } = await (await consultar('5')).json()
    expect(data.destino.notaLlegada).toBeNull()
  })

  it('responde solo los campos que pide la consulta', async () => {
    const respuesta = await consultar('2', 'query ($id: ID!) { destino(id: $id) { nombre } }')
    expect(await respuesta.json()).toEqual({ data: { destino: { nombre: 'Rapa Nui' } } })
  })

  it('un destino sin oferta responde listas vacías, sin error', async () => {
    const { data, errors } = await (await consultar('8')).json()

    expect(errors).toBeUndefined()
    expect(data.destino).toMatchObject({ id: 8, nombre: 'Madrid', vuelos: [], hoteles: [] })
  })

  it('"7" y "007" son el mismo destino', async () => {
    const siete = await (await consultar('7')).json()
    const conCeros = await (await consultar('007')).json()

    expect(conCeros).toEqual(siete)
    expect(siete.data.destino.id).toBe(7)
  })

  it('un id inexistente responde destino null y un error NOT_FOUND', async () => {
    const respuesta = await consultar('99')
    const { data, errors } = await respuesta.json()

    expect(respuesta.status).toBe(200)
    expect(data).toEqual({ destino: null })
    expect(errors).toEqual([
      expect.objectContaining({
        message: 'No existe un destino con el id «99».',
        path: ['destino'],
        extensions: { code: 'NOT_FOUND' },
      }),
    ])
  })

  it.each(['abc', '0', '-1', '1.5'])('el id inválido %j responde un error BAD_USER_INPUT', async (id) => {
    const { data, errors } = await (await consultar(id)).json()

    expect(data).toEqual({ destino: null })
    expect(errors[0].extensions).toEqual({ code: 'BAD_USER_INPUT' })
  })

  it('en modo "error del servidor" responde 500 con errors e INTERNAL_SERVER_ERROR', async () => {
    guardarModoSimulacion(MODOS.errorServidor)

    const respuesta = await consultar('1')

    expect(respuesta.status).toBe(500)
    expect(await respuesta.json()).toEqual({
      errors: [
        {
          message: expect.stringMatching(/servidor/),
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        },
      ],
    })
  })

  it('en modo "sin conexión" la petición falla como un error de red', async () => {
    guardarModoSimulacion(MODOS.sinConexion)

    await expect(consultar('1')).rejects.toThrow(TypeError)
  })

  it.each([MODOS.errorServidor, MODOS.sinConexion, MODOS.sinRespuesta])(
    'con la falla "%s" activa, un destino inexistente o un id inválido responde su error',
    async (modo) => {
      guardarModoSimulacion(modo)

      const inexistente = await consultar('99')
      expect(inexistente.status).toBe(200)
      expect((await inexistente.json()).errors[0].extensions).toEqual({ code: 'NOT_FOUND' })

      const invalido = await (await consultar('abc')).json()
      expect(invalido.errors[0].extensions).toEqual({ code: 'BAD_USER_INPUT' })
    },
  )
})

describe('esPeticionDeLaApi', () => {
  it.each([`${API}/destinos`, `${API}/destinos/7`, `${API}`, ENDPOINT_GRAPHQL, `http://localhost${API}/otro?x=1`])(
    '%s es de la API',
    (url) => {
      expect(esPeticionDeLaApi(url)).toBe(true)
    },
  )

  it.each(['/src/main.jsx', '/favicon.svg', '/apis', '/graphql/otro', 'https://otro.sitio/api/destinos'])(
    '%s no es de la API',
    (url) => {
      expect(esPeticionDeLaApi(url)).toBe(false)
    },
  )
})
