# Pruebas

## Pruebas automatizadas

Se ejecutan con Vitest en Node, sin navegador:

```bash
npm run test
```

Resultado actual: **225 pruebas en 11 archivos, todas aprobadas.**

| Archivo | Pruebas | Qué cubre |
| --- | --- | --- |
| [`mocks/handlers.test.js`](../src/mocks/handlers.test.js) | 38 | REST: lista, ids únicos, 500 con `{ mensaje }` y falla de red. GraphQL: destino con vuelos y hoteles, solo los campos pedidos, sin oferta, ids equivalentes, `NOT_FOUND`, `BAD_USER_INPUT`, 500 y falla de red. Datos: ids, códigos IATA, estadías que calzan con algún vuelo, opciones agotadas y la coherencia de los 16 horarios con los husos horarios |
| [`utils/errores.test.js`](../src/utils/errores.test.js) | 31 | `normalizarError` con errores REST y con las clases reales de Apollo 4 (`CombinedGraphQLErrors`, `ServerError`, `ServerParseError`, `UnconventionalError`), red y cancelación |
| [`utils/viaje.test.js`](../src/utils/viaje.test.js) | 28 | Noches (incluido el cambio de horario), totales, fechas que calzan, disponibilidad y anticipación recomendada |
| [`utils/destinos.test.js`](../src/utils/destinos.test.js) | 24 | Destino nacional, normalización de la región de la URL, filtro y texto "Mostrando N de M destinos" |
| [`utils/mock.test.js`](../src/utils/mock.test.js) | 22 | Soporte de Service Workers, falla de descarga de cada navegador y clasificación del arranque (incluido el `SecurityError` por almacenamiento bloqueado) |
| [`utils/formato.test.js`](../src/utils/formato.test.js) | 19 | Precios en CLP, fechas es-CL, escalas, noches, disponibilidad y duración |
| [`utils/ids.test.js`](../src/utils/ids.test.js) | 18 | `convertirEntero` con ids válidos e inválidos |
| [`services/clienteApollo.test.js`](../src/services/clienteApollo.test.js) | 16 | Integración del cliente Apollo real con el mock: caché normalizada, una sola petición al volver a un destino, ids equivalentes, errores que no quedan en caché y la clase de error de Apollo en cada modo con su tipo normalizado |
| [`utils/almacenamiento.test.js`](../src/utils/almacenamiento.test.js) | 14 | Lectura y escritura de `localStorage` y `sessionStorage` disponibles, bloqueados (`SecurityError`) o inexistentes; modo de simulación y tema con valores por defecto |
| [`services/clienteHttp.test.js`](../src/services/clienteHttp.test.js) | 12 | Caché por URL, peticiones compartidas, cancelación (incluido el doble efecto de StrictMode) y errores 404, 500, red y JSON inválido |
| [`services/destinos.test.js`](../src/services/destinos.test.js) | 3 | Servicio de destinos: caché, error que no queda en caché y cancelación |

Las pruebas de los handlers y de los clientes usan los handlers reales del mock con `msw/node`.

**Las pruebas detectan fallas.** Se introdujeron cinco errores a propósito, uno por vez, y en cada caso fallaron pruebas; al restaurar el código vuelven a pasar las 225:

| Error introducido | Pruebas que fallaron |
| --- | --- |
| `fechasCalzan` con `>` en lugar de `>=` | 1 |
| Hora de llegada de un vuelo a Rapa Nui alterada en los datos | 1 |
| `NOT_FOUND` traducido como error del servidor | 2 |
| El cliente HTTP no guarda en caché | 5 |
| El modo "Error del servidor" de GraphQL responde 200 en vez de 500 | 1 |

## Matriz de pruebas en navegadores

Pruebas manuales en el [sitio publicado](https://l0ncho.github.io/viajes-alonso-basualdo-pfy2202/). Cada celda queda como "Pendiente" hasta registrar el resultado real ("OK" o la descripción del problema).

**Navegadores elegidos:** Chrome y Edge usan el mismo motor (Chromium), así que deberían comportarse igual; se prueban ambos porque son los más usados en Windows. Safari en iPhone usa otro motor (WebKit), que es además el que usan todos los navegadores en iOS: cubre el caso de celular con un motor distinto.

**Versiones mínimas que soporta Tailwind CSS v4:** Chrome 111, Safari 16.4 y Firefox 128 (Edge sigue a Chromium: 111). En navegadores más antiguos los estilos pueden no aplicarse correctamente.

| | Chrome (Windows) | Edge (Windows) | Safari (iPhone) |
| --- | --- | --- | --- |
| **Versión del navegador y del sistema** | Pendiente | Pendiente | Pendiente |

| # | Caso | Pasos | Resultado esperado | Chrome (Windows) | Edge (Windows) | Safari (iPhone) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Flujo principal | Inicio → Ver destinos → un destino → Volver | Cada página carga con su título; Volver regresa a Destinos | Pendiente | Pendiente | Pendiente |
| 2 | Lista REST | Abrir Destinos | 8 destinos con país, descripción y actividades; una sola petición a `api/destinos` | Pendiente | Pendiente | Pendiente |
| 3 | Filtro | Elegir Nacionales, luego Internacionales y recargar | 4 y 4 destinos; "Mostrando 4 de 8 destinos"; la URL cambia y el filtro se mantiene al recargar | Pendiente | Pendiente | Pendiente |
| 4 | GraphQL y caché | Abrir San Pedro de Atacama, Volver y abrirlo de nuevo | Vuelos, hoteles y nota "Cómo llegar"; la segunda vez no hay petición a `graphql` | Pendiente | Pendiente | Pendiente |
| 5 | Selección y total | Elegir vuelo AeroAndes y Hotel Desierto Rojo; luego Lodge Altiplano; luego Limpiar selección | Total $679.990 y 5 noches de viaje y de hotel; advertencia de fechas con Lodge Altiplano; Limpiar vuelve al mensaje inicial | Pendiente | Pendiente | Pendiente |
| 6 | Opciones agotadas | Intentar elegir Cóndor Air o Hostal Licancabur en San Pedro de Atacama | Se ven como "Agotado", con texto legible, y no se pueden elegir | Pendiente | Pendiente | Pendiente |
| 7 | Destino sin oferta | Abrir Madrid | Mensaje "Sin vuelos ni hoteles disponibles" con enlace a otros destinos | Pendiente | Pendiente | Pendiente |
| 8 | Teclado | Recorrer el sitio solo con Tab, flechas, Enter y Espacio | Foco visible; los grupos de radios se recorren con flechas; se puede elegir vuelo y hotel y usar todos los botones | Pendiente | Pendiente | No aplica |
| 9 | Error del servidor | Selector en "Error del servidor (500)" y abrir un destino no visitado; volver a Normal y Reintentar | "Error del servidor" con Reintentar y enlace; al reintentar llegan los datos | Pendiente | Pendiente | Pendiente |
| 10 | Sin conexión y lenta | Selector en "Sin conexión" y luego en "Respuesta lenta (4 s)", abriendo destinos no visitados | "Sin conexión" con Reintentar; con la respuesta lenta, el título visible y el indicador de carga | Pendiente | Pendiente | Pendiente |
| 11 | No encontrado | Abrir `/destinos/99` y `/destinos/abc` | "Destino no encontrado", sin Reintentar, con enlace a Destinos | Pendiente | Pendiente | Pendiente |
| 12 | 404 y recarga | Abrir `/cualquier-cosa`; recargar estando en `/destinos/1` | "Página no encontrada"; la recarga en la ruta interna carga la página del destino | Pendiente | Pendiente | Pendiente |
| 13 | Pantalla de celular | Recorrer Destinos y un destino a 360 px (o en el iPhone) | Una columna, sin desplazamiento horizontal; el resumen al final | Pendiente | Pendiente | Pendiente |
| 14 | Escritorio | Recorrer Destinos y un destino en pantalla ancha | 3 columnas en Destinos; el resumen fijo al costado en el destino | Pendiente | Pendiente | Pendiente |
| 15 | Tema claro y oscuro | Alternar "Modo oscuro" y recorrer las páginas | Textos legibles en ambos temas; la preferencia se mantiene al recargar | Pendiente | Pendiente | Pendiente |
| 16 | Aviso de Service Worker | Bloquear el almacenamiento del sitio (Chrome: `chrome://settings/content/siteData`; Edge: `edge://settings/content/cookies`; Safari: bloquear todas las cookies en los ajustes de Safari) y recargar | Aviso "El navegador no permitió iniciar los datos simulados" (o "Este navegador no permite Service Workers"), nunca "Sin conexión" | Pendiente | Pendiente | Pendiente |

## Errores encontrados y corregidos

### Aviso equivocado con el almacenamiento bloqueado (Chrome)

**Cómo se encontró:** al probar en Chrome con el almacenamiento bloqueado para el sitio ("No se permite guardar datos").

**Antes:** se mostraba "No se pudieron descargar los datos simulados… Revisa tu conexión a internet", aunque la conexión estaba bien.

![Aviso antes de la corrección](img/aviso-almacenamiento-antes.png)

**Causa:** MSW lee `localStorage` al cargarse. Con el almacenamiento bloqueado, Chrome lanza `SecurityError`, el `import()` del mock fallaba y el arranque lo clasificaba como una falla de descarga.

**Corrección:** solo un error de descarga del módulo se clasifica como falla de carga; cualquier otro error al importar o iniciar el mock se informa como que el navegador no permitió iniciarlo. Además, todo acceso al almacenamiento del proyecto captura el `SecurityError` y usa valores por defecto. Detalle en [decisiones técnicas](decisiones-tecnicas.md#aviso-de-service-worker-no-disponible); lo cubren [`mock.test.js`](../src/utils/mock.test.js) y [`almacenamiento.test.js`](../src/utils/almacenamiento.test.js).

**Después:** se muestra "El navegador no permitió iniciar los datos simulados", con la causa probable y qué hacer.

![Aviso después de la corrección](img/aviso-almacenamiento-despues.png)

### Errores encontrados durante el desarrollo

Detectados por las pruebas automatizadas o al revisar el build, y corregidos antes de publicar:

| Error | Cómo se detectó | Corrección |
| --- | --- | --- |
| Una consulta GraphQL anónima respondía "Unknown operation named """ | Prueba "responde solo los campos que pide la consulta" | MSW entrega `operationName` vacío; el handler lo pasa como `undefined` |
| El 500 de GraphQL no llegaba como `ServerError` | Prueba de integración del cliente Apollo | Apollo 4 lo entrega como `CombinedGraphQLErrors`; `normalizarError` lo traduce por `extensions.code` |
| `graphql` completo se descargaba antes del primer render en todas las páginas | Revisión de las importaciones entre archivos del build | División en `graphql-lenguaje` y `graphql` en `vite.config.js` |
