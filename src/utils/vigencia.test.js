import { describe, expect, it } from 'vitest'
import { VIGENCIA_CACHE_MS } from '../config/api.js'
import { estaVigente } from './vigencia.js'

describe('estaVigente', () => {
  const RECIBIDO = 1_000_000

  it('la vigencia es de 5 minutos', () => {
    expect(VIGENCIA_CACHE_MS).toBe(5 * 60 * 1000)
  })

  it('al llegar y a los 4:59 sigue vigente', () => {
    expect(estaVigente(RECIBIDO, RECIBIDO)).toBe(true)
    expect(estaVigente(RECIBIDO, RECIBIDO + VIGENCIA_CACHE_MS - 1000)).toBe(true)
  })

  it('a los 5:00 exactos ya venció, y después también', () => {
    expect(estaVigente(RECIBIDO, RECIBIDO + VIGENCIA_CACHE_MS)).toBe(false)
    expect(estaVigente(RECIBIDO, RECIBIDO + VIGENCIA_CACHE_MS * 3)).toBe(false)
  })

  it('un momento anterior a la recepción cuenta como vigente', () => {
    expect(estaVigente(RECIBIDO, RECIBIDO - 10)).toBe(true)
  })

  it.each([undefined, null, Number.NaN])('sin hora de recepción (%j) no está vigente', (recibido) => {
    expect(estaVigente(recibido, RECIBIDO)).toBe(false)
  })

  it('acepta otra vigencia', () => {
    expect(estaVigente(RECIBIDO, RECIBIDO + 50, 100)).toBe(true)
    expect(estaVigente(RECIBIDO, RECIBIDO + 100, 100)).toBe(false)
  })
})
