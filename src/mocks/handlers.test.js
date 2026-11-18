import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { destinos } from './datos.js'
import { guardarModoSimulacion, MODOS } from './simulacion.js'
import { crearAlmacenamiento } from '../test/almacenamiento.js'
import { API, crearServidor } from '../test/servidor.js'

// Pruebas de los handlers REST reales con msw/node, sin pasar por el cliente HTTP:
// así se verifica la respuesta tal como la entrega la API simulada

const server = crearServidor()

beforeAll(() => {
  vi.stubGlobal('sessionStorage', crearAlmacenamiento())
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => sessionStorage.clear())

afterAll(() => {
  server.close()
  vi.unstubAllGlobals()
})

describe('GET /api/destinos', () => {
  it('en modo normal responde la lista con país y actividades', async () => {
    const respuesta = await fetch(`${API}/destinos`)
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(200)
    expect(cuerpo).toEqual(destinos)
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
