import { delay, http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { TIEMPO_LIMITE_MS, VIGENCIA_CACHE_MS } from '../config/api.js'
import { DEMORA_LENTA, esperarRed, noEncontrado, respuestaFallaRest } from '../mocks/handlers.js'
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
let cacheVigente
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
  ;({ obtenerJson, leerCache, cacheVigente } = await import('./clienteHttp.js'))

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

  it('un JSON inválido en una respuesta 2xx da "datos-incompletos" y no queda en caché', async () => {
    server.use(
      http.get(
        `${API}/prueba`,
        () => new HttpResponse('{ esto no es json', { headers: { 'Content-Type': 'application/json' } }),
      ),
    )

    await expect(obtenerJson(RUTA)).rejects.toMatchObject({
      tipo: TIPOS_ERROR.datosIncompletos,
      mensaje: expect.stringMatching(/incompleta/),
    })
    expect(leerCache(RUTA)).toBeUndefined()
  })

  it('un 500 con un cuerpo HTML sigue siendo "servidor", no "datos-incompletos"', async () => {
    server.use(
      http.get(
        `${API}/prueba`,
        () => new HttpResponse('<html><body>Error</body></html>', {
          status: 500,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    )

    await expect(obtenerJson(RUTA)).rejects.toMatchObject({ tipo: TIPOS_ERROR.servidor, estado: 500 })
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

describe('validación', () => {
  const esListaConNombres = (datos) =>
    Array.isArray(datos) && datos.every((item) => typeof item?.nombre === 'string')

  it('datos válidos pasan y quedan en caché', async () => {
    const datos = await obtenerJson(RUTA, { validar: esListaConNombres })
    expect(leerCache(RUTA)).toBe(datos)
  })

  it('datos inválidos dan "datos-incompletos", no quedan en caché y la siguiente vuelve a la red', async () => {
    server.use(
      http.get(`${API}/prueba`, () => HttpResponse.json([{ id: 1, nombre: 'Uno' }, { id: 2 }]), {
        once: true,
      }),
    )

    await expect(obtenerJson(RUTA, { validar: esListaConNombres })).rejects.toEqual({
      tipo: TIPOS_ERROR.datosIncompletos,
      estado: null,
      mensaje: expect.stringMatching(/incompleta/),
    })
    expect(leerCache(RUTA)).toBeUndefined()

    const datos = await obtenerJson(RUTA, { validar: esListaConNombres })
    expect(datos).toHaveLength(ELEMENTOS.length)
    expect(peticiones).toHaveLength(2)
  })

  it('todos los consumidores de una petición compartida reciben "datos-incompletos"', async () => {
    server.use(http.get(`${API}/prueba`, () => HttpResponse.json({ no: 'es lista' })))

    const resultados = await Promise.allSettled([
      obtenerJson(RUTA, { validar: esListaConNombres }),
      obtenerJson(RUTA, { validar: esListaConNombres }),
    ])

    expect(resultados.map((r) => r.reason?.tipo)).toEqual([
      TIPOS_ERROR.datosIncompletos,
      TIPOS_ERROR.datosIncompletos,
    ])
    expect(peticiones).toHaveLength(1)
    expect(leerCache(RUTA)).toBeUndefined()
  })
})

describe('tiempo límite', () => {
  // Temporizadores falsos: no se esperan 15 s reales. La demora del mock (delay de MSW) también
  // usa setTimeout y avanza con ellos
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // Handler que nunca responde, como el modo "sin respuesta". Una promesa pendiente en vez de
  // delay('infinite'), que deja un temporizador propio de MSW: así getTimerCount cuenta solo el
  // del cliente. El modo "sin respuesta" real se prueba en destinos.test.js y clienteApollo.test.js
  function sinRespuesta() {
    server.use(http.get(`${API}/prueba`, () => new Promise(() => {})))
  }

  function capturar(promesa) {
    const resultado = { estado: 'pendiente' }
    promesa.then(
      (valor) => Object.assign(resultado, { estado: 'resuelta', valor }),
      (error) => Object.assign(resultado, { estado: 'rechazada', error }),
    )
    return resultado
  }

  it('sin respuesta, al vencer el plazo da "tiempo-agotado", aborta la red y no deja caché', async () => {
    sinRespuesta()
    const resultado = capturar(obtenerJson(RUTA))

    await vi.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS - 1)
    expect(resultado.estado).toBe('pendiente')

    await vi.advanceTimersByTimeAsync(1)
    expect(resultado.error).toMatchObject({ tipo: TIPOS_ERROR.tiempoAgotado, estado: null })
    expect(peticiones[0].signal.aborted).toBe(true)
    expect(leerCache(RUTA)).toBeUndefined()
  })

  it('el cuerpo que no termina de llegar también agota el plazo', async () => {
    // Responde los encabezados, pero el cuerpo nunca se cierra
    server.use(
      http.get(
        `${API}/prueba`,
        () => new HttpResponse(new ReadableStream({ start() {} }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    const resultado = capturar(obtenerJson(RUTA))

    await vi.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS)

    expect(resultado.error).toMatchObject({ tipo: TIPOS_ERROR.tiempoAgotado })
  })

  it('una respuesta lenta (4 s) no agota el plazo', async () => {
    server.use(
      http.get(`${API}/prueba`, async () => {
        await delay(DEMORA_LENTA)
        return HttpResponse.json(ELEMENTOS)
      }),
    )
    const resultado = capturar(obtenerJson(RUTA))

    await vi.advanceTimersByTimeAsync(DEMORA_LENTA)

    expect(resultado.estado).toBe('resuelta')
    expect(resultado.valor).toHaveLength(ELEMENTOS.length)
    // El temporizador del plazo se limpió al responder
    expect(vi.getTimerCount()).toBe(0)
  })

  it('dos consumidores: uno cancela y luego vence el plazo; el otro recibe "tiempo-agotado"', async () => {
    sinRespuesta()
    const controladorA = new AbortController()
    const consumidorA = capturar(obtenerJson(RUTA, { signal: controladorA.signal }))
    const consumidorB = capturar(obtenerJson(RUTA, { signal: new AbortController().signal }))

    await vi.advanceTimersByTimeAsync(5000)
    controladorA.abort()
    await vi.advanceTimersByTimeAsync(0)

    // A recibe la cancelación; la red sigue porque B la espera
    expect(consumidorA.error).toMatchObject({ tipo: TIPOS_ERROR.cancelado })
    expect(consumidorB.estado).toBe('pendiente')
    expect(peticiones).toHaveLength(1)
    expect(peticiones[0].signal.aborted).toBe(false)

    // El plazo cuenta desde que partió la petición, no desde la cancelación
    await vi.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS - 5000)

    expect(consumidorB.error).toMatchObject({ tipo: TIPOS_ERROR.tiempoAgotado })
    expect(consumidorB.error.tipo).not.toBe(TIPOS_ERROR.red)
    expect(peticiones[0].signal.aborted).toBe(true)
    expect(leerCache(RUTA)).toBeUndefined()
    expect(vi.getTimerCount()).toBe(0)

    // Reintentar crea una petición nueva con su propio plazo
    server.resetHandlers()
    const reintento = capturar(obtenerJson(RUTA))
    await vi.advanceTimersByTimeAsync(DEMORA_MAXIMA_MOCK)
    expect(reintento.estado).toBe('resuelta')
    expect(peticiones).toHaveLength(2)
  })

  it('si cancelan todos antes del plazo, nadie recibe un error y el temporizador se limpia', async () => {
    sinRespuesta()
    const controlador = new AbortController()
    const consulta = capturar(obtenerJson(RUTA, { signal: controlador.signal }))
    await vi.advanceTimersByTimeAsync(1000)

    controlador.abort()
    await vi.advanceTimersByTimeAsync(0)

    expect(consulta.error).toMatchObject({ tipo: TIPOS_ERROR.cancelado })
    expect(peticiones[0].signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('vigencia de la caché', () => {
  // Solo se finge la hora (Date): la demora del mock sigue con temporizadores reales
  const INICIO = new Date('2026-12-01T12:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(INICIO)
  })
  afterEach(() => vi.useRealTimers())

  function avanzarHora(ms) {
    vi.setSystemTime(Date.now() + ms)
  }

  it('un dato vigente (4:59) no se vuelve a pedir', async () => {
    const primera = await obtenerJson(RUTA)
    avanzarHora(VIGENCIA_CACHE_MS - 1000)

    expect(cacheVigente(RUTA)).toBe(true)
    expect(await obtenerJson(RUTA)).toBe(primera)
    expect(peticiones).toHaveLength(1)
  })

  it('un dato vencido (5:00) se sigue leyendo y obtenerJson lo pide en segundo plano', async () => {
    const primera = await obtenerJson(RUTA)
    avanzarHora(VIGENCIA_CACHE_MS)

    // La vista lo muestra al instante mientras se actualiza
    expect(cacheVigente(RUTA)).toBe(false)
    expect(leerCache(RUTA)).toBe(primera)

    const nueva = await obtenerJson(RUTA)

    expect(peticiones).toHaveLength(2)
    expect(nueva).not.toBe(primera)
    expect(leerCache(RUTA)).toBe(nueva)
    // La vigencia vuelve a contar desde la nueva respuesta
    expect(cacheVigente(RUTA)).toBe(true)
    avanzarHora(VIGENCIA_CACHE_MS - 1000)
    expect(cacheVigente(RUTA)).toBe(true)
  })

  it('dos consumidores de un dato vencido comparten una sola actualización', async () => {
    await obtenerJson(RUTA)
    avanzarHora(VIGENCIA_CACHE_MS)

    await Promise.all([obtenerJson(RUTA), obtenerJson(RUTA)])
    expect(peticiones).toHaveLength(2)
  })

  it('forzar pide aunque el dato esté vigente', async () => {
    await obtenerJson(RUTA)
    await obtenerJson(RUTA, { forzar: true })
    expect(peticiones).toHaveLength(2)
  })

  it.each([
    ['un 500', () => HttpResponse.json({ mensaje: 'Falla' }, { status: 500 }), TIPOS_ERROR.servidor],
    ['datos inválidos', () => HttpResponse.json({ no: 'es lista' }), TIPOS_ERROR.datosIncompletos],
    ['sin conexión', () => HttpResponse.error(), TIPOS_ERROR.red],
  ])('si la actualización falla con %s, el dato vencido se queda y sigue vencido', async (_caso, respuesta, tipo) => {
    const validar = Array.isArray
    const primera = await obtenerJson(RUTA, { validar })
    avanzarHora(VIGENCIA_CACHE_MS)
    server.use(http.get(`${API}/prueba`, respuesta, { once: true }))

    await expect(obtenerJson(RUTA, { validar })).rejects.toMatchObject({ tipo })

    expect(peticiones).toHaveLength(2)
    expect(leerCache(RUTA)).toBe(primera)
    expect(cacheVigente(RUTA)).toBe(false)

    // La siguiente consulta vuelve a intentarlo
    const nueva = await obtenerJson(RUTA, { validar })
    expect(peticiones).toHaveLength(3)
    expect(leerCache(RUTA)).toBe(nueva)
  })

  it('si la actualización agota el plazo, el dato vencido se queda', async () => {
    const primera = await obtenerJson(RUTA)
    // Ahora se fingen también los temporizadores para no esperar 15 s
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + VIGENCIA_CACHE_MS)
    server.use(http.get(`${API}/prueba`, () => new Promise(() => {})))

    let error
    obtenerJson(RUTA).catch((motivo) => (error = motivo))
    await vi.advanceTimersByTimeAsync(TIEMPO_LIMITE_MS)

    expect(error).toMatchObject({ tipo: TIPOS_ERROR.tiempoAgotado })
    expect(peticiones).toHaveLength(2)
    expect(leerCache(RUTA)).toBe(primera)
    expect(cacheVigente(RUTA)).toBe(false)
  })
})
