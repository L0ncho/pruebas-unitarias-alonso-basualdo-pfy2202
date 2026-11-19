// Normalización de errores de la API a { tipo, estado, mensaje }.
// tipo: red | no-encontrado | servidor | cancelado | desconocido
export const TIPOS_ERROR = {
  red: 'red',
  noEncontrado: 'no-encontrado',
  servidor: 'servidor',
  cancelado: 'cancelado',
  desconocido: 'desconocido',
}

const MENSAJES = {
  red: 'No pudimos conectarnos con AirFly. Revisa tu conexión a internet e intenta nuevamente.',
  noEncontrado: 'No encontramos lo que buscas.',
  servidor: 'El servidor tuvo un problema. Intenta nuevamente en unos momentos.',
  cancelado: 'La consulta se canceló.',
  formatoInvalido: 'La respuesta del servidor no tiene un formato válido.',
  desconocido: 'Ocurrió un error inesperado. Intenta nuevamente.',
}

const TITULOS = {
  [TIPOS_ERROR.red]: 'Sin conexión',
  [TIPOS_ERROR.noEncontrado]: 'No encontrado',
  [TIPOS_ERROR.servidor]: 'Error del servidor',
  [TIPOS_ERROR.desconocido]: 'Error inesperado',
}

const tiposValidos = new Set(Object.values(TIPOS_ERROR))

function crear(tipo, estado, mensaje) {
  return { tipo, estado, mensaje }
}

function esNormalizado(error) {
  return typeof error === 'object' && error !== null && tiposValidos.has(error.tipo)
}

function mensajeOPorDefecto(mensaje, porDefecto) {
  return typeof mensaje === 'string' && mensaje.trim() !== '' ? mensaje : porDefecto
}

// Códigos de extensions.code de la API GraphQL y el tipo en que se traducen
const TIPO_POR_CODIGO_GRAPHQL = {
  NOT_FOUND: TIPOS_ERROR.noEncontrado,
  BAD_USER_INPUT: TIPOS_ERROR.noEncontrado,
  INTERNAL_SERVER_ERROR: TIPOS_ERROR.servidor,
}

// Errores de Apollo Client 4. Se reconocen por name y sus propiedades, sin importar Apollo:
// este archivo lo usa también el cliente REST, que no debe cargar Apollo
function esErrorApollo(error, nombre) {
  return typeof error === 'object' && error !== null && error.name === nombre
}

// Primer mensaje del arreglo errors de un cuerpo GraphQL en texto (de un ServerError)
function mensajeCuerpoGraphql(texto) {
  try {
    const mensaje = JSON.parse(texto)?.errors?.[0]?.message
    return typeof mensaje === 'string' ? mensaje : undefined
  } catch {
    return undefined
  }
}

// CombinedGraphQLErrors: errores en el arreglo errors de una respuesta 200. Manda el primer
// error con extensions.code; un código no previsto queda como "desconocido"
function normalizarErroresGraphql(errores) {
  const conCodigo = errores.find((item) => typeof item?.extensions?.code === 'string')
  const tipo = TIPO_POR_CODIGO_GRAPHQL[conCodigo?.extensions.code] ?? TIPOS_ERROR.desconocido
  const mensaje = conCodigo?.message

  if (tipo === TIPOS_ERROR.noEncontrado) {
    return crear(tipo, null, mensajeOPorDefecto(mensaje, MENSAJES.noEncontrado))
  }
  if (tipo === TIPOS_ERROR.servidor) {
    return crear(tipo, null, mensajeOPorDefecto(mensaje, MENSAJES.servidor))
  }
  return crear(TIPOS_ERROR.desconocido, null, MENSAJES.desconocido)
}

// Acepta:
// - un error ya normalizado (se devuelve igual)
// - { red: true }: los clientes REST y Apollo lo usan solo cuando fetch rechaza (falla de red)
// - { estado, mensaje }: respuesta HTTP no exitosa; si el servidor envió un mensaje, se usa ese
// - un AbortError (cancelación) o un SyntaxError (JSON inválido)
// - errores de Apollo 4: CombinedGraphQLErrors (según extensions.code), ServerError (según su
//   código HTTP, igual que REST) y ServerParseError (formato inválido)
// Cualquier otro error, incluido un TypeError del propio código, queda como "desconocido"
// para no pedir al usuario que revise su conexión ante un error de programación
export function normalizarError(error) {
  if (esNormalizado(error)) return error

  if (error?.name === 'AbortError') {
    return crear(TIPOS_ERROR.cancelado, null, MENSAJES.cancelado)
  }

  if (error?.red === true) {
    return crear(TIPOS_ERROR.red, null, MENSAJES.red)
  }

  if (esErrorApollo(error, 'CombinedGraphQLErrors') && Array.isArray(error.errors)) {
    return normalizarErroresGraphql(error.errors)
  }

  if (esErrorApollo(error, 'ServerError') && Number.isInteger(error.statusCode)) {
    return normalizarError({
      estado: error.statusCode,
      mensaje: mensajeCuerpoGraphql(error.bodyText),
    })
  }

  if (esErrorApollo(error, 'ServerParseError')) {
    return crear(TIPOS_ERROR.desconocido, null, MENSAJES.formatoInvalido)
  }

  if (Number.isInteger(error?.estado)) {
    const { estado, mensaje } = error
    if (estado === 404) {
      return crear(TIPOS_ERROR.noEncontrado, estado, mensajeOPorDefecto(mensaje, MENSAJES.noEncontrado))
    }
    if (estado >= 500) {
      return crear(TIPOS_ERROR.servidor, estado, mensajeOPorDefecto(mensaje, MENSAJES.servidor))
    }
    return crear(
      TIPOS_ERROR.desconocido,
      estado,
      mensajeOPorDefecto(mensaje, `Ocurrió un error inesperado (código ${estado}). Intenta nuevamente.`),
    )
  }

  if (error instanceof SyntaxError) {
    return crear(TIPOS_ERROR.desconocido, null, MENSAJES.formatoInvalido)
  }

  return crear(TIPOS_ERROR.desconocido, null, MENSAJES.desconocido)
}

// Un id inválido en la URL no genera petición, pero se informa igual que un 404:
// el recurso no existe y reintentar no lo arregla
export function errorIdInvalido(mensaje) {
  return crear(TIPOS_ERROR.noEncontrado, null, mensajeOPorDefecto(mensaje, MENSAJES.noEncontrado))
}

// Título corto para mostrar sobre el mensaje de error
export function tituloError(tipo) {
  return TITULOS[tipo] ?? TITULOS[TIPOS_ERROR.desconocido]
}
