import {
  esDestinoNacional,
  filtrarDestinos,
  normalizarRegion,
  REGIONES,
  textoResultadoFiltro,
} from './destinos.js'

const destinos = [
  { id: 1, nombre: 'San Pedro de Atacama', pais: 'Chile' },
  { id: 5, nombre: 'Cusco', pais: 'Perú' },
  { id: 2, nombre: 'Rapa Nui', pais: 'Chile' },
  { id: 8, nombre: 'Madrid', pais: 'España' },
]

const ids = (lista) => lista.map((destino) => destino.id)

describe('esDestinoNacional', () => {
  it.each([
    ['Chile', true],
    ['Perú', false],
    ['chile', false],
    [undefined, false],
  ])('con %j devuelve %j', (pais, esperado) => {
    expect(esDestinoNacional(pais)).toBe(esperado)
  })
})

describe('normalizarRegion', () => {
  it.each(['todos', 'nacionales', 'internacionales'])('acepta %j', (region) => {
    expect(normalizarRegion(region)).toBe(region)
  })

  it.each([null, undefined, '', 'europa', 'chile', 'Nacionales', 'todos '])(
    'un valor ausente o desconocido (%j) se trata como "todos"',
    (valor) => {
      expect(normalizarRegion(valor)).toBe(REGIONES.todos)
    },
  )
})

describe('filtrarDestinos', () => {
  it('"todos" devuelve la lista completa', () => {
    expect(filtrarDestinos(destinos, REGIONES.todos)).toBe(destinos)
  })

  it('"nacionales" deja solo los destinos de Chile, en el mismo orden', () => {
    expect(ids(filtrarDestinos(destinos, REGIONES.nacionales))).toEqual([1, 2])
  })

  it('"internacionales" deja el resto', () => {
    expect(ids(filtrarDestinos(destinos, REGIONES.internacionales))).toEqual([5, 8])
  })

  it('un valor desconocido muestra todos', () => {
    expect(filtrarDestinos(destinos, 'europa')).toBe(destinos)
  })

  it('no modifica la lista original', () => {
    const copia = [...destinos]
    filtrarDestinos(destinos, REGIONES.nacionales)
    expect(destinos).toEqual(copia)
  })

  it('con una lista vacía devuelve una lista vacía', () => {
    expect(filtrarDestinos([], REGIONES.nacionales)).toEqual([])
  })
})

describe('textoResultadoFiltro', () => {
  it.each([
    [4, 8, 'Mostrando 4 de 8 destinos'],
    [8, 8, 'Mostrando 8 de 8 destinos'],
    [0, 8, 'Mostrando 0 de 8 destinos'],
    [1, 1, 'Mostrando 1 de 1 destino'],
  ])('con %i de %i devuelve %j', (mostrados, total, esperado) => {
    expect(textoResultadoFiltro(mostrados, total)).toBe(esperado)
  })
})
