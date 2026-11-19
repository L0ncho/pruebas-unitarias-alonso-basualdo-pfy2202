# API simulada

AirFly no tiene un servidor propio: las dos APIs se simulan en el navegador con MSW 2 (Mock Service Worker). Un Service Worker intercepta las peticiones del sitio y responde con los datos de [`datos.js`](../src/mocks/datos.js) según los handlers de [`handlers.js`](../src/mocks/handlers.js).

Las rutas son relativas a la base del sitio (`import.meta.env.BASE_URL`): en desarrollo, `/api/…` y `/graphql`; en GitHub Pages, `/viajes-alonso-basualdo-pfy2202/api/…` y `/viajes-alonso-basualdo-pfy2202/graphql`.

Cada respuesta espera entre 400 y 900 ms (4 s en el modo lento) para que se vean los indicadores de carga.

## API REST

### `GET /api/destinos`

Listado de destinos con su país y sus actividades populares. Entrega solo los campos que muestra la página de destinos.

Respuesta `200` (8 destinos; se muestra el primero):

```json
[
  {
    "id": 1,
    "nombre": "San Pedro de Atacama",
    "pais": "Chile",
    "descripcion": "Un oasis en el desierto más árido del mundo, rodeado de salares, géiseres y volcanes. Sus cielos despejados lo hacen ideal para mirar las estrellas.",
    "actividades": [
      "Géiseres del Tatio al amanecer",
      "Valle de la Luna",
      "Observación astronómica",
      "Lagunas altiplánicas"
    ]
  }
]
```

Errores:

| Caso | Respuesta |
| --- | --- |
| Error del servidor (modo de simulación) | `500` con `{ "mensaje": "El servidor tuvo un problema. Intenta nuevamente en unos momentos." }` |
| Sin conexión (modo de simulación) | Falla de red: `fetch` rechaza, sin respuesta HTTP |

El detalle de cada destino no es un recurso REST: va por GraphQL junto con sus vuelos y hoteles.

## API GraphQL

Un solo endpoint, `POST /graphql`. Cada consulta se ejecuta de verdad contra el esquema con `graphql-js`: se responden solo los campos pedidos, se agrega `__typename` cuando el cliente lo pide (Apollo lo hace para su caché) y los errores salen con `path` y `extensions.code`, como en un servidor real.

### Esquema

```graphql
type Query {
  destino(id: ID!): Destino
}

type Destino {
  id: Int!
  nombre: String!
  pais: String!
  descripcion: String!
  notaLlegada: String          # cómo se llega si no hay aeropuerto propio o los vuelos son de temporada
  actividades: [String!]!
  vuelos: [Vuelo!]!
  hoteles: [Hotel!]!
}

type Vuelo {
  id: Int!
  aerolinea: String!
  origen: String!              # ciudad y código IATA, por ejemplo "Santiago (SCL)"
  llegada: String!
  fechaIda: String!            # fecha ISO sin hora
  horaSalidaIda: String!       # HH:MM, hora local del aeropuerto de origen
  horaLlegadaIda: String!      # HH:MM, hora local del aeropuerto de llegada
  duracionIdaMinutos: Int!
  fechaVuelta: String!
  horaSalidaVuelta: String!
  horaLlegadaVuelta: String!
  duracionVueltaMinutos: Int!
  escalas: Int!
  precio: Int!                 # CLP por persona, ida y vuelta
  asientosDisponibles: Int!
}

type Hotel {
  id: Int!
  nombre: String!
  estrellas: Int!
  zona: String!
  fechaEntrada: String!
  fechaSalida: String!
  precioPorNoche: Int!         # CLP por habitación
  habitacionesDisponibles: Int!
}
```

El argumento `id` es `ID` (texto) para que el servidor lo valide con [`convertirEntero`](../src/utils/ids.js): "7" y "007" son el mismo destino. Los ids de los tipos son enteros, igual que en la API REST.

### Consulta `OpcionesViaje`

Definida en [`consultas.js`](../src/services/consultas.js). Trae en una sola petición los datos del destino que muestra su página, sus vuelos y sus hoteles. No pide `actividades`, que la página del destino no muestra.

```graphql
query OpcionesViaje($id: ID!) {
  destino(id: $id) {
    id
    nombre
    pais
    descripcion
    notaLlegada
    vuelos {
      id
      aerolinea
      origen
      llegada
      fechaIda
      horaSalidaIda
      horaLlegadaIda
      duracionIdaMinutos
      fechaVuelta
      horaSalidaVuelta
      horaLlegadaVuelta
      duracionVueltaMinutos
      escalas
      precio
      asientosDisponibles
    }
    hoteles {
      id
      nombre
      estrellas
      zona
      fechaEntrada
      fechaSalida
      precioPorNoche
      habitacionesDisponibles
    }
  }
}
```

Variables: `{ "id": "4" }`. El hook las arma con el id ya normalizado (`"007"` se envía como `"7"`), así ambos comparten la entrada de caché.

Respuesta `200` para Valparaíso (se muestra un vuelo y un hotel de cada lista):

```json
{
  "data": {
    "destino": {
      "id": 4,
      "nombre": "Valparaíso",
      "pais": "Chile",
      "descripcion": "Ciudad puerto de cerros coloridos, ascensores históricos y murales. Patrimonio de la Humanidad.",
      "notaLlegada": "Valparaíso no tiene aeropuerto comercial: los vuelos llegan a Santiago, a unos 120 km. El traslado terrestre no está incluido.",
      "vuelos": [
        {
          "id": 108,
          "aerolinea": "Cóndor Air",
          "origen": "Antofagasta (ANF)",
          "llegada": "Santiago (SCL)",
          "fechaIda": "2026-12-28",
          "horaSalidaIda": "08:05",
          "horaLlegadaIda": "10:10",
          "duracionIdaMinutos": 125,
          "fechaVuelta": "2027-01-02",
          "horaSalidaVuelta": "19:20",
          "horaLlegadaVuelta": "21:25",
          "duracionVueltaMinutos": 125,
          "escalas": 0,
          "precio": 149990,
          "asientosDisponibles": 10
        }
      ],
      "hoteles": [
        {
          "id": 209,
          "nombre": "Casa Cerro Alegre",
          "estrellas": 4,
          "zona": "Cerro Alegre",
          "fechaEntrada": "2026-12-28",
          "fechaSalida": "2027-01-02",
          "precioPorNoche": 115000,
          "habitacionesDisponibles": 1
        }
      ]
    }
  }
}
```

### Errores

Los errores de la consulta van en el arreglo `errors` con `extensions.code`, y `data.destino` queda en `null`:

| Caso | HTTP | `extensions.code` | Mensaje |
| --- | --- | --- | --- |
| Destino inexistente (`"99"`) | 200 | `NOT_FOUND` | "No existe un destino con el id «99»." |
| Id inválido (`"abc"`, `"0"`, `"1.5"`) | 200 | `BAD_USER_INPUT` | "El id de destino «abc» no es válido." |
| Error del servidor (modo de simulación) | 500 | `INTERNAL_SERVER_ERROR` | "El servidor tuvo un problema. Intenta nuevamente en unos momentos." |
| Sin conexión (modo de simulación) | — | — | Falla de red: `fetch` rechaza |

Ejemplo de destino inexistente:

```json
{
  "errors": [
    {
      "message": "No existe un destino con el id «99».",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["destino"],
      "extensions": { "code": "NOT_FOUND" }
    }
  ],
  "data": { "destino": null }
}
```

En la interfaz, un id inválido en la URL no llega a la API: la página lo detecta con `convertirEntero` y muestra "Destino no encontrado" sin hacer la petición. El handler lo valida igual, para que la regla no dependa de la interfaz.

## Modos de simulación

El selector **"Simulación de la API"** del pie guarda el modo en `sessionStorage` (clave `airfly-simulacion`) y los handlers lo leen en cada petición, así que el cambio aplica desde la siguiente petición sin recargar. La lógica común está en `esperarRed()`; cada API arma su propia respuesta de falla.

| Modo | REST (`/api/destinos`) | GraphQL (`/graphql`) | Lo que muestra la interfaz |
| --- | --- | --- | --- |
| Normal | 200 con los datos (400 a 900 ms) | 200 con `data` (400 a 900 ms) | Los datos |
| Error del servidor (500) | 500 con `{ mensaje }` | 500 con `errors` e `INTERNAL_SERVER_ERROR` | "Error del servidor", con Reintentar y un enlace de salida |
| Sin conexión | Falla de red | Falla de red | "Sin conexión", con Reintentar y un enlace de salida |
| Respuesta lenta (4 s) | 200 tras 4 s | 200 tras 4 s | Indicador de carga con el título ya visible |

Lo ya consultado queda en caché (la del cliente HTTP para REST y la de Apollo para GraphQL): para ver un error hay que abrir algo no visitado o recargar la página.

Si el almacenamiento está bloqueado, el modo queda en "Normal" ([`almacenamiento.js`](../src/utils/almacenamiento.js)).

## Escenarios en los datos

| Escenario | Dónde | Lo que muestra la interfaz |
| --- | --- | --- |
| Destino sin oferta | Madrid (id 8): sin vuelos ni hoteles | "Sin vuelos ni hoteles disponibles", con enlace a otros destinos |
| Opciones agotadas | 4 de los 16 vuelos con `asientosDisponibles: 0` y 4 de los 18 hoteles con `habitacionesDisponibles: 0` | Etiqueta "Agotado" y radio deshabilitado |
| Destinos sin aeropuerto propio | San Pedro de Atacama (llega a Calama, CJC) y Valparaíso (llega a Santiago, SCL) | Nota "Cómo llegar" con la distancia y que el traslado no está incluido |
| Vuelos de temporada | Puerto Natales (PNT) | Nota "Cómo llegar" sobre la temporada alta |
| Estadías y vuelos | Cada estadía calza con al menos un vuelo de su destino; otras no | Advertencia en el resumen cuando no calzan |
| Horarios con husos horarios | Rapa Nui, Cusco y Cancún (UTC−5) frente a Chile continental y Buenos Aires (UTC−3) en verano | Horas locales de cada aeropuerto y duración de cada tramo |

**Horarios:** las horas son locales de cada aeropuerto y la duración de cada tramo es un dato, no se calcula restando horas, porque los husos horarios son distintos. La coherencia se verifica en [`handlers.test.js`](../src/mocks/handlers.test.js): para cada uno de los 16 vuelos, la hora local de salida más la duración más la diferencia horaria entre ambos aeropuertos debe dar la hora local de llegada, y ningún tramo puede pasar de la medianoche (así la regla de fechas del resumen sigue siendo válida). Otra prueba verifica que un vuelo con escalas dura más que uno directo de la misma ruta.

## MSW en producción y arranque del worker

- **MSW está en `dependencies` y activo también en producción.** GitHub Pages solo sirve archivos estáticos: sin el mock, el sitio publicado no tendría datos. Por eso MSW no es una dependencia de desarrollo y el worker se inicia también en el sitio publicado.
- **Arranque** en [`main.jsx`](../src/main.jsx): la aplicación se renderiza después de `worker.start()`, para que ninguna petición se adelante al worker. MSW se importa de forma diferida, en un archivo propio que el navegador reutiliza desde su caché.
- **Registro con la base del sitio** en [`browser.js`](../src/mocks/browser.js): `url` `${BASE_URL}mockServiceWorker.js` y `scope` `BASE_URL`, con `onUnhandledRequest: 'bypass'` (las peticiones que no son de la API siguen a la red). `mockServiceWorker.js` vive en `public/` y se genera con `npx msw init public`.
- **Si el mock no puede arrancar**, se muestra un aviso específico en lugar de la aplicación ([`MockNoDisponible.jsx`](../src/components/MockNoDisponible.jsx)): el navegador no permite Service Workers, no permitió iniciarlos o no se pudo descargar el código del mock. Detalle en [decisiones técnicas](decisiones-tecnicas.md#aviso-de-service-worker-no-disponible).
