import { delay, graphql, http, HttpResponse } from 'msw'
import { destinos, hoteles, vuelos } from './datos.js'
import { leerModoSimulacion, MODOS } from './simulacion.js'
import { convertirEntero } from '../utils/ids.js'

// Rutas relativas a la base del sitio, para que funcionen también en GitHub Pages
export const API = `${import.meta.env.BASE_URL}api`
export const ENDPOINT_GRAPHQL = `${import.meta.env.BASE_URL}graphql`

const DEMORA_MINIMA = 400
const DEMORA_MAXIMA = 900
export const DEMORA_LENTA = 4000

const MENSAJE_ERROR_SERVIDOR = 'El servidor tuvo un problema. Intenta nuevamente en unos momentos.'

function demoraNormal() {
  return DEMORA_MINIMA + Math.floor(Math.random() * (DEMORA_MAXIMA - DEMORA_MINIMA + 1))
}

// Simulación de la red, común a REST y GraphQL: lee el modo del selector del pie, espera la
// demora que corresponde y devuelve el modo. Cada API arma después su propia respuesta de falla.
// En el modo "sin respuesta" la espera nunca termina: el cliente la corta con su tiempo límite
export async function esperarRed() {
  const modo = leerModoSimulacion()
  if (modo === MODOS.sinRespuesta) await delay('infinite')
  await delay(modo === MODOS.lenta ? DEMORA_LENTA : demoraNormal())
  return modo
}

// Respuesta REST para los modos de falla; null si la petición debe responderse normal
export function respuestaFallaRest(modo) {
  if (modo === MODOS.sinConexion) {
    return HttpResponse.error()
  }
  if (modo === MODOS.errorServidor) {
    return HttpResponse.json({ mensaje: MENSAJE_ERROR_SERVIDOR }, { status: 500 })
  }
  return null
}

// Respuesta GraphQL para los modos de falla; null si la petición debe responderse normal.
// El error del servidor es un 500 con el arreglo errors y su extensions.code
export function respuestaFallaGraphql(modo) {
  if (modo === MODOS.sinConexion) {
    return HttpResponse.error()
  }
  if (modo === MODOS.errorServidor) {
    return HttpResponse.json(
      {
        errors: [
          { message: MENSAJE_ERROR_SERVIDOR, extensions: { code: 'INTERNAL_SERVER_ERROR' } },
        ],
      },
      { status: 500 },
    )
  }
  return null
}

// 404 REST con cuerpo { mensaje }
export function noEncontrado(mensaje) {
  return HttpResponse.json({ mensaje }, { status: 404 })
}

// Esquema de la API GraphQL. Las consultas se ejecutan de verdad contra él: se responden solo
// los campos pedidos, se agrega __typename si se pide y los errores llevan path y extensions.
// El argumento id es ID (texto) para validarlo con convertirEntero; los ids de los tipos son
// enteros, igual que en la API REST
const ESQUEMA = `
  type Query {
    destino(id: ID!): Destino
  }

  type Destino {
    id: Int!
    nombre: String!
    pais: String!
    descripcion: String!
    "Cómo se llega cuando el destino no tiene aeropuerto propio o sus vuelos son de temporada"
    notaLlegada: String
    actividades: [String!]!
    vuelos: [Vuelo!]!
    hoteles: [Hotel!]!
  }

  type Vuelo {
    id: Int!
    aerolinea: String!
    "Ciudad y código IATA del aeropuerto de salida"
    origen: String!
    "Ciudad y código IATA del aeropuerto de llegada"
    llegada: String!
    fechaIda: String!
    "Hora local del aeropuerto de origen (HH:MM)"
    horaSalidaIda: String!
    "Hora local del aeropuerto de llegada (HH:MM)"
    horaLlegadaIda: String!
    "Duración del tramo en minutos (con escalas): no se calcula restando horas por los husos horarios"
    duracionIdaMinutos: Int!
    fechaVuelta: String!
    horaSalidaVuelta: String!
    horaLlegadaVuelta: String!
    duracionVueltaMinutos: Int!
    escalas: Int!
    precio: Int!
    asientosDisponibles: Int!
  }

  type Hotel {
    id: Int!
    nombre: String!
    estrellas: Int!
    zona: String!
    fechaEntrada: String!
    fechaSalida: String!
    precioPorNoche: Int!
    habitacionesDisponibles: Int!
  }
`

// Resolutores de la raíz. Vuelos y hoteles se resuelven solo si la consulta los pide
function crearRaiz(GraphQLError) {
  return {
    destino({ id: idTexto }) {
      const id = convertirEntero(idTexto)
      if (id === null) {
        throw new GraphQLError(`El id de destino «${idTexto}» no es válido.`, {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      const destino = destinos.find((item) => item.id === id)
      if (!destino) {
        throw new GraphQLError(`No existe un destino con el id «${idTexto}».`, {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      return {
        ...destino,
        notaLlegada: destino.notaLlegada ?? null,
        vuelos: () => vuelos.filter((vuelo) => vuelo.destinoId === id),
        hoteles: () => hoteles.filter((hotel) => hotel.destinoId === id),
      }
    },
  }
}

// El ejecutor de GraphQL (graphql-js) se descarga recién con la primera consulta GraphQL:
// main.jsx espera a que inicie MSW antes de renderizar, y así ese peso no retrasa la primera
// carga de las páginas que no usan GraphQL. La promesa se guarda para cargarlo una sola vez
let ejecutorGraphql

function cargarEjecutorGraphql() {
  ejecutorGraphql ??= import('graphql').then(({ buildSchema, graphql: ejecutar, GraphQLError }) => {
    const schema = buildSchema(ESQUEMA)
    const rootValue = crearRaiz(GraphQLError)
    return (source, variableValues, operationName) =>
      ejecutar({ schema, source, rootValue, variableValues, operationName })
  })
  return ejecutorGraphql
}

// El listado REST entrega solo los campos que muestra la página de destinos
function resumenDestino({ id, nombre, pais, descripcion, actividades }) {
  return { id, nombre, pais, descripcion, actividades }
}

export const handlers = [
  // Listado de destinos con su país y actividades populares
  http.get(`${API}/destinos`, async () => {
    const falla = respuestaFallaRest(await esperarRed())
    if (falla) return falla

    return HttpResponse.json(destinos.map(resumenDestino))
  }),

  // Endpoint GraphQL único: cualquier operación se ejecuta contra el esquema
  graphql.link(ENDPOINT_GRAPHQL).operation(async ({ query, variables, operationName }) => {
    const falla = respuestaFallaGraphql(await esperarRed())
    if (falla) return falla

    const ejecutar = await cargarEjecutorGraphql()
    // Una consulta anónima llega con operationName vacío; graphql espera undefined
    const resultado = await ejecutar(query, variables, operationName || undefined)
    return HttpResponse.json(resultado)
  }),
]
