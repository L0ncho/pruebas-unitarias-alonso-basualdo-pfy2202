# Decisiones técnicas

## Reutilización dentro del proyecto

Las dos páginas de datos (Destinos por REST y Destino por GraphQL) y las dos APIs comparten la mayor parte de su infraestructura. Así, un mismo error se muestra igual en ambas páginas, y cada regla está escrita una sola vez.

**Compartido entre las dos APIs**
- [`normalizarError`](../src/utils/errores.js) traduce los errores REST (por código HTTP) y los de Apollo (por clase y `extensions.code`) a `{ tipo, estado, mensaje }`, con los mismos mensajes.
- [`AvisoErrorConsulta.jsx`](../src/components/AvisoErrorConsulta.jsx) muestra cualquier error normalizado con su título y sus alternativas: Reintentar solo cuando sirve y siempre un enlace de salida.
- [`convertirEntero`](../src/utils/ids.js) valida los ids en las páginas y en los handlers de ambas APIs.
- `esperarRed()` en [`handlers.js`](../src/mocks/handlers.js) aplica la misma demora y el mismo modo de simulación a REST y a GraphQL; cada API arma solo su respuesta de falla.
- [`useOpcionesViaje.js`](../src/hooks/useOpcionesViaje.js) devuelve la misma forma que [`useConsulta.js`](../src/hooks/useConsulta.js) (`datos`, `cargando`, `error` y `reintentar`), así ambas páginas manejan carga, error y reintento de la misma manera.
- Los dos clientes marcan la falla de red igual (`{ red: true }`): solo el rechazo de `fetch` cuenta como "sin conexión".
- [`conTiempoLimite`](../src/services/tiempoLimite.js) es la única implementación del tiempo límite, que usan el cliente REST y el `fetch` del `HttpLink`. [`ahora()`](../src/services/reloj.js) es el único lugar que lee la hora, para la vigencia de ambas cachés.
- [`EstadoConsulta.jsx`](../src/components/EstadoConsulta.jsx) muestra la carga, el error y la lista vacía en las dos páginas de datos, y [`consulta.js`](../src/utils/consulta.js) calcula ese estado para cada API con funciones puras.

**Compartido entre páginas y componentes**
- Interfaz: `Layout` envuelve todas las páginas, y `Boton`, `Aviso`, `Cargando` y `TituloPagina` se usan en varias. Las clases de Tailwind que comparten varios componentes están en [`clases.js`](../src/styles/clases.js) (por ejemplo, las del botón y de las opciones elegibles).
- [`GrupoOpciones.jsx`](../src/components/destino/GrupoOpciones.jsx) agrupa tanto los vuelos como los hoteles, y [`HorarioTramo.jsx`](../src/components/destino/HorarioTramo.jsx) se usa en la tarjeta del vuelo y en el resumen.
- Navegación: [`useVolver.js`](../src/hooks/useVolver.js) en la página del destino y en la página no encontrada.
- Funciones puras de [`src/utils`](../src/utils): formato de precios, fechas y duraciones; cálculos del viaje; filtro de destinos; almacenamiento seguro.
- Reglas en un solo lugar: el nombre del sitio y el país de la agencia en [`sitio.js`](../src/config/sitio.js), que usan el filtro (Nacionales) y la anticipación recomendada (2 o 3 horas); los modos de simulación en [`simulacion.js`](../src/mocks/simulacion.js), que usan el selector del pie y los handlers.

## Herramientas y versiones

| Decisión | Razón |
| --- | --- |
| Vite 8 | Servidor de desarrollo rápido, compilación con división de archivos configurable y soporte directo para React y Tailwind v4 |
| `import.meta.env.BASE_URL`, leído solo en [`config/entorno.js`](../src/config/entorno.js) | Es la forma de Vite de conocer la base del sitio: la misma variable configura `BrowserRouter`, las rutas de las APIs y el registro del worker, para que todo funcione en la subcarpeta de GitHub Pages. El resto del código importa `BASE_URL` y `ES_DESARROLLO` desde ese archivo ([detalle](#pruebas)) |
| `react-router` v8 | Desde la v7 todo se importa desde `react-router`; en la v8 ya no existe `react-router-dom`. Se usa el modo declarativo con `BrowserRouter` |
| MSW en `dependencies` y activo en producción | GitHub Pages solo sirve archivos estáticos: sin el mock, el sitio publicado no tendría datos. Por eso MSW no puede ser una dependencia de desarrollo |
| Apollo Client 4 | Versión vigente. Los hooks y `ApolloProvider` se importan desde `@apollo/client/react`, el cliente se configura con `link: new HttpLink(...)`, requiere `rxjs`, y los errores tienen clases propias (`CombinedGraphQLErrors`, `ServerError`, `ServerParseError`) que `normalizarError` traduce |
| `graphql` 16.15 | Es la serie que usa MSW 2: así queda una sola copia instalada, compartida por MSW y Apollo (`npm ls graphql` lo confirma) |

## Capa de datos

- **Las páginas nunca llaman a `fetch` ni a Apollo:** usan hooks, que usan los servicios.
- **REST:** un único cliente HTTP con caché en memoria por URL, peticiones en curso compartidas entre consumidores y cancelación con `AbortController` en cada efecto. La petición de red se aborta solo cuando ya nadie la espera (el abort se difiere a una microtarea para que el doble efecto de StrictMode no la repita). Los errores nunca quedan en caché.
- **GraphQL:** Apollo Client con `InMemoryCache` normalizada por tipo e id y política `cache-first`. El `HttpLink` usa un `fetch` envoltorio que marca como `{ red: true }` solo el rechazo de `fetch`, igual que el cliente REST.
- **Tiempo límite (15 s, en [`api.js`](../src/config/api.js)):** cubre la petición y la lectura del cuerpo. Al vencer, se aborta la petición y el aviso es "Tiempo agotado" con Reintentar. Se distingue de una cancelación con una marca propia, no con `signal.reason`, y no usa `AbortSignal.any` (compatibilidad con Safari 16.4). En REST el plazo cubre la petición compartida: si un consumidor cancela, el otro sigue esperando hasta el plazo. La "respuesta lenta" de 4 s no lo activa.
- **Validación de las respuestas:** [`validacion.js`](../src/utils/validacion.js) revisa los campos que usan las vistas y su tipo (los nullables del esquema, como `notaLlegada`, aceptan `null`). Una respuesta inválida, o un JSON ilegible en una respuesta 2xx, da "Datos incompletos" con Reintentar; nunca una vista rota ni datos parciales, y un solo destino inválido invalida todo el listado. Se valida antes de guardar: en REST, antes de escribir en la caché; en GraphQL, en un `ApolloLink` anterior al `HttpLink`, así Apollo no escribe el dato en `InMemoryCache`. Una respuesta con `errors` (por ejemplo, `NOT_FOUND`) no se valida y sigue siendo "no encontrado".
- **Vencimiento de la caché (5 minutos desde que llega la respuesta, en [`api.js`](../src/config/api.js)):** un dato vigente no genera petición. Uno vencido se muestra al instante y se actualiza en segundo plano con `aria-busy`, como al reintentar, y se reemplaza sin parpadeo. Si la actualización falla, el dato sigue visible junto al aviso, igual que un reintento fallido, y la próxima visita lo vuelve a pedir. La vigencia se evalúa al entrar a la vista, no con un temporizador.
  - REST: cada entrada de la caché guarda `{ datos, recibidoEn }`; `leerCache` entrega el dato aunque haya vencido y `obtenerJson` lo pide de nuevo.
  - GraphQL: `InMemoryCache` no guarda la hora, así que un enlace anota cuándo llegó cada respuesta válida. Al entrar a un destino vencido, `useOpcionesViaje` usa `cache-and-network` con `nextFetchPolicy: 'cache-first'`: Apollo entrega la caché con `loading` y hace una sola petición, sin efectos propios que se repitan en StrictMode, y un error conserva los datos anteriores.
  - La selección guarda ids: si tras la actualización una opción ya no existe o se agotó, queda como no elegida.
- **Errores comunes:** [`normalizarError`](../src/utils/errores.js) entrega `{ tipo, estado, mensaje }` (`red`, `no-encontrado`, `servidor`, `tiempo-agotado`, `datos-incompletos`, `cancelado` o `desconocido`) para errores REST y de Apollo. Las marcas de tiempo agotado y datos incompletos son instancias de `Error`, porque Apollo 4 envuelve cualquier otro valor en `UnconventionalError`. No importa Apollo: reconoce sus errores por nombre y propiedades, porque la página de destinos (REST) también lo usa y no debe descargar Apollo. Una cancelación nunca se muestra como error.
- **Ids:** desde la URL se convierten solo con `convertirEntero` (entero positivo o `null`). Un id inválido no genera petición, y los handlers validan igual.

## Optimización de carga

- **Carga diferida por ruta:** cada página se descarga al visitarla (`lazy`).
- **Apollo solo en la página del destino:** [`ProveedorApollo`](../src/components/ProveedorApollo.jsx) recibe `children` y la página lo importa directamente. Así Apollo llega en el mismo archivo que la página, en una sola descarga, y no se carga en Inicio ni en Destinos. La caché no se pierde al salir de la página porque el cliente es único.
- **Ejecutor de GraphQL diferido:** el handler importa `buildSchema` y `graphql` con `import()` la primera vez que llega una consulta GraphQL. `main.jsx` espera a MSW antes del primer render, así que ese peso no retrasa la primera carga.
- **División en [`vite.config.js`](../vite.config.js):** MSW importa el analizador de `graphql` de forma estática, y sin configuración el empaquetador juntaba todo `graphql` (y `utils/ids.js`) en un archivo que se descargaba antes del primer render. Dos grupos lo separan: `graphql-lenguaje` (analizador, que comparten MSW y Apollo) y `graphql` (esquema, validación y ejecución, solo diferido).

Tamaños de `npm run build` (archivos JavaScript principales):

| Archivo | Contenido | Tamaño | gzip | Cuándo se descarga |
| --- | --- | --- | --- | --- |
| `index` | React, React Router, Layout, tema y aviso de Service Worker | 268,85 kB | 85,79 kB | Al abrir el sitio |
| `browser` | MSW, handlers y datos | 451,55 kB | 166,59 kB | Al abrir el sitio, antes del primer render |
| `graphql-lenguaje` | Analizador de GraphQL | 52,76 kB | 14,28 kB | Al abrir el sitio (lo importa MSW) |
| `graphql` | Esquema, validación y ejecución | 124,88 kB | 31,48 kB | Con la primera consulta GraphQL |
| `Destino` | Página del destino y Apollo Client | 169,94 kB | 51,96 kB | Al abrir un destino |
| `Destinos` | Página de destinos, filtro y cliente HTTP | 6,04 kB | 2,56 kB | Al abrir Destinos |
| `consulta` | Compartido por ambas páginas: `normalizarError`, estado de las consultas, filtro, formato y avisos de carga y error (`EstadoConsulta`) | 6,23 kB | 2,46 kB | Al abrir Destinos o un destino |

El resto son archivos menores de 1 kB. El build no muestra el aviso de archivos mayores a 500 kB.

## Estado

- **Cada estado vive donde se usa:** la selección del viaje en la página del destino (`useState`), el tema en `BotonTema`, el modo de simulación en `sessionStorage` (lo leen los handlers) y el filtro en la URL.
- **Se guardan ids, no objetos:** la selección guarda `vueloId` y `hotelId`. El vuelo y el hotel elegidos se buscan en los datos de la consulta actual, así una opción agotada o de otro destino nunca queda elegida.
- **Estado derivado:** las noches, los totales, si las fechas calzan, la anticipación recomendada y la lista filtrada se calculan en cada render con funciones puras ([`viaje.js`](../src/utils/viaje.js) y [`destinos.js`](../src/utils/destinos.js)).
- **`key` para reiniciar la selección:** el contenido del destino se renderiza con `key={id}` (id normalizado). Al cambiar de destino, React crea el componente de nuevo y la selección parte vacía, sin efectos. "7" y "007" dan la misma key.
- **Filtro en la URL:** `?region=nacionales` o `?region=internacionales` con `useSearchParams` y `replace: true`. Se puede compartir y sobrevive a la recarga; cambiarlo no llena el historial; un valor desconocido se trata como "Todos".

### Tema sin destello

El tema debe aplicarse antes del primer pintado, así que lo hace un script clásico y síncrono en el `<head>`, antes de que cargue React. Ese script se genera en [`tema.js`](../src/utils/tema.js) (`SCRIPT_TEMA_INICIAL`) con la misma clave (`airfly-tema`) y los mismos valores que usa `BotonTema`, y un plugin de [`vite.config.js`](../vite.config.js) (`transformIndexHtml`) lo inserta en `index.html` en desarrollo y al compilar. Así la clave y los valores tienen una sola fuente.

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
- Todo acceso a `localStorage` y `sessionStorage` del proyecto pasa por [`almacenamiento.js`](../src/utils/almacenamiento.js), que captura el `SecurityError` (incluso al leer la propiedad `window.localStorage`) y usa los valores por defecto: modo de simulación normal y tema según el sistema. El script del tema que se inserta en `index.html` también usa `try/catch`.

Las capturas de antes y después están en [pruebas](pruebas.md#errores-encontrados-y-corregidos).

**Limitación conocida de `esFallaDescargaModulo`:** reconoce la falla de descarga por el texto del mensaje de cada navegador, porque el estándar solo indica que es un `TypeError` y un error del propio código también puede serlo. Si un navegador usa otro texto, una falla de red real se mostraría como `error-inicio` ("El navegador no permitió iniciar…"). Es el caso más seguro: nunca se muestra "Revisa tu conexión" por un problema que no es de conexión, y el aviso igual ofrece recargar.

## Pruebas

| Decisión | Razón |
| --- | --- |
| Jest con Babel solo para las pruebas | El proyecto usa Vite, pero Jest no entiende ESM ni JSX por sí solo: `babel-jest` transforma el código a CommonJS con [`babel.config.cjs`](../babel.config.cjs). Vite no lee ese archivo (`@vitejs/plugin-react` 6 no usa Babel), así que `npm run dev` y `npm run build` no cambian |
| Entorno `jest-fixed-jsdom` | MSW 2 necesita los globales de Node (`fetch`, `Response`, streams, `BroadcastChannel`) y las condiciones de exportación de `msw/node`. El entorno jsdom estándar los oculta o resuelve la versión de navegador; `jest-fixed-jsdom` es jsdom con esos globales restaurados |
| [`config/entorno.js`](../src/config/entorno.js) como único lector de `import.meta.env` | `import.meta` no existe en CommonJS. Con un solo punto de lectura, `moduleNameMapper` lo reemplaza por [`test/entorno.js`](../src/test/entorno.js) (base `/`, sin modo desarrollo) y ningún otro archivo necesita cambios. Algunas dependencias leen `import.meta` (`react-router` consulta `import.meta.hot`): un plugin de Babel lo reemplaza por un objeto vacío, acotado a `node_modules` para no ocultar un uso nuevo en el código de la aplicación |
| `transformIgnorePatterns` con excepciones | Jest no transforma `node_modules` por defecto, pero `react-router`, `@apollo/client`, `rettime` y otras dependencias de MSW solo se publican como ESM (o se resuelven a su build `.mjs`). Se transforman solo esos paquetes y los `.mjs`, para no pagar el costo de transformar todo |
| Temporizadores falsos sin `nextTick` ni `queueMicrotask` | El cliente HTTP difiere el abort con `queueMicrotask` (para el doble efecto de StrictMode) y MSW y undici usan `process.nextTick`. Simularlos congelaría las respuestas; se simulan solo los temporizadores y, para el vencimiento de caché, solo `Date` |
| Servidor MSW único con los manejadores reales | Las pruebas usan los mismos manejadores que el navegador, con sus demoras, modos de falla y esquema GraphQL. No se simula `fetch` ni se usa `MockedProvider` de Apollo: esas alternativas probarían un contrato inventado, mientras que así se ejercitan los clientes reales, su caché, el tiempo límite y la validación. `onUnhandledRequest: 'error'` convierte una petición inesperada en una falla de la prueba |
| Cliente Apollo de la aplicación reiniciado entre pruebas | Las páginas montan el [`ProveedorApollo`](../src/components/ProveedorApollo.jsx) real con el cliente único de la aplicación, igual que en el navegador. El setup llama a `reiniciarClienteApollo()` (vacía la caché y las horas de recepción) después de cada prueba, así no hace falta un proveedor distinto para las pruebas ni cambiar el componente |
| Aislamiento de módulos en las pruebas de carga diferida | `React.lazy` guarda la página una vez cargada: sin aislar, "Cargando página…" solo se vería en la primera prueba del archivo. Cada prueba de ruta de [`App.test.jsx`](../src/App.test.jsx) corre dentro de `jest.isolateModulesAsync` con su propia copia de la aplicación, de React y de Testing Library, y no depende del orden |
| Prop `alRecargar` en [`MockNoDisponible`](../src/components/MockNoDisponible.jsx) | En jsdom `location.reload` no se puede reemplazar ni espiar (es una propiedad no configurable) y no implementa la navegación. La prop opcional, con `window.location.reload()` por defecto, deja el comportamiento del navegador igual y permite verificar el botón con `jest.fn()`, sin depender de mensajes internos de jsdom |
| Umbral de cobertura global | `coverageThreshold` en [`jest.config.cjs`](../jest.config.cjs) (80 % de statements, functions y lines; 70 % de branches) hace que `npm run test:coverage` falle si una modificación deja código sin probar. El umbral de ramas es menor porque algunas son defensivas o variantes que los datos del mock no producen ([detalle](pruebas.md#cobertura)) |

Estrategia, infraestructura y resultados en [pruebas](pruebas.md).

## Fuera de alcance y posibles mejoras

- **Reservas:** el sitio cotiza y no reserva, por eso la API no tiene mutaciones. Si se agregaran, ya hay piezas preparadas:
  - La selección guarda `vueloId` y `hotelId`, que serían las variables de una mutación `reservarViaje`.
  - La caché normalizada de Apollo actualizaría sola los asientos y habitaciones disponibles de `Vuelo:id` y `Hotel:id` con la respuesta de la mutación.
  - El handler ya ejecuta cualquier operación contra el esquema: bastaría agregar el tipo `Mutation` y su resolutor.
  - `normalizarError` ya traduce los errores GraphQL por `extensions.code`.

  Habría que decidir dónde persisten las reservas, porque los datos del mock viven en memoria y se reinician al recargar.
- **Pasajeros y habitaciones:** el total es para 1 pasajero y 1 habitación; agregar cantidades cambiaría solo `totalViaje` y el resumen.
- **Búsqueda de texto** en los destinos y **atajos al resumen** en celular.
