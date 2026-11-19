import { PAIS_NACIONAL } from '../config/sitio.js'

// Filtro del listado de destinos por región. Se calcula desde el país que ya trae cada destino

export const REGIONES = {
  todos: 'todos',
  nacionales: 'nacionales',
  internacionales: 'internacionales',
}

export const OPCIONES_REGION = [
  { valor: REGIONES.todos, etiqueta: 'Todos' },
  { valor: REGIONES.nacionales, etiqueta: 'Nacionales' },
  { valor: REGIONES.internacionales, etiqueta: 'Internacionales' },
]

const regionesValidas = new Set(Object.values(REGIONES))

// Un destino es nacional si está en el país de la agencia
export function esDestinoNacional(pais) {
  return pais === PAIS_NACIONAL
}

// Región desde el parámetro de la URL: un valor ausente o desconocido se trata como "todos"
export function normalizarRegion(valor) {
  return regionesValidas.has(valor) ? valor : REGIONES.todos
}

// Destinos de la región (sin modificar la lista original)
export function filtrarDestinos(destinos, region) {
  switch (normalizarRegion(region)) {
    case REGIONES.nacionales:
      return destinos.filter((destino) => esDestinoNacional(destino.pais))
    case REGIONES.internacionales:
      return destinos.filter((destino) => !esDestinoNacional(destino.pais))
    default:
      return destinos
  }
}

// Texto del resultado del filtro: "Mostrando 4 de 8 destinos"
export function textoResultadoFiltro(mostrados, total) {
  return `Mostrando ${mostrados} de ${total} ${total === 1 ? 'destino' : 'destinos'}`
}
