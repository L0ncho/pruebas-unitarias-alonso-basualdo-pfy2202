import { describe, expect, it } from 'vitest'
import {
  calcularNoches,
  estaDisponible,
  fechasCalzan,
  nochesHotel,
  nochesViaje,
  totalEstadia,
  totalViaje,
} from './viaje.js'

const vuelo = { fechaIda: '2026-12-10', fechaVuelta: '2026-12-15', precio: 189990 }
const hotel = { fechaEntrada: '2026-12-10', fechaSalida: '2026-12-15', precioPorNoche: 98000 }

describe('calcularNoches', () => {
  it.each([
    ['2026-12-10', '2026-12-15', 5],
    ['2026-12-28', '2027-01-02', 5],
    ['2027-02-20', '2027-02-28', 8],
    // Cruza el cambio de horario de Chile (abril): sigue siendo 1 noche
    ['2027-04-03', '2027-04-04', 1],
  ])('de %s a %s son %i noches', (entrada, salida, esperado) => {
    expect(calcularNoches(entrada, salida)).toBe(esperado)
  })

  it.each([
    ['2026-12-15', '2026-12-15'],
    ['2026-12-15', '2026-12-10'],
    ['no es fecha', '2026-12-10'],
  ])('de %s a %s devuelve 0', (entrada, salida) => {
    expect(calcularNoches(entrada, salida)).toBe(0)
  })
})

describe('noches del viaje y del hotel', () => {
  it('nochesViaje usa las fechas del vuelo', () => {
    expect(nochesViaje(vuelo)).toBe(5)
  })

  it('nochesHotel usa las fechas de la estadía', () => {
    expect(nochesHotel({ ...hotel, fechaSalida: '2026-12-13' })).toBe(3)
  })
})

describe('totales', () => {
  it('totalEstadia multiplica el precio por noche por las noches', () => {
    expect(totalEstadia(hotel)).toBe(490000)
  })

  it('totalViaje suma el vuelo y la estadía', () => {
    expect(totalViaje(vuelo, hotel)).toBe(189990 + 490000)
  })

  it('totalViaje con solo uno elegido suma solo ese', () => {
    expect(totalViaje(vuelo, null)).toBe(189990)
    expect(totalViaje(null, hotel)).toBe(490000)
    expect(totalViaje(null, null)).toBe(0)
  })
})

describe('fechasCalzan', () => {
  it.each([
    ['las mismas fechas', '2026-12-10', '2026-12-15'],
    ['una estadía más corta dentro del viaje', '2026-12-11', '2026-12-14'],
  ])('calza con %s', (_caso, fechaEntrada, fechaSalida) => {
    expect(fechasCalzan(vuelo, { fechaEntrada, fechaSalida })).toBe(true)
  })

  it.each([
    ['entra antes de la ida', '2026-12-09', '2026-12-15'],
    ['sale después de la vuelta', '2026-12-10', '2026-12-16'],
    ['otro mes', '2027-01-07', '2027-01-12'],
  ])('no calza si %s', (_caso, fechaEntrada, fechaSalida) => {
    expect(fechasCalzan(vuelo, { fechaEntrada, fechaSalida })).toBe(false)
  })
})

describe('estaDisponible', () => {
  it.each([
    [1, true],
    [12, true],
    [0, false],
    [-1, false],
    [null, false],
    [undefined, false],
  ])('con %j devuelve %j', (cantidad, esperado) => {
    expect(estaDisponible(cantidad)).toBe(esperado)
  })
})
