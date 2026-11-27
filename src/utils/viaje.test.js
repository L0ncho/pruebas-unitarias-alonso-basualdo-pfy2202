import {
  calcularNoches,
  estaDisponible,
  fechasCalzan,
  horasAnticipacionAeropuerto,
  hotelElegido,
  nochesHotel,
  nochesViaje,
  opcionElegida,
  totalEstadia,
  totalViaje,
  vueloElegido,
} from './viaje.js'

describe('opción elegida tras una actualización de los datos', () => {
  const asientos = (opcion) => opcion.asientosDisponibles
  const antes = [
    { id: 101, asientosDisponibles: 3 },
    { id: 102, asientosDisponibles: 1 },
  ]

  it('vale si existe en los datos actuales y está disponible', () => {
    expect(opcionElegida(antes, 101, asientos)).toBe(antes[0])
  })

  it('una opción que ya no existe queda como no elegida', () => {
    const despues = [{ id: 102, asientosDisponibles: 1 }]
    expect(opcionElegida(despues, 101, asientos)).toBeUndefined()
  })

  it('una opción que se agotó queda como no elegida', () => {
    const despues = [
      { id: 101, asientosDisponibles: 3 },
      { id: 102, asientosDisponibles: 0 },
    ]
    expect(opcionElegida(despues, 102, asientos)).toBeUndefined()
  })

  it('se usa el objeto de los datos actuales (precio nuevo), no el de antes', () => {
    const despues = [{ id: 101, asientosDisponibles: 2, precio: 200000 }]
    expect(opcionElegida(despues, 101, asientos)).toBe(despues[0])
  })

  it.each([null, undefined])('sin id elegido (%j) no hay opción', (id) => {
    expect(opcionElegida(antes, id, asientos)).toBeUndefined()
  })

  it('sin datos no hay opción', () => {
    expect(opcionElegida(undefined, 101, asientos)).toBeUndefined()
  })

  it('vueloElegido y hotelElegido usan asientos y habitaciones disponibles', () => {
    const destino = {
      vuelos: [{ id: 101, asientosDisponibles: 0 }, { id: 102, asientosDisponibles: 5 }],
      hoteles: [{ id: 201, habitacionesDisponibles: 2 }, { id: 202, habitacionesDisponibles: 0 }],
    }
    expect(vueloElegido(destino, 101)).toBeUndefined()
    expect(vueloElegido(destino, 102)).toBe(destino.vuelos[1])
    expect(hotelElegido(destino, 201)).toBe(destino.hoteles[0])
    expect(hotelElegido(destino, 202)).toBeUndefined()
    expect(vueloElegido(undefined, 102)).toBeUndefined()
    // Sin opción elegida no hay total de esa opción
    expect(totalViaje(vueloElegido(destino, 101), undefined)).toBe(0)
  })
})

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

describe('horasAnticipacionAeropuerto', () => {
  it('recomienda 2 horas para un destino nacional (Chile)', () => {
    expect(horasAnticipacionAeropuerto('Chile')).toBe(2)
  })

  it.each(['Perú', 'Argentina', 'México', 'España'])('recomienda 3 horas para %s', (pais) => {
    expect(horasAnticipacionAeropuerto(pais)).toBe(3)
  })
})
