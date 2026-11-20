import {
  CombinedGraphQLErrors,
  ServerError,
  ServerParseError,
  UnconventionalError,
} from '@apollo/client/errors'
import { describe, expect, it } from 'vitest'
import {
  crearErrorDatosIncompletos,
  crearErrorTiempoAgotado,
  errorIdInvalido,
  normalizarError,
  TIPOS_ERROR,
  tituloError,
} from './errores.js'

describe('normalizarError', () => {
  it('una falla de red queda como "red" con su mensaje', () => {
    const error = normalizarError({ red: true })
    expect(error).toEqual({
      tipo: TIPOS_ERROR.red,
      estado: null,
      mensaje: expect.stringContaining('conexión'),
    })
  })

  it('un 404 queda como "no-encontrado" y usa el mensaje del servidor', () => {
    const error = normalizarError({ estado: 404, mensaje: 'No existe un destino con el id «99».' })
    expect(error).toEqual({
      tipo: TIPOS_ERROR.noEncontrado,
      estado: 404,
      mensaje: 'No existe un destino con el id «99».',
    })
  })

  it('un 404 sin mensaje del servidor usa el mensaje por defecto', () => {
    const error = normalizarError({ estado: 404, mensaje: '   ' })
    expect(error.tipo).toBe(TIPOS_ERROR.noEncontrado)
    expect(error.mensaje).toBe('No encontramos lo que buscas.')
  })

  it.each([500, 503])('un %i queda como "servidor"', (estado) => {
    const error = normalizarError({ estado })
    expect(error.tipo).toBe(TIPOS_ERROR.servidor)
    expect(error.estado).toBe(estado)
    expect(error.mensaje).toMatch(/servidor/)
  })

  it('un 500 usa el mensaje del servidor si viene', () => {
    const error = normalizarError({ estado: 500, mensaje: 'Base de datos en mantención.' })
    expect(error.mensaje).toBe('Base de datos en mantención.')
  })

  it('otro código HTTP queda como "desconocido" e incluye el código', () => {
    const error = normalizarError({ estado: 418 })
    expect(error.tipo).toBe(TIPOS_ERROR.desconocido)
    expect(error.estado).toBe(418)
    expect(error.mensaje).toContain('418')
  })

  it('un AbortError queda como "cancelado"', () => {
    const error = normalizarError(new DOMException('Abortado', 'AbortError'))
    expect(error.tipo).toBe(TIPOS_ERROR.cancelado)
  })

  it('un JSON inválido (SyntaxError) queda como "desconocido" con su mensaje', () => {
    const error = normalizarError(new SyntaxError('Unexpected token'))
    expect(error.tipo).toBe(TIPOS_ERROR.desconocido)
    expect(error.mensaje).toMatch(/formato válido/)
  })

  it('un TypeError del propio código queda como "desconocido", no como falla de red', () => {
    const error = normalizarError(new TypeError("Cannot read properties of undefined (reading 'id')"))
    expect(error.tipo).toBe(TIPOS_ERROR.desconocido)
    expect(error.mensaje).not.toMatch(/conexión/)
  })

  it('un error ya normalizado se devuelve igual', () => {
    const normalizado = { tipo: TIPOS_ERROR.servidor, estado: 500, mensaje: 'Falla' }
    expect(normalizarError(normalizado)).toBe(normalizado)
  })

  it.each([undefined, null, 'texto', 42])('%j queda como "desconocido"', (valor) => {
    expect(normalizarError(valor).tipo).toBe(TIPOS_ERROR.desconocido)
  })
})

describe('normalizarError con los tipos tiempo-agotado y datos-incompletos', () => {
  it('el error de tiempo agotado es un Error y queda como "tiempo-agotado"', () => {
    const marca = crearErrorTiempoAgotado()
    expect(marca).toBeInstanceOf(Error)
    expect(normalizarError(marca)).toEqual({
      tipo: TIPOS_ERROR.tiempoAgotado,
      estado: null,
      mensaje: 'El servidor tardó demasiado en responder. Intenta nuevamente.',
    })
  })

  it('un tiempo agotado nunca es "cancelado", aunque el error se llame AbortError', () => {
    const marca = Object.assign(new DOMException('Abortado', 'AbortError'), { tiempoAgotado: true })
    expect(normalizarError(marca).tipo).toBe(TIPOS_ERROR.tiempoAgotado)
  })

  it('el error de datos incompletos es un Error y queda como "datos-incompletos"', () => {
    const marca = crearErrorDatosIncompletos(new SyntaxError('Unexpected token'))
    expect(marca).toBeInstanceOf(Error)
    expect(marca.cause).toBeInstanceOf(SyntaxError)
    expect(normalizarError(marca)).toEqual({
      tipo: TIPOS_ERROR.datosIncompletos,
      estado: null,
      mensaje: expect.stringMatching(/incompleta/),
    })
  })
})

describe('normalizarError con errores de Apollo 4', () => {
  // Se construyen con las clases reales de Apollo, tal como las entrega el cliente
  function respuesta(estado) {
    return new Response('', { status: estado })
  }

  function erroresGraphql(code, message) {
    return new CombinedGraphQLErrors({
      data: { destino: null },
      errors: [{ message, path: ['destino'], extensions: { code } }],
    })
  }

  it.each(['NOT_FOUND', 'BAD_USER_INPUT'])(
    'CombinedGraphQLErrors con %s queda como "no-encontrado" con el mensaje del servidor',
    (code) => {
      expect(normalizarError(erroresGraphql(code, 'No existe un destino con el id «99».'))).toEqual({
        tipo: TIPOS_ERROR.noEncontrado,
        estado: null,
        mensaje: 'No existe un destino con el id «99».',
      })
    },
  )

  it('CombinedGraphQLErrors con INTERNAL_SERVER_ERROR queda como "servidor"', () => {
    const error = normalizarError(erroresGraphql('INTERNAL_SERVER_ERROR', 'Falla interna.'))
    expect(error).toEqual({ tipo: TIPOS_ERROR.servidor, estado: null, mensaje: 'Falla interna.' })
  })

  it('CombinedGraphQLErrors sin código conocido queda como "desconocido"', () => {
    const error = normalizarError(erroresGraphql('GRAPHQL_VALIDATION_FAILED', 'Campo inexistente.'))
    expect(error.tipo).toBe(TIPOS_ERROR.desconocido)
    expect(error.mensaje).toBe('Ocurrió un error inesperado. Intenta nuevamente.')
  })

  it('ServerError 500 queda como "servidor" con el mensaje del cuerpo GraphQL', () => {
    const cuerpo = JSON.stringify({
      errors: [{ message: 'El servidor tuvo un problema.', extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
    })
    const error = new ServerError('Response not successful', { response: respuesta(500), bodyText: cuerpo })

    expect(normalizarError(error)).toEqual({
      tipo: TIPOS_ERROR.servidor,
      estado: 500,
      mensaje: 'El servidor tuvo un problema.',
    })
  })

  it('ServerError 404 sin cuerpo queda como "no-encontrado" con el mensaje por defecto', () => {
    const error = new ServerError('Response not successful', { response: respuesta(404), bodyText: '' })
    expect(normalizarError(error)).toEqual({
      tipo: TIPOS_ERROR.noEncontrado,
      estado: 404,
      mensaje: 'No encontramos lo que buscas.',
    })
  })

  it('ServerParseError con 2xx queda como "datos-incompletos"', () => {
    const error = new ServerParseError(new SyntaxError('Unexpected token'), {
      response: respuesta(200),
      bodyText: '{ esto no es json',
    })
    expect(normalizarError(error)).toEqual({
      tipo: TIPOS_ERROR.datosIncompletos,
      estado: null,
      mensaje: expect.stringMatching(/incompleta/),
    })
  })

  it('ServerParseError con un código no 2xx usa ese código (500 queda como "servidor")', () => {
    // Apollo lo lanza así con el content-type application/graphql-response+json
    const error = new ServerParseError(new SyntaxError('Unexpected token'), {
      response: respuesta(500),
      bodyText: '<html>Error</html>',
    })
    expect(normalizarError(error)).toMatchObject({ tipo: TIPOS_ERROR.servidor, estado: 500 })
  })

  it('UnconventionalError queda como "desconocido"', () => {
    expect(normalizarError(new UnconventionalError(Symbol('raro'))).tipo).toBe(TIPOS_ERROR.desconocido)
  })

  it('la falla de red marcada por el cliente Apollo queda como "red"', () => {
    const error = Object.assign(new Error('No se pudo conectar con el servidor.'), { red: true })
    expect(normalizarError(error).tipo).toBe(TIPOS_ERROR.red)
  })

  it('una cancelación (AbortError que Apollo deja pasar) queda como "cancelado"', () => {
    expect(normalizarError(new DOMException('Abortado', 'AbortError')).tipo).toBe(TIPOS_ERROR.cancelado)
  })
})

describe('errorIdInvalido', () => {
  it('se informa como "no-encontrado" sin código HTTP', () => {
    expect(errorIdInvalido('No existe un destino con el id «abc».')).toEqual({
      tipo: TIPOS_ERROR.noEncontrado,
      estado: null,
      mensaje: 'No existe un destino con el id «abc».',
    })
  })
})

describe('tituloError', () => {
  it.each([
    [TIPOS_ERROR.red, 'Sin conexión'],
    [TIPOS_ERROR.noEncontrado, 'No encontrado'],
    [TIPOS_ERROR.servidor, 'Error del servidor'],
    [TIPOS_ERROR.tiempoAgotado, 'Tiempo agotado'],
    [TIPOS_ERROR.datosIncompletos, 'Datos incompletos'],
    [TIPOS_ERROR.desconocido, 'Error inesperado'],
    ['otro', 'Error inesperado'],
  ])('para %j devuelve %j', (tipo, esperado) => {
    expect(tituloError(tipo)).toBe(esperado)
  })
})
