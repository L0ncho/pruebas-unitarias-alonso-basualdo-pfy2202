import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { esperarRed, noEncontrado, respuestaFallaRest } from '../mocks/handlers.js'
import { API, crearServidor } from '../test/servidor.js'
import { convertirEntero } from '../utils/ids.js'
import { TIPOS_ERROR } from '../utils/errores.js'

// Pruebas del cliente HTTP con msw/node. Usan un recurso propio de las pruebas, que no depende
// de los datos del mock, pero con la misma simulación de red (demora y fallas) de los handlers.
// Cada prueba importa una copia nueva del módulo (vi.resetModules), así parte con la caché
// y las peticiones en curso vacías sin agregar al código una función solo para pruebas

const ELEMENTOS = [
  { id: 1, nombre: 'Uno' },
  { id: 2, nombre: 'Dos' },
  { id: 3, nombre: 'Tres' },
]

const server = crearServidor(
  http.get(`${API}/prueba`, async () => {
    const falla = respuestaFallaRest(await esperarRed())
    if (falla) return falla
    return HttpResponse.json(ELEMENTOS)
  }),
  http.get(`${API}/prueba/:id`, async ({ params }) => {
    const falla = respuestaFallaRest(await esperarRed())
    if (falla) return falla

    const id = convertirEntero(params.id)
    const elemento = ELEMENTOS.find((item) => item.id === id)
    return elemento ? HttpResponse.json(elemento) : noEncontrado(`No existe un elemento con el id «${params.id}».`)
  }),
)

const RUTA = '/prueba'

let obtenerJson
let leerCache
// Peticiones que llegaron al mock: permiten contar los accesos a la red y ver si se abortaron
let peticiones

// Deja correr las microtareas pendientes (el abort diferido del cliente usa queueMicrotask)
function esperarMicrotareas() {
  return new Promise((resolver) => setTimeout(resolver, 0))
}

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

// Los handlers tardan entre 400 y 900 ms
const DEMORA_MAXIMA_MOCK = 900

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

beforeEach(async () => {
  vi.resetModules()
  ;({ obtenerJson, leerCache } = await import('./clienteHttp.js'))

  peticiones = []
  server.events.on('request:start', ({ request }) => {
    peticiones.push(request)
  })
})

afterEach(() => {
  server.events.removeAllListeners()
  server.resetHandlers()
})

afterAll(() => server.close())

describe('caché', () => {
  it('lo cacheado no vuelve a pedirse', async () => {
    const primera = await obtenerJson(RUTA)
    const segunda = await obtenerJson(RUTA)

    expect(primera).toHaveLength(ELEMENTOS.length)
    expect(segunda).toBe(primera)
    expect(peticiones).toHaveLength(1)
    expect(leerCache(RUTA)).toBe(primera)
  })

  it('forzar hace una petición nueva aunque haya caché', async () => {
    await obtenerJson(RUTA)
    const forzada = await obtenerJson(RUTA, { forzar: true })

    expect(forzada).toHaveLength(ELEMENTOS.length)
    expect(peticiones).toHaveLength(2)
    // La respuesta forzada reemplaza la anterior en la caché
    expect(leerCache(RUTA)).toBe(forzada)
  })

})

describe('peticiones compartidas', () => {
  it('dos consumidores simultáneos generan una sola petición', async () => {
    const [a, b] = await Promise.all([obtenerJson(RUTA), obtenerJson(RUTA)])

    expect(a).toBe(b)
    expect(peticiones).toHaveLength(1)
  })

  it('si uno cancela, el otro recibe los datos y la red no se aborta', async () => {
    const controladorA = new AbortController()
    const consumidorA = obtenerJson(RUTA, { signal: controladorA.signal })
    const consumidorB = obtenerJson(RUTA, { signal: new AbortController().signal })

    controladorA.abort()
    await expect(consumidorA).rejects.toMatchObject({ tipo: TIPOS_ERROR.cancelado })
    await esperarMicrotareas()

    expect(peticiones).toHaveLength(1)
    expect(peticiones[0].signal.aborted).toBe(false)

    const datos = await consumidorB
    expect(datos).toHaveLength(ELEMENTOS.length)
    expect(leerCache(RUTA)).toBe(datos)
  })

  it('si cancelan ambos, la red se aborta y nada queda en caché', async () => {
    const controladorA = new AbortController()
    const controladorB = new AbortController()
    const consumidorA = obtenerJson(RUTA, { signal: controladorA.signal })
    const consumidorB = obtenerJson(RUTA, { signal: controladorB.signal })

    controladorA.abort()
    controladorB.abort()
    await expect(consumidorA).rejects.toMatchObject({ tipo: TIPOS_ERROR.cancelado })
    await expect(consumidorB).rejects.toMatchObject({ tipo: TIPOS_ERROR.cancelado })
    await esperarMicrotareas()

    expect(peticiones).toHaveLength(1)
    expect(peticiones[0].signal.aborted).toBe(true)

    // Pasado el tiempo en que el mock habría respondido, la caché sigue vacía
    await esperar(DEMORA_MAXIMA_MOCK + 100)
    expect(leerCache(RUTA)).toBeUndefined()

    // Y la siguiente consulta vuelve a la red
    await obtenerJson(RUTA)
    expect(peticiones).toHaveLength(2)
  })

  it('StrictMode: cancelar y volver a pedir en la misma tarea genera una sola petición', async () => {
    // Primer montaje del efecto, limpieza y segundo montaje, todo de forma síncrona
    const primerMontaje = new AbortController()
    const consulta1 = obtenerJson(RUTA, { signal: primerMontaje.signal })
    primerMontaje.abort()
    const consulta2 = obtenerJson(RUTA, { signal: new AbortController().signal })

    await expect(consulta1).rejects.toMatchObject({ tipo: TIPOS_ERROR.cancelado })
    const datos = await consulta2

    expect(datos).toHaveLength(ELEMENTOS.length)
    expect(peticiones).toHaveLength(1)
    expect(peticiones[0].signal.aborted).toBe(false)
  })

  it('una señal ya cancelada no genera petición', async () => {
    const controlador = new AbortController()
    controlador.abort()

    await expect(obtenerJson(RUTA, { signal: controlador.signal })).rejects.toMatchObject({
      tipo: TIPOS_ERROR.cancelado,
    })
    expect(peticiones).toHaveLength(0)
  })
})

describe('errores', () => {
  it('un 404 del mock real da "no-encontrado" con el mensaje del servidor', async () => {
    const ruta = '/prueba/99'

    await expect(obtenerJson(ruta)).rejects.toEqual({
      tipo: TIPOS_ERROR.noEncontrado,
      estado: 404,
      mensaje: 'No existe un elemento con el id «99».',
    })
    expect(leerCache(ruta)).toBeUndefined()
  })

  it('un 500 da "servidor" y no queda en caché', async () => {
    server.use(
      http.get(`${API}/prueba`, () =>
        HttpResponse.json({ mensaje: 'Falla simulada del servidor.' }, { status: 500 }),
      ),
    )

    await expect(obtenerJson(RUTA)).rejects.toEqual({
      tipo: TIPOS_ERROR.servidor,
      estado: 500,
      mensaje: 'Falla simulada del servidor.',
    })
    expect(leerCache(RUTA)).toBeUndefined()
  })

  it('sin conexión da "red" y no queda en caché', async () => {
    server.use(http.get(`${API}/prueba`, () => HttpResponse.error()))

    await expect(obtenerJson(RUTA)).rejects.toMatchObject({ tipo: TIPOS_ERROR.red, estado: null })
    expect(leerCache(RUTA)).toBeUndefined()
  })

  it('un JSON inválido da "desconocido" y no queda en caché', async () => {
    server.use(
      http.get(
        `${API}/prueba`,
        () => new HttpResponse('{ esto no es json', { headers: { 'Content-Type': 'application/json' } }),
      ),
    )

    await expect(obtenerJson(RUTA)).rejects.toMatchObject({
      tipo: TIPOS_ERROR.desconocido,
      mensaje: expect.stringMatching(/formato válido/),
    })
    expect(leerCache(RUTA)).toBeUndefined()
  })

  it('tras un error, la petición siguiente funciona', async () => {
    // Solo la primera petición falla; la segunda llega al handler de prueba
    server.use(
      http.get(`${API}/prueba`, () => new HttpResponse(null, { status: 500 }), { once: true }),
    )

    await expect(obtenerJson(RUTA)).rejects.toMatchObject({ tipo: TIPOS_ERROR.servidor })
    const datos = await obtenerJson(RUTA)

    expect(datos).toHaveLength(ELEMENTOS.length)
    expect(peticiones).toHaveLength(2)
    expect(leerCache(RUTA)).toBe(datos)
  })
})
