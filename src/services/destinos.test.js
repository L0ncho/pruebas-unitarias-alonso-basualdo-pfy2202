import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { API, crearServidor } from '../test/servidor.js'
import { TIPOS_ERROR } from '../utils/errores.js'

// Servicio de destinos contra el handler real. Cada prueba importa copias nuevas del servicio
// y del cliente HTTP (vi.resetModules) para partir con la caché vacía

const server = crearServidor()

let obtenerDestinos
let RUTA_DESTINOS
let leerCache
let peticiones

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

beforeEach(async () => {
  vi.resetModules()
  ;({ obtenerDestinos, RUTA_DESTINOS } = await import('./destinos.js'))
  ;({ leerCache } = await import('./clienteHttp.js'))

  peticiones = []
  server.events.on('request:start', ({ request }) => peticiones.push(request))
})

afterEach(() => {
  server.events.removeAllListeners()
  server.resetHandlers()
})

afterAll(() => server.close())

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

  it('una señal cancelada rechaza con "cancelado" y no deja nada en caché', async () => {
    const controlador = new AbortController()
    const consulta = obtenerDestinos({ signal: controlador.signal })
    controlador.abort()

    await expect(consulta).rejects.toMatchObject({ tipo: TIPOS_ERROR.cancelado })
    expect(leerCache(RUTA_DESTINOS)).toBeUndefined()
  })
})
