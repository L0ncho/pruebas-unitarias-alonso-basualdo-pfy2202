# Decisiones técnicas

## Reutilización desde Librarte

AirFly partió de una copia del código de Librarte, mi proyecto de la semana 4 ([libreria-alonso-basualdo-pfy2202](https://github.com/L0ncho/libreria-alonso-basualdo-pfy2202)), sin su historial. Se conservó lo genérico, adaptado a AirFly, y se eliminó todo lo propio de la librería.

**Reutilizado y adaptado**
- Capa de datos REST: el cliente HTTP con caché, peticiones compartidas y cancelación ([`clienteHttp.js`](../src/services/clienteHttp.js)), [`useConsulta.js`](../src/hooks/useConsulta.js), [`normalizarError`](../src/utils/errores.js) (después extendido a Apollo) e [`ids.js`](../src/utils/ids.js).
- Navegación: [`useVolver.js`](../src/hooks/useVolver.js) y [`VolverArriba.jsx`](../src/components/VolverArriba.jsx).
- Componentes de interfaz: `Layout`, `Boton`, `Aviso`, `AvisoErrorConsulta`, `Cargando`, `TituloPagina` y el selector "Simulación de la API".
- Tema claro y oscuro (`BotonTema` y el script de `index.html`), con una paleta nueva.
- Configuración: GitHub Pages en [`vite.config.js`](../vite.config.js) (base y `404.html`), arranque de MSW en `main.jsx`, ESLint y la configuración de Vitest.

**Nuevo en AirFly**
- API GraphQL simulada con esquema real y Apollo Client 4: [`handlers.js`](../src/mocks/handlers.js), [`clienteApollo.js`](../src/services/clienteApollo.js), [`consultas.js`](../src/services/consultas.js), [`useOpcionesViaje.js`](../src/hooks/useOpcionesViaje.js) y la traducción de errores de Apollo.
- Página del destino ([`Destino.jsx`](../src/pages/Destino.jsx)) con vuelos, hoteles y la nota de llegada.
- Selección del viaje y cotización: [`viaje.js`](../src/utils/viaje.js), [`ResumenViaje.jsx`](../src/components/destino/ResumenViaje.jsx), [`GrupoOpciones.jsx`](../src/components/destino/GrupoOpciones.jsx), [`OpcionVuelo.jsx`](../src/components/destino/OpcionVuelo.jsx) y [`OpcionHotel.jsx`](../src/components/destino/OpcionHotel.jsx).
- Horarios de vuelo con husos horarios ([`HorarioTramo.jsx`](../src/components/destino/HorarioTramo.jsx) y `formatearDuracion`).
- Filtro de destinos en la URL ([`destinos.js`](../src/utils/destinos.js) y [`FiltroRegion.jsx`](../src/components/destinos/FiltroRegion.jsx)).
- Aviso de Service Worker no disponible y acceso seguro al almacenamiento ([`mock.js`](../src/utils/mock.js), [`MockNoDisponible.jsx`](../src/components/MockNoDisponible.jsx), [`almacenamiento.js`](../src/utils/almacenamiento.js) y [`tema.js`](../src/utils/tema.js)).
- Carga diferida de Apollo y del ejecutor de GraphQL.

## Diferencias con la guía del curso

| Guía | AirFly | Razón |
| --- | --- | --- |
| Create React App | Vite 8 | Create React App está descontinuado; Vite es la herramienta vigente |
| `process.env.PUBLIC_URL` | `import.meta.env.BASE_URL` | Es la forma de Vite de conocer la base del sitio |
| `react-router-dom` | `react-router` (v8) | Desde la v7 todo se importa desde `react-router`; `react-router-dom` ya no existe en la v8 |
| MSW solo en desarrollo | MSW en `dependencies` y activo en producción | GitHub Pages solo sirve archivos estáticos: sin el mock, el sitio publicado no tendría datos |
| Apollo Client 3 | Apollo Client 4 | Versión vigente. Cambian los imports (hooks y `ApolloProvider` desde `@apollo/client/react`), el cliente se configura con `link: new HttpLink(...)`, requiere `rxjs`, y `ApolloError` ya no existe: hay clases propias (`CombinedGraphQLErrors`, `ServerError`, `ServerParseError`) |
| `graphql` sin versión fija | `graphql` 16.15 | Es la serie que usa MSW 2: así queda una sola copia instalada (`npm ls graphql` lo confirma) |

## Capa de datos

- **Las páginas nunca llaman a `fetch` ni a Apollo:** usan hooks, que usan los servicios.
- **REST:** un único cliente HTTP con caché en memoria por URL, peticiones en curso compartidas entre consumidores y cancelación con `AbortController` en cada efecto. La petición de red se aborta solo cuando ya nadie la espera (el abort se difiere a una microtarea para que el doble efecto de StrictMode no la repita). Los errores nunca quedan en caché.
- **GraphQL:** Apollo Client con `InMemoryCache` normalizada por tipo e id y política `cache-first`. El `HttpLink` usa un `fetch` envoltorio que marca como `{ red: true }` solo el rechazo de `fetch`, igual que el cliente REST.
- **Errores comunes:** [`normalizarError`](../src/utils/errores.js) entrega `{ tipo, estado, mensaje }` (`red`, `no-encontrado`, `servidor`, `cancelado` o `desconocido`) para errores REST y de Apollo. No importa Apollo: reconoce sus errores por nombre y propiedades, porque la página de destinos (REST) también lo usa y no debe descargar Apollo. Una cancelación nunca se muestra como error.
- **Ids:** desde la URL se convierten solo con `convertirEntero` (entero positivo o `null`). Un id inválido no genera petición, y los handlers validan igual.

## Optimización de carga

- **Carga diferida por ruta:** cada página se descarga al visitarla (`lazy`).
- **Apollo solo en la página del destino:** [`ProveedorApollo`](../src/components/ProveedorApollo.jsx) recibe `children` y la página lo importa directamente. Así Apollo llega en el mismo archivo que la página, en una sola descarga, y no se carga en Inicio ni en Destinos. La caché no se pierde al salir de la página porque el cliente es único.
- **Ejecutor de GraphQL diferido:** el handler importa `buildSchema` y `graphql` con `import()` la primera vez que llega una consulta GraphQL. `main.jsx` espera a MSW antes del primer render, así que ese peso no retrasa la primera carga.
- **División en [`vite.config.js`](../vite.config.js):** MSW importa el analizador de `graphql` de forma estática, y sin configuración el empaquetador juntaba todo `graphql` (y `utils/ids.js`) en un archivo que se descargaba antes del primer render. Dos grupos lo separan: `graphql-lenguaje` (analizador, que comparten MSW y Apollo) y `graphql` (esquema, validación y ejecución, solo diferido).

Tamaños de `npm run build` (archivos JavaScript principales):

| Archivo | Contenido | Tamaño | gzip | Cuándo se descarga |
| --- | --- | --- | --- | --- |
| `index` | React, React Router, Layout, tema y aviso de Service Worker | 268,70 kB | 85,77 kB | Al abrir el sitio |
| `browser` | MSW, handlers y datos | 451,19 kB | 166,47 kB | Al abrir el sitio, antes del primer render |
| `graphql-lenguaje` | Analizador de GraphQL | 52,76 kB | 14,28 kB | Al abrir el sitio (lo importa MSW) |
| `graphql` | Esquema, validación y ejecución | 124,88 kB | 31,48 kB | Con la primera consulta GraphQL |
| `Destino` | Página del destino y Apollo Client | 169,09 kB | 51,64 kB | Al abrir un destino |
| `Destinos` | Página de destinos, filtro y cliente HTTP | 5,62 kB | 2,39 kB | Al abrir Destinos |
| `destinos` | Compartido por ambas páginas: `normalizarError`, filtro y avisos de error | 3,17 kB | 1,36 kB | Al abrir Destinos o un destino |

El resto son archivos menores de 1 kB. El build no muestra el aviso de archivos mayores a 500 kB.

## Estado

- **Cada estado vive donde se usa:** la selección del viaje en la página del destino (`useState`), el tema en `BotonTema`, el modo de simulación en `sessionStorage` (lo leen los handlers) y el filtro en la URL.
- **Se guardan ids, no objetos:** la selección guarda `vueloId` y `hotelId`. El vuelo y el hotel elegidos se buscan en los datos de la consulta actual, así una opción agotada o de otro destino nunca queda elegida.
- **Estado derivado:** las noches, los totales, si las fechas calzan, la anticipación recomendada y la lista filtrada se calculan en cada render con funciones puras ([`viaje.js`](../src/utils/viaje.js) y [`destinos.js`](../src/utils/destinos.js)).
- **`key` para reiniciar la selección:** el contenido del destino se renderiza con `key={id}` (id normalizado). Al cambiar de destino, React crea el componente de nuevo y la selección parte vacía, sin efectos. "7" y "007" dan la misma key.
- **Filtro en la URL:** `?region=nacionales` o `?region=internacionales` con `useSearchParams` y `replace: true`. Se puede compartir y sobrevive a la recarga; cambiarlo no llena el historial; un valor desconocido se trata como "Todos".

## Accesibilidad

- **Selección con radios nativos:** cada grupo (vuelos y hoteles) es un `fieldset` con su `legend` (que contiene un `h2`). El grupo es una sola parada de Tab, las flechas cambian la opción y el foco se ve en la tarjeta. Las opciones agotadas tienen el radio deshabilitado y la etiqueta "Agotado", sin atenuar el texto. El filtro de región usa el mismo patrón.
- **Nombres accesibles:** el radio de cada vuelo se nombra con la aerolínea y la ruta, y el resto de la tarjeta queda como descripción. Las estrellas se leen como "4 de 5 estrellas", y la flecha de las rutas y horarios como "a".
- **Regiones vivas:** `aria-live` en el total del resumen, la advertencia de fechas y el conteo del filtro; `aria-busy` en la región que se actualiza; `role="status"` en el indicador de carga y `role="alert"` en los errores.
- **Un `h1` por página**, título de pestaña por página y `aria-current` en el menú.
- **Contraste:** todos los pares de texto y fondo superan 4,5:1 en ambos temas (fórmula de luminancia relativa de WCAG):

| Par (texto / fondo) | Claro | Oscuro |
| --- | --- | --- |
| texto / fondo | 15,18 | 15,66 |
| texto / superficie | 16,26 | 13,88 |
| texto-suave / fondo | 6,22 | 9,12 |
| texto-suave / superficie | 6,66 | 8,08 |
| primario / fondo | 5,45 | 9,29 |
| primario / superficie | 5,84 | 8,23 |
| primario-oscuro / superficie | 9,13 | 11,06 |
| acento (precios) / superficie | 6,00 | 9,79 |
| alerta / superficie | 6,42 | 8,34 |
| peligro / superficie | 6,57 | 8,06 |
| sobre-primario / primario | 5,84 | 8,49 |
| sobre-primario / primario-oscuro | 9,13 | 11,42 |

## Aviso de Service Worker no disponible

Sin el mock, todas las consultas fallarían y se verían como "Sin conexión", lo que no explica el problema real. Por eso [`main.jsx`](../src/main.jsx) diagnostica el arranque con funciones puras de [`mock.js`](../src/utils/mock.js) y, si el mock no está activo, muestra [`MockNoDisponible`](../src/components/MockNoDisponible.jsx) **en lugar de** la aplicación (fuera del router: la misma pantalla en cualquier ruta).

| Estado | Cuándo | Aviso |
| --- | --- | --- |
| `sin-service-worker` | `navigator.serviceWorker` no existe (ventana privada de Firefox, sitio sin HTTPS) | "Este navegador no permite Service Workers" |
| `error-inicio` | El navegador no permitió cargar o iniciar el mock | "El navegador no permitió iniciar los datos simulados" |
| `error-carga` | El código del mock no se pudo descargar (red) | "No se pudieron descargar los datos simulados" |

**Hallazgo con el almacenamiento bloqueado:** en Chrome, con "No se permite guardar datos" para el sitio, aparecía "No se pudieron descargar los datos simulados… Revisa tu conexión a internet", aunque la conexión estaba bien. La causa: MSW crea su almacén de cookies al cargarse (`cookieStore.mjs`) y lee `localStorage` sin protección; con el almacenamiento bloqueado, Chrome lanza `SecurityError`, el `import()` del mock fallaba y se clasificaba como falla de descarga.

**Corrección:**
- `estadoMock` recibe los errores observados y solo clasifica como `error-carga` los que `esFallaDescargaModulo` reconoce como falla de descarga del módulo (un `TypeError` con el mensaje de Chrome y Edge, Firefox o Safari). Cualquier otro error al importar o al iniciar el worker es `error-inicio`.
- Todo acceso a `localStorage` y `sessionStorage` del proyecto pasa por [`almacenamiento.js`](../src/utils/almacenamiento.js), que captura el `SecurityError` (incluso al leer la propiedad `window.localStorage`) y usa los valores por defecto: modo de simulación normal y tema según el sistema. El script del tema en `index.html` también usa `try/catch`.

Las capturas de antes y después están en [pruebas](pruebas.md#errores-encontrados-y-corregidos).

**Limitación conocida de `esFallaDescargaModulo`:** reconoce la falla de descarga por el texto del mensaje de cada navegador, porque el estándar solo indica que es un `TypeError` y un error del propio código también puede serlo. Si un navegador usa otro texto, una falla de red real se mostraría como `error-inicio` ("El navegador no permitió iniciar…"). Es el caso más seguro: nunca se muestra "Revisa tu conexión" por un problema que no es de conexión, y el aviso igual ofrece recargar.

## Fuera de alcance y posibles mejoras

- **Reservas:** la actividad no pide mutaciones y la cotización no reserva nada. Si se agregaran, ya hay piezas preparadas:
  - La selección guarda `vueloId` y `hotelId`, que serían las variables de una mutación `reservarViaje`.
  - La caché normalizada de Apollo actualizaría sola los asientos y habitaciones disponibles de `Vuelo:id` y `Hotel:id` con la respuesta de la mutación.
  - El handler ya ejecuta cualquier operación contra el esquema: bastaría agregar el tipo `Mutation` y su resolutor.
  - `normalizarError` ya traduce los errores GraphQL por `extensions.code`.

  Habría que decidir dónde persisten las reservas, porque los datos del mock viven en memoria y se reinician al recargar.
- **Pasajeros y habitaciones:** el total es para 1 pasajero y 1 habitación; agregar cantidades cambiaría solo `totalViaje` y el resumen.
- **Búsqueda de texto** en los destinos y **atajos al resumen** en celular.
