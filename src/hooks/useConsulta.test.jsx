import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useConsulta } from './useConsulta.js'
import { destinos } from '../mocks/datos.js'
import { obtenerDestinos, RECURSO_DESTINOS } from '../services/destinos.js'
import { registrarPeticiones } from '../test/peticiones.js'
import { ESPERA } from '../test/renderizar.jsx'
import { API, server } from '../test/servidor.js'
import { TIPOS_ERROR } from '../utils/errores.js'

const RUTA_LISTADO = `${API}/destinos`
const RECURSO_OTRO = { ruta: '/otro' }

function responderErrorServidor() {
  server.use(
    http.get(RUTA_LISTADO, () => HttpResponse.json({ mensaje: 'Falló el servidor.' }, { status: 500 })),
  )
}

// Renderiza el hook y guarda cada estado que entrega, para revisar que nunca mostró un error
function renderizarConsulta(recursoInicial) {
  const estados = []
  const resultado = renderHook(
    ({ recurso }) => {
      const estado = useConsulta(recurso)
      estados.push(estado)
      return estado
    },
    { initialProps: { recurso: recursoInicial } },
  )
  return { ...resultado, estados }
}

let consoleError

beforeEach(() => {
  consoleError = jest.spyOn(console, 'error')
})

afterEach(() => {
  // Ninguna prueba del hook debe producir errores de consola (act, rechazos sin manejar...)
  expect(consoleError).not.toHaveBeenCalled()
  jest.restoreAllMocks()
})

describe('useConsulta', () => {
  it('sin recurso no hace ninguna petición y reintentar no hace nada', async () => {
    const peticiones = registrarPeticiones(RUTA_LISTADO)
    const { result } = renderizarConsulta(null)

    expect(result.current).toMatchObject({ datos: undefined, cargando: false, error: null })
    act(() => result.current.reintentar())

    expect(result.current).toMatchObject({ datos: undefined, cargando: false, error: null })
    expect(peticiones).toHaveLength(0)
  })

  it('primero indica que carga y después entrega los datos', async () => {
    const { result } = renderizarConsulta(RECURSO_DESTINOS)

    expect(result.current).toMatchObject({ datos: undefined, cargando: true, error: null })

    await waitFor(() => expect(result.current.cargando).toBe(false), ESPERA)
    expect(result.current.error).toBeNull()
    expect(result.current.datos.map((destino) => destino.nombre)).toEqual(
      destinos.map((destino) => destino.nombre),
    )
  })

  it('una respuesta con error entrega el error normalizado, sin datos', async () => {
    responderErrorServidor()
    const { result } = renderizarConsulta(RECURSO_DESTINOS)

    await waitFor(() => expect(result.current.error).not.toBeNull(), ESPERA)
    expect(result.current).toMatchObject({
      datos: undefined,
      cargando: false,
      error: { tipo: TIPOS_ERROR.servidor, estado: 500, mensaje: 'Falló el servidor.' },
    })
  })

  it('reintentar después de un error vuelve a consultar y se recupera', async () => {
    responderErrorServidor()
    const peticiones = registrarPeticiones(RUTA_LISTADO)
    const { result } = renderizarConsulta(RECURSO_DESTINOS)
    await waitFor(() => expect(result.current.error).not.toBeNull(), ESPERA)

    server.resetHandlers()
    act(() => result.current.reintentar())

    expect(result.current).toMatchObject({ cargando: true, error: null })
    await waitFor(() => expect(result.current.cargando).toBe(false), ESPERA)
    expect(result.current.error).toBeNull()
    expect(result.current.datos).toHaveLength(destinos.length)
    expect(peticiones).toHaveLength(2)
  })

  it('al reintentar mantiene visibles los datos anteriores mientras carga', async () => {
    const { result } = renderizarConsulta(RECURSO_DESTINOS)
    await waitFor(() => expect(result.current.cargando).toBe(false), ESPERA)
    const datosAnteriores = result.current.datos

    act(() => result.current.reintentar())

    expect(result.current.cargando).toBe(true)
    expect(result.current.datos).toBe(datosAnteriores)
    await waitFor(() => expect(result.current.cargando).toBe(false), ESPERA)
  })

  it('con un dato vigente en caché lo entrega al instante, sin cargar ni pedirlo de nuevo', async () => {
    await obtenerDestinos()
    const peticiones = registrarPeticiones(RUTA_LISTADO)

    const { result } = renderizarConsulta(RECURSO_DESTINOS)

    expect(result.current.cargando).toBe(false)
    expect(result.current.datos).toHaveLength(destinos.length)
    expect(peticiones).toHaveLength(0)
  })

  it('al desmontar cancela la petición en curso sin mostrarla como error', async () => {
    const peticiones = registrarPeticiones(RUTA_LISTADO)
    const { estados, unmount } = renderizarConsulta(RECURSO_DESTINOS)
    await waitFor(() => expect(peticiones).toHaveLength(1))

    unmount()

    await waitFor(() => expect(peticiones[0].signal.aborted).toBe(true))
    expect(estados.every((estado) => estado.error === null)).toBe(true)
  })

  it('al cambiar de recurso cancela la consulta anterior sin mostrarla como error', async () => {
    server.use(http.get(`${API}/otro`, () => HttpResponse.json({ ok: true })))
    const peticiones = registrarPeticiones(RUTA_LISTADO)
    const { result, estados, rerender } = renderizarConsulta(RECURSO_DESTINOS)
    await waitFor(() => expect(peticiones).toHaveLength(1))

    rerender({ recurso: RECURSO_OTRO })

    await waitFor(() => expect(result.current.datos).toEqual({ ok: true }), ESPERA)
    expect(peticiones[0].signal.aborted).toBe(true)
    expect(result.current).toMatchObject({ cargando: false, error: null })
    expect(estados.every((estado) => estado.error === null)).toBe(true)
  })
})
