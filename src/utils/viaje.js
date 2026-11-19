import { esDestinoNacional } from './destinos.js'

// Cálculos de la cotización del viaje: funciones puras sobre los datos de la API.
// La cotización es para 1 pasajero y 1 habitación. Las fechas son ISO sin hora ("2026-12-15")

const MS_POR_DIA = 24 * 60 * 60 * 1000

// Noches entre dos fechas ISO. Se calculan en UTC para que el cambio de horario no afecte.
// Si la salida no es posterior a la entrada devuelve 0
export function calcularNoches(entrada, salida) {
  const noches = Math.round((Date.parse(salida) - Date.parse(entrada)) / MS_POR_DIA)
  return Number.isFinite(noches) && noches > 0 ? noches : 0
}

// Noches del viaje según el vuelo (entre la ida y la vuelta)
export function nochesViaje(vuelo) {
  return calcularNoches(vuelo.fechaIda, vuelo.fechaVuelta)
}

// Noches de hotel según la estadía
export function nochesHotel(hotel) {
  return calcularNoches(hotel.fechaEntrada, hotel.fechaSalida)
}

// Total de la estadía: precio por noche por la cantidad de noches
export function totalEstadia(hotel) {
  return hotel.precioPorNoche * nochesHotel(hotel)
}

// Total estimado del viaje con lo que esté elegido (vuelo, hotel o ambos; null si falta)
export function totalViaje(vuelo, hotel) {
  return (vuelo ? vuelo.precio : 0) + (hotel ? totalEstadia(hotel) : 0)
}

// La estadía calza con el vuelo si queda dentro del viaje: entra el día de la ida o después y
// sale el día de la vuelta o antes. Las fechas ISO se comparan como texto
export function fechasCalzan(vuelo, hotel) {
  return hotel.fechaEntrada >= vuelo.fechaIda && hotel.fechaSalida <= vuelo.fechaVuelta
}

// Una opción se puede elegir si le queda al menos un asiento o una habitación
export function estaDisponible(cantidad) {
  return Number.isInteger(cantidad) && cantidad > 0
}

// Anticipación recomendada para llegar al aeropuerto: 2 horas en vuelos nacionales y 3 en
// internacionales. Se decide por el país del destino
export function horasAnticipacionAeropuerto(pais) {
  return esDestinoNacional(pais) ? 2 : 3
}
