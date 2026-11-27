# Pruebas

## Resumen

**470 pruebas en 36 archivos, todas aprobadas.** Cobertura total: Stmts 98,59 %, Branch 95,71 %, Funcs 98,51 % y Lines 99,41 % (umbral: 80 % en Stmts, Funcs y Lines, y 70 % en Branch).

```bash
npm test                # todas las pruebas
npm run test:watch      # modo observación: repite las pruebas afectadas al guardar
npm run test:coverage   # pruebas con reporte de cobertura y umbral mínimo
```

`npm run test:coverage` muestra la tabla en la terminal y genera el reporte HTML en `coverage/` (ignorado por git). Para verlo, abre `coverage/index.html` en el navegador: permite recorrer cada archivo con las líneas y ramas sin cubrir marcadas.

## Índice

- [Resumen](#resumen)
- [Herramientas](#herramientas)
- [Estrategia por capas](#estrategia-por-capas)
- [Escenarios cubiertos en las páginas](#escenarios-cubiertos-en-las-páginas)
- [Infraestructura de pruebas](#infraestructura-de-pruebas)
- [Archivos de prueba](#archivos-de-prueba)
- [Cobertura](#cobertura)
- [Matriz de pruebas en navegadores](#matriz-de-pruebas-en-navegadores)
- [Errores encontrados y corregidos](#errores-encontrados-y-corregidos)

## Herramientas

| Herramienta | Versión | Qué aporta |
| --- | --- | --- |
| Jest | 30.5 | Ejecutor de las pruebas, aserciones (`expect`), funciones espía (`jest.fn`, `jest.spyOn`), temporizadores falsos y reporte de cobertura |
| React Testing Library | 16.3 | Renderiza los componentes en jsdom y los consulta como los ve el usuario: por rol, nombre accesible, etiqueta o texto |
| user-event | 14.6 | Interacciones realistas (clic, teclado, selección en un `select`), con la secuencia completa de eventos que produce un navegador |
| jest-dom | 8.0 | Aserciones sobre el DOM: `toBeInTheDocument`, `toBeChecked`, `toBeDisabled`, `toHaveAttribute`, `toHaveTextContent`… |
| MSW | 2.15 | Responde las peticiones REST y GraphQL en Node con los mismos manejadores que usa el navegador |

Cómo se complementan: Jest ejecuta y mide; React Testing Library y user-event montan la interfaz y actúan como un usuario; jest-dom expresa lo que el usuario debería ver; MSW pone detrás una API con el mismo comportamiento que la del sitio publicado (demoras, modos de falla, 404, validación del esquema GraphQL). Así una prueba de página recorre el código real de punta a punta: componente → hook → servicio → `fetch` → manejador → datos, sin simular `fetch` ni Apollo.

## Estrategia por capas

| Capa | Qué cubre | Por qué |
| --- | --- | --- |
| Lógica (`services`, `utils`, `mocks`) | Funciones puras, clientes REST y Apollo contra los manejadores reales, tiempo límite, caché y su vencimiento, normalización de errores, validación, datos del mock | Son las reglas de negocio y de red: se prueban con todos sus casos límite sin el costo de renderizar |
| Componentes con lógica propia | Variantes y estados que una página no alcanza: tipos de aviso, todos los tipos de error, preferencia de tema del sistema, diagnósticos del mock, teclado en el filtro | Cada combinación se verifica una vez, aislada y rápida |
| Hooks | `useConsulta` (carga, éxito, error, reintento, caché vigente, cancelación al desmontar y al cambiar de recurso), `useDestinos` y `useVolver` | Su contrato (`datos`, `cargando`, `error`, `reintentar`) lo usan varias páginas; `renderHook` permite revisar cada estado intermedio |
| Páginas | Flujos completos: REST en Destinos, GraphQL en Destino y la página no encontrada | Es lo que hace el usuario: confirma que las capas encajan, con datos reales del mock y los modos de simulación de la interfaz |
| Navegación | Cada ruta dentro del `Layout` con carga diferida, enlace activo, título de la pestaña, Volver y subir al inicio al navegar | Las rutas y el historial unen las páginas; un error aquí rompe todo el recorrido |

**Criterio para los componentes:** un componente tiene su propio archivo de pruebas cuando tiene lógica que no se alcanza desde las páginas (variantes, valores por defecto, casos que la API simulada no produce). Los demás (`Layout`, `ProveedorApollo`, `EncabezadoDestino`, `GrupoOpciones`, `OpcionVuelo`, `OpcionHotel`, `HorarioTramo`, `ResumenViaje` e `Inicio`) se prueban a través de las páginas, donde se usan con datos reales.

Todas las consultas de la interfaz son por rol, etiqueta o texto accesible; no hay `data-testid`. Tampoco hay snapshots: cada prueba verifica un comportamiento concreto.

## Escenarios cubiertos en las páginas

| Escenario | Destinos (REST) | Destino (GraphQL) |
| --- | --- | --- |
| Carga | Indicador "Cargando destinos…" y luego las 8 tarjetas con sus enlaces al detalle | Indicador "Cargando vuelos y hoteles…" y luego el encabezado, vuelos y hoteles; opciones agotadas deshabilitadas |
| Filtro | `?region=` al elegir región, URL que abre filtrada, volver a "Todos", región desconocida y región sin resultados | — |
| Selección y cotización | — | Dos combinaciones de vuelo y hotel con noches y total según [`viaje.js`](../src/utils/viaje.js), fechas que no calzan, anticipación de 2 h (nacional) y 3 h (internacional), Limpiar selección |
| Error del servidor | Aviso con Reintentar; al volver a "Normal" en el selector se recupera | Igual |
| Sin conexión | Aviso con Reintentar que se recupera | Igual |
| Datos incompletos | Respuesta con estructura inválida (`server.use`): aviso sin romper la página y Reintentar | Igual, con `graphql.query('OpcionesViaje', …)` |
| Tiempo límite | Modo "Sin respuesta": sin aviso a los 14,999 s y "Tiempo agotado" a los 15 s, con Reintentar | Igual |
| Modo lento | Los datos llegan a los 4 s y no aparece "Tiempo agotado" | Igual |
| Recurso inexistente | — | Id no numérico sin petición; destino inexistente con "No encontrado" sin Reintentar, también con "Error del servidor" activo |
| Lista vacía | "Sin destinos disponibles" con Reintentar | Madrid: "Sin vuelos ni hoteles disponibles" |
| Vencimiento de caché | Antes de vencer, sin petición nueva; después, datos anteriores con `aria-busy` mientras se actualizan (2 peticiones) | Igual con la caché de Apollo |
| Cancelación | Salir mientras carga aborta la petición y no muestra un error al volver | Cubierta en `useConsulta` y en los clientes |

## Infraestructura de pruebas

| Archivo | Para qué |
| --- | --- |
| [`configuracion.js`](../src/test/configuracion.js) | Setup de cada archivo (`setupFilesAfterEnv`): inicia el servidor MSW con `onUnhandledRequest: 'error'`, simula `matchMedia` y `scrollTo` (jsdom no los implementa) y, después de cada prueba, restaura los globales, los manejadores y los listeners del servidor, limpia `localStorage` y `sessionStorage` y vacía las cachés del cliente HTTP y de Apollo |
| [`servidor.js`](../src/test/servidor.js) | Servidor MSW único (`msw/node`) con los manejadores del sitio |
| [`renderizar.jsx`](../src/test/renderizar.jsx) | `renderizar(ui, opciones)` monta con `StrictMode` y `MemoryRouter` (ruta, historial inicial, opciones de user-event, ubicación visible) y devuelve `usuario`; `renderizarRuta(ruta)` monta la aplicación completa; `ESPERA` es la espera de las consultas |
| [`UbicacionActual.jsx`](../src/test/UbicacionActual.jsx) | `output` con nombre "Ubicación actual" que muestra la ruta y los parámetros: se consulta por rol para verificar `?region=` |
| [`temporizadores.js`](../src/test/temporizadores.js) | `simularSoloFecha()` (solo `Date`, para el vencimiento de caché con `jest.setSystemTime`) y `avanzar(ms)` (avanza los temporizadores falsos dentro de `act`) |
| [`peticiones.js`](../src/test/peticiones.js) | `registrarPeticiones(ruta)` cuenta las peticiones que recibe el servidor para una ruta (`/api/destinos` o `/graphql`) |
| [`globales.js`](../src/test/globales.js) | Reemplazo temporal de globales (`localStorage`, `sessionStorage`, `window`…), restaurado por el setup |
| [`almacenamiento.js`](../src/test/almacenamiento.js) | Almacenamiento en memoria con la interfaz de Web Storage, para las pruebas sin DOM |
| [`entorno.js`](../src/test/entorno.js) | Sustituye a [`config/entorno.js`](../src/config/entorno.js) (vía `moduleNameMapper`): `import.meta` no existe en el CommonJS de Jest |
| [`estilos.js`](../src/test/estilos.js) | Sustituye las hojas de estilo: las pruebas no procesan CSS |

El tiempo límite se prueba con `jest.useFakeTimers()`, `avanzar` y user-event con `advanceTimers`; el vencimiento de la caché, con `simularSoloFecha` y `jest.setSystemTime`. Ninguna prueba espera tiempo real más allá de la demora normal del mock (400 a 900 ms).

## Archivos de prueba

Resultado actual: **470 pruebas en 36 archivos, todas aprobadas.**

**Lógica (370 pruebas)**

| Archivo | Pruebas | Qué cubre |
| --- | --- | --- |
| [`mocks/handlers.test.js`](../src/mocks/handlers.test.js) | 54 | REST: lista, ids únicos, 500 con `{ mensaje }` y falla de red. GraphQL: destino con vuelos y hoteles, solo los campos pedidos, sin oferta, ids equivalentes, `NOT_FOUND`, `BAD_USER_INPUT` (también con una falla simulada activa), 500 y falla de red. Modo "Sin respuesta" en ambas APIs y qué URLs son de la API para la advertencia de la consola. Datos: ids, códigos IATA, estadías que calzan con algún vuelo, opciones agotadas y la coherencia de los 16 horarios con los husos horarios |
| [`services/clienteApollo.test.js`](../src/services/clienteApollo.test.js) | 39 | Integración del cliente Apollo real con el mock: caché normalizada, una sola petición al volver a un destino, ids equivalentes, errores que no quedan en caché, la clase de error de Apollo en cada modo con su tipo normalizado, tiempo límite, validación de `OpcionesViaje` (incluido un 500 con HTML) y vencimiento de la caché con `cache-and-network` |
| [`services/clienteHttp.test.js`](../src/services/clienteHttp.test.js) | 29 | Caché por URL, peticiones compartidas, cancelación (incluido el doble efecto de StrictMode), errores 404, 500, red, JSON inválido y 500 con HTML, validación, tiempo límite (con dos consumidores, uno cancela y luego vence el plazo) y vencimiento de la caché |
| [`services/destinos.test.js`](../src/services/destinos.test.js) | 10 | Servicio de destinos: caché, error que no queda en caché, cancelación, listado inválido, JSON ilegible, 500 con HTML y los modos "Sin respuesta" y "Respuesta lenta" |
| [`services/tiempoLimite.test.js`](../src/services/tiempoLimite.test.js) | 8 | Tiempo límite de 15 s con temporizadores falsos: vencimiento, cancelación antes y después del plazo y limpieza del temporizador |
| [`utils/errores.test.js`](../src/utils/errores.test.js) | 37 | `normalizarError` con errores REST y con las clases reales de Apollo 4 (`CombinedGraphQLErrors`, `ServerError`, `ServerParseError`, `UnconventionalError`), red, cancelación, tiempo agotado y datos incompletos |
| [`utils/viaje.test.js`](../src/utils/viaje.test.js) | 36 | Noches (incluido el cambio de horario), totales, fechas que calzan, disponibilidad, anticipación recomendada y opción elegida tras una actualización de los datos |
| [`utils/validacion.test.js`](../src/utils/validacion.test.js) | 35 | Validación del listado de destinos y de `OpcionesViaje`: campos faltantes, tipos incorrectos, `notaLlegada` nula y un elemento inválido que invalida la lista |
| [`utils/destinos.test.js`](../src/utils/destinos.test.js) | 24 | Destino nacional, normalización de la región de la URL, filtro y texto "Mostrando N de M destinos" |
| [`utils/mock.test.js`](../src/utils/mock.test.js) | 22 | Soporte de Service Workers, falla de descarga de cada navegador y clasificación del arranque (incluido el `SecurityError` por almacenamiento bloqueado) |
| [`utils/formato.test.js`](../src/utils/formato.test.js) | 19 | Precios en CLP, fechas es-CL, escalas, noches, disponibilidad y duración |
| [`utils/ids.test.js`](../src/utils/ids.test.js) | 18 | `convertirEntero` con ids válidos e inválidos |
| [`utils/consulta.test.js`](../src/utils/consulta.test.js) | 15 | Estado de las consultas (dato vigente, vencido, actualizado y con error) y política de caché de Apollo |
| [`utils/almacenamiento.test.js`](../src/utils/almacenamiento.test.js) | 14 | Lectura y escritura de `localStorage` y `sessionStorage` disponibles, bloqueados (`SecurityError`) o inexistentes; modo de simulación y tema con valores por defecto |
| [`utils/vigencia.test.js`](../src/utils/vigencia.test.js) | 8 | Vigencia de 5 minutos: a los 4:59 sigue vigente y a los 5:00 ya venció |
| [`utils/tema.test.js`](../src/utils/tema.test.js) | 2 | Script que aplica el tema antes del primer pintado: tema guardado, preferencia del sistema y almacenamiento bloqueado |

**Componentes (45 pruebas)**

| Archivo | Pruebas | Qué cubre |
| --- | --- | --- |
| [`components/Aviso.test.jsx`](../src/components/Aviso.test.jsx) | 5 | Error como `alert`; informativo, por defecto o tipo desconocido como `status`; título y acciones opcionales |
| [`components/AvisoErrorConsulta.test.jsx`](../src/components/AvisoErrorConsulta.test.jsx) | 6 | Título y mensaje de cada tipo de error, Reintentar y enlace de salida; "No encontrado" sin Reintentar |
| [`components/Boton.test.jsx`](../src/components/Boton.test.jsx) | 3 | `type="button"` por defecto, tipo indicado, deshabilitado sin acción y atributos ARIA |
| [`components/BotonTema.test.jsx`](../src/components/BotonTema.test.jsx) | 5 | Alterna claro y oscuro, actualiza `data-tema` y guarda en `localStorage`; preferencia guardada y del sistema (`matchMedia`) |
| [`components/Cargando.test.jsx`](../src/components/Cargando.test.jsx) | 2 | Texto por defecto y personalizado con rol `status` |
| [`components/EstadoConsulta.test.jsx`](../src/components/EstadoConsulta.test.jsx) | 4 | Contenido, carga con `aria-busy`, error con Reintentar y lista vacía dentro de la región |
| [`components/MockNoDisponible.test.jsx`](../src/components/MockNoDisponible.test.jsx) | 6 | Título, causa y pasos de cada diagnóstico, estado desconocido, título de la pestaña y el botón "Recargar la página" |
| [`components/SelectorSimulacion.test.jsx`](../src/components/SelectorSimulacion.test.jsx) | 3 | Opciones y modo inicial desde `sessionStorage`, guardado al cambiar y la siguiente consulta con el modo elegido |
| [`components/TituloPagina.test.jsx`](../src/components/TituloPagina.test.jsx) | 3 | Título con y sin texto, y cambio al navegar |
| [`components/VolverArriba.test.jsx`](../src/components/VolverArriba.test.jsx) | 3 | `scrollTo(0, 0)` al navegar; sin llamada en la carga inicial ni al volver atrás |
| [`components/destinos/FiltroRegion.test.jsx`](../src/components/destinos/FiltroRegion.test.jsx) | 3 | Grupo de radios con la región marcada, clic y flechas del teclado |
| [`components/destinos/TarjetaDestino.test.jsx`](../src/components/destinos/TarjetaDestino.test.jsx) | 2 | Nombre, país, descripción, actividades y enlace al detalle con nombre accesible completo |

**Hooks (13 pruebas)**

| Archivo | Pruebas | Qué cubre |
| --- | --- | --- |
| [`hooks/useConsulta.test.jsx`](../src/hooks/useConsulta.test.jsx) | 8 | Sin recurso, carga y éxito, error, reintento con los datos anteriores visibles, caché vigente y cancelación al desmontar o al cambiar de recurso, sin errores en la consola |
| [`hooks/useDestinos.test.jsx`](../src/hooks/useDestinos.test.jsx) | 2 | Listado de la API y listado inválido como datos incompletos |
| [`hooks/useVolver.test.jsx`](../src/hooks/useVolver.test.jsx) | 3 | Vuelve atrás con historial del sitio, ruta de respaldo sin historial y el Volver de un destino abierto directamente |

**Páginas (35 pruebas)**

| Archivo | Pruebas | Qué cubre |
| --- | --- | --- |
| [`pages/Destinos.test.jsx`](../src/pages/Destinos.test.jsx) | 15 | Listado REST con los escenarios de la [tabla anterior](#escenarios-cubiertos-en-las-páginas) |
| [`pages/Destino.test.jsx`](../src/pages/Destino.test.jsx) | 16 | Detalle GraphQL con los escenarios de la [tabla anterior](#escenarios-cubiertos-en-las-páginas) |
| [`pages/NoEncontrado.test.jsx`](../src/pages/NoEncontrado.test.jsx) | 4 | Mensaje y título, "Ir al inicio" y Volver con y sin historial |

**Navegación y humo (7 pruebas)**

| Archivo | Pruebas | Qué cubre |
| --- | --- | --- |
| [`App.test.jsx`](../src/App.test.jsx) | 5 | Cada ruta (`/`, `/destinos`, `/destinos/1` y una inexistente) muestra "Cargando página…" y luego su página dentro del `Layout`, con su título de pestaña; enlace activo de la navegación |
| [`test/humo.test.jsx`](../src/test/humo.test.jsx) | 2 | La base de pruebas funcionando junta: enrutador, páginas diferidas, cliente Apollo y MSW |

**Total: 470 pruebas** (370 de lógica y 100 de interfaz).

Las pruebas de carga diferida de `App.test.jsx` corren cada una dentro de `jest.isolateModulesAsync`, con su propia copia de la aplicación: `React.lazy` deja la página cargada para las pruebas siguientes y, sin aislar, "Cargando página…" solo se vería en la primera. Así cada prueba pasa en cualquier orden y también ejecutada sola (`-t`).

**Las pruebas detectan fallas.** Sobre las pruebas de lógica se introdujeron errores a propósito, uno por vez, y en cada caso fallaron pruebas; al restaurar el código vuelven a pasar todas:

| Error introducido | Pruebas que fallaron |
| --- | --- |
| `fechasCalzan` con `>` en lugar de `>=` | 1 |
| Hora de llegada de un vuelo a Rapa Nui alterada en los datos | 1 |
| `NOT_FOUND` traducido como error del servidor | 2 |
| El cliente HTTP no guarda en caché | 5 |
| El modo "Error del servidor" de GraphQL responde 200 en vez de 500 | 1 |
| Sin tiempo límite en el cliente REST | 4 |
| Sin tiempo límite en el cliente Apollo | 2 |
| Sin validación en el cliente REST | 3 |
| Sin validación de `OpcionesViaje` en Apollo | 5 |
| La caché REST nunca vence | 6 |
| Apollo siempre con `cache-first` (sin actualizar el dato vencido) | 6 |
| Un dato vencido sin indicador de carga | 1 |
| Una opción agotada sigue elegida tras la actualización | 2 |

## Cobertura

| Statements | Branches | Functions | Lines |
| --- | --- | --- | --- |
| 98,59 % (560/568) | 95,71 % (402/420) | 98,51 % (199/202) | 99,41 % (506/509) |

**Umbral** en [`jest.config.cjs`](../jest.config.cjs) (`coverageThreshold.global`): 80 % de statements, functions y lines, y 70 % de branches. `npm run test:coverage` falla si algún total queda por debajo. Todos los archivos de `src/pages`, `src/components` y `src/hooks` superan el 80 % de líneas.

**Fuera de la medición** (`collectCoverageFrom`):
- [`main.jsx`](../src/main.jsx) y [`mocks/browser.js`](../src/mocks/browser.js): arranque del navegador (monta la aplicación y registra el Service Worker), que no existe en Node. La lógica que deciden está en [`mock.js`](../src/utils/mock.js) y `esPeticionDeLaApi` en [`handlers.js`](../src/mocks/handlers.js), ambos probados.
- [`config/entorno.js`](../src/config/entorno.js): Jest nunca lo carga, porque `moduleNameMapper` lo reemplaza por [`test/entorno.js`](../src/test/entorno.js).
- `src/test/` y los propios archivos de prueba.

**Lo que queda sin cubrir en la interfaz:**
- [`useOpcionesViaje.js`](../src/hooks/useOpcionesViaje.js) (84,61 % de statements, 50 % de branches): el cambio de destino sin desmontar el hook y el `reintentar` vacío del id inválido. La página no llega a ninguno: renderiza el contenido con `key={id}` (al cambiar de destino se monta un hook nuevo) y con un id inválido no monta el hook.
- [`MockNoDisponible.jsx`](../src/components/MockNoDisponible.jsx) (90 % de statements): la función por defecto de `alRecargar`, que llama a `window.location.reload()`. jsdom no permite reemplazar ni espiar `location.reload` y no implementa la navegación, así que la prueba pasa una función espía por la prop.
- Las demás ramas parciales (por ejemplo, en [`GrupoOpciones.jsx`](../src/components/destino/GrupoOpciones.jsx) sin descripción o en [`Destino.jsx`](../src/pages/Destino.jsx) con un solo tipo de opción vacío) son variantes que los datos del mock no producen.

## Matriz de pruebas en navegadores

Pruebas manuales en el [sitio publicado](https://l0ncho.github.io/pruebas-unitarias-alonso-basualdo-pfy2202/), realizadas el 27-11-2026. Complementan a las automatizadas en lo que jsdom no reproduce: motores de navegador reales, el Service Worker de MSW, el diseño a 360 px, el tema sin destello al recargar y la consola del navegador. Incluyen el tiempo límite (casos 9 y 10), el 404 con "Error del servidor" activo (caso 12) y la advertencia de rutas de la API sin manejador (caso 17).

**Navegadores elegidos:** dos navegadores con motores distintos. Chrome en Windows usa Chromium; Safari en iPhone usa WebKit, que es además el motor de todos los navegadores en iOS, así que también cubre el uso en celular.

**Versiones mínimas que soporta Tailwind CSS v4:** Chrome 111, Safari 16.4 y Firefox 128. En navegadores más antiguos los estilos pueden no aplicarse correctamente.

| | Chrome (Windows) | Safari (iPhone) |
| --- | --- | --- |
| **Versión** | Chrome 158.0.8127.88 en Windows 11 25H2 (compilación 26200.9974), en escritorio y a 360 px | Safari en iPhone con iOS 27.2.1 |

| # | Caso | Pasos | Resultado esperado | Chrome (Windows) | Safari (iPhone) |
| --- | --- | --- | --- | --- | --- |
| 1 | Flujo principal | Inicio → Ver destinos → un destino → Volver | Cada página carga con su título y sus datos; Volver regresa a Destinos | OK | OK |
| 2 | Filtro de destinos | Elegir Nacionales, luego Internacionales y recargar | 4 y 4 destinos; "Mostrando 4 de 8 destinos"; la URL cambia y el filtro se mantiene al recargar | OK | OK |
| 3 | Selección y total | En San Pedro de Atacama, elegir el vuelo de AeroAndes y el Hotel Desierto Rojo; luego el Lodge Altiplano; luego Limpiar selección | Total $679.990 y 5 noches de viaje y de hotel; advertencia de fechas con Lodge Altiplano; Limpiar vuelve al mensaje inicial | OK | OK |
| 4 | Errores con el selector "Simulación de la API" | "Error del servidor (500)" y abrir un destino no visitado; volver a Normal y Reintentar; repetir con "Sin conexión" | "Error del servidor" o "Sin conexión", con Reintentar y enlace a Destinos; al reintentar en Normal llegan los datos | OK | OK |
| 5 | Página 404 | Abrir una URL inexistente, por ejemplo `/cualquier-cosa` | "Página no encontrada" con Volver e Ir al inicio | OK | OK |
| 6 | Recarga en una ruta interna | Recargar estando en `/destinos/1` | La página del destino carga normalmente (no aparece el 404 de GitHub Pages). La consola muestra un 404 del documento: GitHub Pages no tiene un archivo para esa ruta y responde con `404.html`, que es una copia de `index.html`, así que la aplicación carga igual. Es el comportamiento esperado al publicar una aplicación con rutas en GitHub Pages | OK | OK |
| 7 | Pantalla de celular o 360 px | Recorrer Destinos y un destino a 360 px (en Chrome) o en el iPhone | Una columna, sin desplazamiento horizontal; el resumen del viaje al final | OK | OK |
| 8 | Ambos temas | Alternar "Modo oscuro" y recorrer las páginas | Textos legibles en ambos temas; la preferencia se mantiene al recargar | OK | OK |
| 9 | Tiempo límite en el listado | Elegir "Sin respuesta" y abrir Destinos sin haberlo visitado; luego Normal y Reintentar | Indicador de carga y, a los 15 s, "Tiempo agotado" con Reintentar; al reintentar en Normal llega el listado | OK | OK |
| 10 | Tiempo límite en el destino | Elegir "Sin respuesta" y abrir un destino no visitado; luego Normal y Reintentar | "Tiempo agotado" a los 15 s con Reintentar; al reintentar en Normal llegan los vuelos y hoteles | OK | OK |
| 11 | Respuesta lenta sin tiempo agotado | Elegir "Respuesta lenta (4 s)" y abrir Destinos y un destino no visitados | Los datos llegan a los 4 s; no aparece "Tiempo agotado" | OK | OK |
| 12 | 404 con "Error del servidor" activo | Elegir "Error del servidor (500)" y abrir `/destinos/99` | "Destino no encontrado", sin Reintentar (no "Error del servidor") | OK | OK |
| 13 | Destino existente con falla | Con "Error del servidor (500)" activo, abrir un destino no visitado | "Error del servidor" con Reintentar y enlace a Destinos | OK | OK |
| 14 | Destino sin oferta | Abrir Madrid | "Sin vuelos ni hoteles disponibles", con enlace a otros destinos | OK | OK |
| 15 | Tema sin destello al recargar | Elegir "Modo oscuro" y recargar varias páginas | La página aparece directamente en el tema oscuro, sin un destello del claro | OK | OK |
| 16 | Vencimiento de la caché | Abrir Destinos y un destino, volver a Inicio, esperar 5 minutos y volver a abrirlos | Los datos aparecen al instante con el indicador de carga encima y se actualizan con una sola petición, sin parpadeo | OK | OK |
| 17 | Advertencia por una ruta de la API sin manejador | Ejecutar en la consola `fetch('/pruebas-unitarias-alonso-basualdo-pfy2202/api/destinoss')` | La consola muestra la advertencia de MSW de una petición sin manejador | OK | No probado (no hay consola en el iPhone) |

**Resultado:** en la repetición del 27-11-2026, todos los casos tuvieron el mismo resultado que en la ejecución anterior: los casos 1 a 16 aprobados en ambos navegadores. La advertencia en la consola (caso 17) se aprobó en Chrome y no se probó en Safari, porque el iPhone no tiene consola. No se encontraron fallas.

## Errores encontrados y corregidos

### Aviso equivocado con el almacenamiento bloqueado (Chrome)

**Cómo se encontró:** al probar en Chrome con el almacenamiento bloqueado para el sitio ("No se permite guardar datos").

**Antes:** se mostraba "No se pudieron descargar los datos simulados… Revisa tu conexión a internet", aunque la conexión estaba bien.

![Aviso antes de la corrección](images/aviso-almacenamiento-antes.png)

**Causa:** MSW lee `localStorage` al cargarse. Con el almacenamiento bloqueado, Chrome lanza `SecurityError`, el `import()` del mock fallaba y el arranque lo clasificaba como una falla de descarga.

**Corrección:** solo un error de descarga del módulo se clasifica como falla de carga; cualquier otro error al importar o iniciar el mock se informa como que el navegador no permitió iniciarlo. Además, todo acceso al almacenamiento del proyecto captura el `SecurityError` y usa valores por defecto. Detalle en [decisiones técnicas](decisiones-tecnicas.md#aviso-de-service-worker-no-disponible); lo cubren [`mock.test.js`](../src/utils/mock.test.js) y [`almacenamiento.test.js`](../src/utils/almacenamiento.test.js).

**Después:** se muestra "El navegador no permitió iniciar los datos simulados", con la causa probable y qué hacer.

![Aviso después de la corrección](images/aviso-almacenamiento-despues.png)

### Errores encontrados durante el desarrollo

Detectados por las pruebas automatizadas o al revisar el build, y corregidos antes de publicar:

| Error | Cómo se detectó | Corrección |
| --- | --- | --- |
| Una consulta GraphQL anónima respondía "Unknown operation named """ | Prueba "responde solo los campos que pide la consulta" | MSW entrega `operationName` vacío; el handler lo pasa como `undefined` |
| El 500 de GraphQL no llegaba como `ServerError` | Prueba de integración del cliente Apollo | Apollo 4 lo entrega como `CombinedGraphQLErrors`; `normalizarError` lo traduce por `extensions.code` |
| `graphql` completo se descargaba antes del primer render en todas las páginas | Revisión de las importaciones entre archivos del build | División en `graphql-lenguaje` y `graphql` en `vite.config.js` |
