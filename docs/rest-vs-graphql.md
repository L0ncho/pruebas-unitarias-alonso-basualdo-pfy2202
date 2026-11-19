# REST frente a GraphQL

## Comparación general

| | REST | GraphQL |
| --- | --- | --- |
| Endpoints | Uno por recurso (`/api/destinos`) | Uno solo (`/graphql`) |
| Qué datos llegan | Los que define el servidor para ese recurso | Los que pide la consulta |
| Datos relacionados | Varias peticiones o un recurso armado a medida | Una consulta anidada en una sola petición |
| Errores | Código de estado HTTP (404, 500) | Arreglo `errors` en la respuesta, normalmente con HTTP 200 |
| Caché en el cliente | Natural por URL | Por consulta y variables, o normalizada por tipo e id |

Ninguno es mejor en todo: REST es más simple para un listado fijo y GraphQL conviene cuando una pantalla necesita datos relacionados y elegir los campos.

## Aplicado a AirFly

### Destinos por REST

El listado de destinos es un recurso fijo y simple: todos los destinos con los mismos cinco campos, que la página muestra completos. Una URL por recurso basta, y la caché por URL del cliente HTTP evita repetir la petición al volver a la página.

### Vuelos y hoteles por GraphQL

La página del destino necesita tres cosas relacionadas: los datos del destino, sus vuelos y sus hoteles. Con REST habrían sido tres peticiones (`/destinos/4`, `/destinos/4/vuelos` y `/destinos/4/hoteles`) o un recurso armado a medida para esta pantalla. Con GraphQL es **una sola petición anidada**:

```graphql
destino(id: $id) {
  id nombre pais descripcion notaLlegada
  vuelos { … }
  hoteles { … }
}
```

Además, **se piden solo los campos que se muestran**: el esquema expone `actividades` en `Destino`, pero la consulta `OpcionesViaje` no las pide porque la página del destino no las usa, y la respuesta no las trae. Lo verifica una prueba en [`handlers.test.js`](../src/mocks/handlers.test.js) ("responde solo los campos que pide la consulta").

## Diferencias reales encontradas

### Errores

- **REST:** el código HTTP define el tipo. El cliente HTTP ([`clienteHttp.js`](../src/services/clienteHttp.js)) convierte un 404 en "no encontrado" y un 500 en "servidor", y usa el `{ mensaje }` del cuerpo.
- **GraphQL:** un destino inexistente responde **HTTP 200** con `errors` y `extensions.code: "NOT_FOUND"`. El tipo sale del código, no del estado HTTP.
- **El 500 de GraphQL:** el modo "Error del servidor" responde HTTP 500 con un cuerpo GraphQL (`errors` con `INTERNAL_SERVER_ERROR`). Se esperaba que Apollo Client 4 lo entregara como `ServerError`, pero la prueba de integración mostró que lo entrega como **`CombinedGraphQLErrors`**, sin el código HTTP ([`clienteApollo.test.js`](../src/services/clienteApollo.test.js)). Por eso [`normalizarError`](../src/utils/errores.js) traduce ambos: `CombinedGraphQLErrors` según `extensions.code` y `ServerError` según su código HTTP.
- **Falla de red:** en ambos casos `fetch` rechaza. Los dos clientes la marcan igual (`{ red: true }`) para que un `TypeError` del propio código no se confunda con "sin conexión".

Con todo esto, `normalizarError` entrega `{ tipo, estado, mensaje }` con los mismos tipos y mensajes para ambas APIs, y la interfaz muestra los mismos avisos y alternativas.

### Caché

- **REST:** caché propia en memoria por URL ([`clienteHttp.js`](../src/services/clienteHttp.js)). Guarda la respuesta completa de `/api/destinos`; las peticiones en curso se comparten y los errores nunca se guardan.
- **GraphQL:** caché normalizada de Apollo (`InMemoryCache`): cada destino, vuelo y hotel se guarda una sola vez por tipo e id (`Destino`, `Vuelo`, `Hotel`). La política `cache-first` responde desde la caché al volver a un destino ya consultado; la prueba de integración verifica que no hay una segunda petición.
- **Ids equivalentes:** en ambas APIs, "7" y "007" usan la misma entrada de caché porque el id se normaliza antes de armar la URL o las variables.

### Reintento

- **REST:** `reintentar` de `useConsulta` pide de nuevo a la red aunque haya caché, y mientras tanto mantiene los datos anteriores.
- **GraphQL:** `reintentar` llama a `refetch()` de Apollo, que va a la red; Apollo mantiene `data` mientras tanto. El hook captura el rechazo de la promesa de `refetch`, porque el error ya llega por el campo `error` del hook.
- Ninguno de los dos ofrece Reintentar ante "no encontrado": reintentar no lo arregla.
