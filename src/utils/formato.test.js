import { describe, expect, it } from 'vitest'
import {
  formatearDisponibles,
  formatearDuracion,
  formatearEscalas,
  formatearFecha,
  formatearNoches,
  formatearPrecio,
} from './formato.js'

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

describe('formatearEscalas', () => {
  it.each([
    [0, 'Directo'],
    [1, '1 escala'],
    [2, '2 escalas'],
  ])('con %j devuelve %j', (escalas, esperado) => {
    expect(formatearEscalas(escalas)).toBe(esperado)
  })
})

describe('formatearNoches', () => {
  it.each([
    [1, '1 noche'],
    [5, '5 noches'],
    [0, '0 noches'],
  ])('con %j devuelve %j', (noches, esperado) => {
    expect(formatearNoches(noches)).toBe(esperado)
  })
})

describe('formatearDisponibles', () => {
  it.each([
    [1, '1 asiento disponible'],
    [12, '12 asientos disponibles'],
  ])('con %j devuelve %j', (cantidad, esperado) => {
    expect(formatearDisponibles(cantidad, 'asiento', 'asientos')).toBe(esperado)
  })
})

describe('formatearDuracion', () => {
  it.each([
    [125, '2 h 5 min'],
    [180, '3 h'],
    [45, '45 min'],
    [680, '11 h 20 min'],
    [60, '1 h'],
  ])('con %i minutos devuelve %j', (minutos, esperado) => {
    expect(formatearDuracion(minutos)).toBe(esperado)
  })
})
