// Validación de las respuestas de la API antes de guardarlas en caché y mostrarlas.
// Se revisan los campos que usan las vistas y su tipo; los campos extra (como __typename) se
// ignoran. Cada función devuelve true o false: los clientes convierten un false en un error
// "datos-incompletos", así una vista nunca recibe datos parciales

function esObjeto(valor) {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function esTexto(valor) {
  return typeof valor === 'string'
}

function esTextoONulo(valor) {
  return valor === null || esTexto(valor)
}

function esEntero(valor) {
  return Number.isInteger(valor)
}

function esIdValido(valor) {
  return Number.isInteger(valor) && valor > 0
}

function esEnteroNoNegativo(valor) {
  return Number.isInteger(valor) && valor >= 0
}

function esListaDe(valor, validarElemento) {
  return Array.isArray(valor) && valor.every(validarElemento)
}

// Revisa que objeto tenga cada campo del esquema con el tipo que corresponde
function cumpleEsquema(objeto, esquema) {
  return esObjeto(objeto) && Object.entries(esquema).every(([campo, validar]) => validar(objeto[campo]))
}

const ESQUEMA_DESTINO_LISTADO = {
  id: esIdValido,
  nombre: esTexto,
  pais: esTexto,
  descripcion: esTexto,
  actividades: (valor) => esListaDe(valor, esTexto),
}

const ESQUEMA_VUELO = {
  id: esIdValido,
  aerolinea: esTexto,
  origen: esTexto,
  llegada: esTexto,
  fechaIda: esTexto,
  horaSalidaIda: esTexto,
  horaLlegadaIda: esTexto,
  duracionIdaMinutos: esEntero,
  fechaVuelta: esTexto,
  horaSalidaVuelta: esTexto,
  horaLlegadaVuelta: esTexto,
  duracionVueltaMinutos: esEntero,
  escalas: esEnteroNoNegativo,
  precio: esEnteroNoNegativo,
  asientosDisponibles: esEnteroNoNegativo,
}

const ESQUEMA_HOTEL = {
  id: esIdValido,
  nombre: esTexto,
  estrellas: esEntero,
  zona: esTexto,
  fechaEntrada: esTexto,
  fechaSalida: esTexto,
  precioPorNoche: esEnteroNoNegativo,
  habitacionesDisponibles: esEnteroNoNegativo,
}

const ESQUEMA_DESTINO_OPCIONES = {
  id: esIdValido,
  nombre: esTexto,
  pais: esTexto,
  descripcion: esTexto,
  // Nullable en el esquema GraphQL: null cuando el destino tiene aeropuerto propio
  notaLlegada: esTextoONulo,
  vuelos: (valor) => esListaDe(valor, (vuelo) => cumpleEsquema(vuelo, ESQUEMA_VUELO)),
  hoteles: (valor) => esListaDe(valor, (hotel) => cumpleEsquema(hotel, ESQUEMA_HOTEL)),
}

// Listado REST de destinos. Una lista vacía es válida; un solo destino inválido invalida todo
export function validarListadoDestinos(datos) {
  return esListaDe(datos, (destino) => cumpleEsquema(destino, ESQUEMA_DESTINO_LISTADO))
}

// Destino de la consulta GraphQL OpcionesViaje (data.destino), con sus vuelos y hoteles
export function validarOpcionesViaje(destino) {
  return cumpleEsquema(destino, ESQUEMA_DESTINO_OPCIONES)
}
