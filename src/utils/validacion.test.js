import { destinos, hoteles, vuelos } from '../mocks/datos.js'
import { validarListadoDestinos, validarOpcionesViaje } from './validacion.js'

function destinoListado(cambios = {}) {
  return {
    id: 1,
    nombre: 'San Pedro de Atacama',
    pais: 'Chile',
    descripcion: 'Desierto',
    actividades: ['Valle de la Luna', 'Géiseres del Tatio'],
    ...cambios,
  }
}

function vuelo(cambios = {}) {
  return {
    __typename: 'Vuelo',
    id: 101,
    aerolinea: 'AeroAndes',
    origen: 'Santiago (SCL)',
    llegada: 'Calama (CJC)',
    fechaIda: '2026-12-10',
    horaSalidaIda: '07:10',
    horaLlegadaIda: '09:15',
    duracionIdaMinutos: 125,
    fechaVuelta: '2026-12-15',
    horaSalidaVuelta: '18:40',
    horaLlegadaVuelta: '20:45',
    duracionVueltaMinutos: 125,
    escalas: 0,
    precio: 189990,
    asientosDisponibles: 12,
    ...cambios,
  }
}

function hotel(cambios = {}) {
  return {
    __typename: 'Hotel',
    id: 201,
    nombre: 'Hotel Desierto',
    estrellas: 4,
    zona: 'Centro',
    fechaEntrada: '2026-12-10',
    fechaSalida: '2026-12-15',
    precioPorNoche: 90000,
    habitacionesDisponibles: 0,
    ...cambios,
  }
}

function destinoOpciones(cambios = {}) {
  return {
    __typename: 'Destino',
    id: 1,
    nombre: 'San Pedro de Atacama',
    pais: 'Chile',
    descripcion: 'Desierto',
    notaLlegada: 'Se llega por Calama.',
    vuelos: [vuelo()],
    hoteles: [hotel()],
    ...cambios,
  }
}

describe('validarListadoDestinos', () => {
  it('acepta los datos del mock tal como los entrega el listado', () => {
    const listado = destinos.map(({ id, nombre, pais, descripcion, actividades }) => ({
      id,
      nombre,
      pais,
      descripcion,
      actividades,
    }))
    expect(validarListadoDestinos(listado)).toBe(true)
  })

  it('acepta una lista vacía y campos extra', () => {
    expect(validarListadoDestinos([])).toBe(true)
    expect(validarListadoDestinos([destinoListado({ extra: 'x' })])).toBe(true)
  })

  it.each([null, undefined, {}, 'texto', 42])('rechaza %j en vez de un arreglo', (valor) => {
    expect(validarListadoDestinos(valor)).toBe(false)
  })

  it.each([
    ['sin nombre', { nombre: undefined }],
    ['pais numérico', { pais: 3 }],
    ['descripcion null', { descripcion: null }],
    ['id como texto', { id: '1' }],
    ['id cero', { id: 0 }],
    ['actividades que no son arreglo', { actividades: 'Trekking' }],
    ['una actividad que no es texto', { actividades: ['Trekking', 5] }],
  ])('rechaza el listado si un destino tiene %s', (_caso, cambios) => {
    expect(validarListadoDestinos([destinoListado(), destinoListado({ id: 2, ...cambios })])).toBe(false)
  })

  it('un solo elemento que no es objeto invalida todo el listado', () => {
    expect(validarListadoDestinos([destinoListado(), null])).toBe(false)
    expect(validarListadoDestinos([destinoListado(), [destinoListado()]])).toBe(false)
  })
})

describe('validarOpcionesViaje', () => {
  it('acepta un destino completo, con notaLlegada en texto o null', () => {
    expect(validarOpcionesViaje(destinoOpciones())).toBe(true)
    expect(validarOpcionesViaje(destinoOpciones({ notaLlegada: null }))).toBe(true)
  })

  it('acepta un destino sin vuelos ni hoteles', () => {
    expect(validarOpcionesViaje(destinoOpciones({ vuelos: [], hoteles: [] }))).toBe(true)
  })

  it('acepta los vuelos y hoteles del mock', () => {
    // destinoId no es parte del esquema GraphQL: se quita como lo haría la API
    const sinDestinoId = (item) => {
      const copia = { ...item }
      delete copia.destinoId
      return copia
    }
    expect(
      validarOpcionesViaje(
        destinoOpciones({ vuelos: vuelos.map(sinDestinoId), hoteles: hoteles.map(sinDestinoId) }),
      ),
    ).toBe(true)
  })

  it.each([null, undefined, [], 'texto'])('rechaza el destino %j', (valor) => {
    expect(validarOpcionesViaje(valor)).toBe(false)
  })

  it.each([
    ['sin nombre', { nombre: undefined }],
    ['notaLlegada ausente', { notaLlegada: undefined }],
    ['notaLlegada numérica', { notaLlegada: 1 }],
    ['vuelos null', { vuelos: null }],
    ['hoteles que no son arreglo', { hoteles: {} }],
  ])('rechaza un destino con %s', (_caso, cambios) => {
    expect(validarOpcionesViaje(destinoOpciones(cambios))).toBe(false)
  })

  it.each([
    ['precio como texto', { precio: '189990' }],
    ['precio decimal', { precio: 10.5 }],
    ['asientos negativos', { asientosDisponibles: -1 }],
    ['sin horaSalidaIda', { horaSalidaIda: undefined }],
    ['duración null', { duracionVueltaMinutos: null }],
  ])('rechaza un vuelo con %s', (_caso, cambios) => {
    expect(validarOpcionesViaje(destinoOpciones({ vuelos: [vuelo(), vuelo({ id: 102, ...cambios })] }))).toBe(
      false,
    )
  })

  it.each([
    ['precioPorNoche null', { precioPorNoche: null }],
    ['sin fechaSalida', { fechaSalida: undefined }],
    ['estrellas como texto', { estrellas: '4' }],
  ])('rechaza un hotel con %s', (_caso, cambios) => {
    expect(validarOpcionesViaje(destinoOpciones({ hoteles: [hotel({ ...cambios })] }))).toBe(false)
  })
})
