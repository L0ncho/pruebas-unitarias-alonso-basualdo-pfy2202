import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useDestinos } from './useDestinos.js'
import { destinos } from '../mocks/datos.js'
import { ESPERA } from '../test/renderizar.jsx'
import { API, server } from '../test/servidor.js'
import { TIPOS_ERROR } from '../utils/errores.js'

describe('useDestinos', () => {
  it('entrega el listado de destinos de la API con su país y actividades', async () => {
    const { result } = renderHook(() => useDestinos())
    expect(result.current.cargando).toBe(true)

    await waitFor(() => expect(result.current.cargando).toBe(false), ESPERA)

    expect(result.current.error).toBeNull()
    expect(result.current.datos).toEqual(
      destinos.map(({ id, nombre, pais, descripcion, actividades }) => ({
        id,
        nombre,
        pais,
        descripcion,
        actividades,
      })),
    )
  })

  it('un listado con una estructura inválida se informa como datos incompletos', async () => {
    server.use(http.get(`${API}/destinos`, () => HttpResponse.json([{ id: 1, nombre: 'Sin país' }])))

    const { result } = renderHook(() => useDestinos())

    await waitFor(() => expect(result.current.error).not.toBeNull(), ESPERA)
    expect(result.current.error.tipo).toBe(TIPOS_ERROR.datosIncompletos)
    expect(result.current.datos).toBeUndefined()
  })
})
