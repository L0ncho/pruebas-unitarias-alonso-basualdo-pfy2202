import { describe, expect, it } from 'vitest'
import { formatearFecha, formatearPrecio } from './formato.js'

describe('formatearPrecio', () => {
  it.each([
    [18990, '$18.990'],
    [1200, '$1.200'],
    [990, '$990'],
    [0, '$0'],
  ])('formatea %j como %j en pesos chilenos', (precio, esperado) => {
    expect(formatearPrecio(precio)).toBe(esperado)
  })
})

describe('formatearFecha', () => {
  it.each([
    ['2026-12-15', 'mar, 15 dic 2026'],
    ['2027-01-01', 'vie, 1 ene 2027'],
  ])('formatea %j como %j en es-CL', (fecha, esperado) => {
    expect(formatearFecha(fecha)).toBe(esperado)
  })
})
