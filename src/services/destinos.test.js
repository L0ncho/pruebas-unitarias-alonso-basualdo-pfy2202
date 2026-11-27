import { http, HttpResponse } from 'msw'
import { TIEMPO_LIMITE_MS } from '../config/api.js'
import { DEMORA_LENTA } from '../mocks/handlers.js'
import { guardarModoSimulacion, MODOS } from '../mocks/simulacion.js'
import { API, server } from '../test/servidor.js'
import { TIPOS_ERROR } from '../utils/errores.js'

// Servicio de destinos contra el handler real. Cada prueba importa copias nuevas del servicio
// y del cliente HTTP (jest.resetModules) para partir con la caché vacía. El servidor MSW y la
// limpieza de sessionStorage están en src/test/configuracion.js

let obtenerDestinos
let RUTA_DESTINOS
let leerCache
let peticiones

beforeEach(async () => {
  jest.resetModules()
  ;({ obtenerDestinos, RUTA_DESTINOS } = await import('./destinos.js'))
  ;({ leerCache } = await import('./clienteHttp.js'))

  peticiones = []
  server.events.on('request:start', ({ request }) => peticiones.push(request))
})

afterEach(() => {
  server.events.removeAllListeners()
  server.resetHandlers()
})

describe('obtenerDestinos', () => {
  it('dos consultas seguidas generan una sola petición (caché)', async () => {
    const primera = await obtenerDestinos()
    const segunda = await obtenerDestinos()

    expect(primera.length).toBeGreaterThan(0)
    expect(segunda).toBe(primera)
    expect(peticiones).toHaveLength(1)
    expect(leerCache(RUTA_DESTINOS)).toBe(primera)
  })

  it('un error no queda en caché y la consulta siguiente vuelve a la red', async () => {
    server.use(
      http.get(
        `${API}/destinos`,
        () => HttpResponse.json({ mensaje: 'Falla simulada del servidor.' }, { status: 500 }),
        { once: true },
      ),
    )

    await expect(obtenerDestinos()).rejects.toEqual({
      tipo: TIPOS_ERROR.servidor,
      estado: 500,
      mensaje: 'Falla simulada del servidor.',
    })
    expect(leerCache(RUTA_DESTINOS)).toBeUndefined()

    const datos = await obtenerDestinos()
    expect(datos.length).toBeGreaterThan(0)
    expect(peticiones).toHaveLength(2)
  })

  it('RECURSO_DESTINOS une la ruta con el validador del listado', async () => {
    const { RECURSO_DESTINOS } = await import('./destinos.js')
    const { validarListadoDestinos } = await import('../utils/validacion.js')
    expect(RECURSO_DESTINOS).toEqual({ ruta: RUTA_DESTINOS, validar: validarListadoDestinos })
  })

  it('un solo destino inválido invalida el listado: "datos-incompletos" y nada en caché', async () => {
    const valido = { id: 1, nombre: 'Uno', pais: 'Chile', descripcion: 'D', actividades: ['A'] }
    server.use(
      http.get(`${API}/destinos`, () => HttpResponse.json([valido, { ...valido, id: 2, pais: null }]), {
        once: true,
      }),
    )

    await expect(obtenerDestinos()).rejects.toMatchObject({ tipo: TIPOS_ERROR.datosIncompletos })
    expect(leerCache(RUTA_DESTINOS)).toBeUndefined()

    // Reintentar vuelve a la red y con datos válidos se guarda
    const datos = await obtenerDestinos()
    expect(leerCache(RUTA_DESTINOS)).toBe(datos)
    expect(peticiones).toHaveLength(2)
  })

  it('un JSON ilegible con 200 da "datos-incompletos"', async () => {
    server.use(
      http.get(
        `${API}/destinos`,
        () => new HttpResponse('[{"id": 1,', { headers: { 'Content-Type': 'application/json' } }),
      ),
    )

    await expect(obtenerDestinos()).rejects.toMatchObject({ tipo: TIPOS_ERROR.datosIncompletos })
    expect(leerCache(RUTA_DESTINOS)).toBeUndefined()
  })

  it('un 500 con HTML sigue siendo "servidor"', async () => {
    server.use(
      http.get(
        `${API}/destinos`,
        () => new HttpResponse('<h1>Error</h1>', { status: 500, headers: { 'Content-Type': 'text/html' } }),
      ),
    )

    await expect(obtenerDestinos()).rejects.toMatchObject({ tipo: TIPOS_ERROR.servidor, estado: 500 })
  })

  it('una señal cancelada rechaza con "cancelado" y no deja nada en caché', async () => {
    const controlador = new AbortController()
    const consulta = obtenerDestinos({ signal: controlador.signal })
    controlador.abort()

    await expect(consulta).rejects.toMatchObject({ tipo: TIPOS_ERROR.cancelado })
    expect(leerCache(RUTA_DESTINOS)).toBeUndefined()
  })
})

describe('modos de simulación con tiempo límite', () => {
  // Temporizadores falsos: la demora del mock y el plazo avanzan sin esperar en tiempo real
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

  it('modo "sin respuesta": a los 15 s da "tiempo-agotado" y nada queda en caché', async () => {
    guardarModoSimulacion(MODOS.sinRespuesta)
    const resultado = capturar(obtenerDestinos())

    await jest.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS - 1)
    expect(resultado.estado).toBe('pendiente')

    await jest.advanceTimersByTimeAsync(1)
    expect(resultado.error).toEqual({
      tipo: TIPOS_ERROR.tiempoAgotado,
      estado: null,
      mensaje: expect.stringMatching(/tardó demasiado/),
    })
    expect(peticiones[0].signal.aborted).toBe(true)
    expect(leerCache(RUTA_DESTINOS)).toBeUndefined()
  })

  it('modo "respuesta lenta": responde a los 4 s sin agotar el plazo', async () => {
    guardarModoSimulacion(MODOS.lenta)
    const resultado = capturar(obtenerDestinos())

    await jest.advanceTimersByTimeAsync(DEMORA_LENTA - 1)
    expect(resultado.estado).toBe('pendiente')

    await jest.advanceTimersByTimeAsync(1)
    expect(resultado.estado).toBe('resuelta')
    expect(leerCache(RUTA_DESTINOS)).toBe(resultado.valor)
  })

  it('modo "sin respuesta": cancelar antes del plazo da "cancelado", no un error', async () => {
    guardarModoSimulacion(MODOS.sinRespuesta)
    const controlador = new AbortController()
    const resultado = capturar(obtenerDestinos({ signal: controlador.signal }))

    await jest.advanceTimersByTimeAsync(3000)
    controlador.abort()
    await jest.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS)

    expect(resultado.error).toMatchObject({ tipo: TIPOS_ERROR.cancelado })
  })
})
