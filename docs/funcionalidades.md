# Funcionalidades

Qué incluye AirFly, dónde está en el código, qué pruebas lo cubren y cómo comprobarlo en el sitio. Las rutas del sitio son relativas a https://l0ncho.github.io/pruebas-unitarias-alonso-basualdo-pfy2202/

## Interfaz responsiva

**Código**
- Estructura común en [`Layout.jsx`](../src/components/Layout.jsx): encabezado con nombre, eslogan, menú con el enlace activo marcado (`aria-current`) y botón de tema; contenido; pie con el selector de simulación.
- Recorrido: Inicio → Destinos (tarjetas con "Ver vuelos y hoteles") → Destino (vuelos, hoteles y resumen) → Volver.
- Cada estado tiene su mensaje y una alternativa: carga ([`Cargando.jsx`](../src/components/Cargando.jsx)), error con Reintentar y salida ([`AvisoErrorConsulta.jsx`](../src/components/AvisoErrorConsulta.jsx)), lista vacía, destino sin oferta, no encontrado y fechas que no calzan. Los errores incluyen "Tiempo agotado" (el servidor no respondió en 15 s) y "Datos incompletos" (la respuesta no tiene la estructura esperada), ambos con Reintentar.
- [`EstadoConsulta.jsx`](../src/components/EstadoConsulta.jsx) reúne en un componente la carga, el error y la lista vacía de las dos páginas de datos, con la región que se actualiza marcada con `aria-busy`.
- Diseño responsivo con los breakpoints `sm` y `md` de Tailwind:
  - Destinos: grilla de 1 columna a 360 px, 2 en `sm` y 3 en `md` ([`Destinos.jsx`](../src/pages/Destinos.jsx)).
  - Destino: una columna en celular con el resumen al final; en `md`, dos columnas con el resumen fijo al costado ([`Destino.jsx`](../src/pages/Destino.jsx)).
- Tema claro y oscuro con variables de color en [`index.css`](../src/index.css); todos los pares de texto y fondo cumplen 4,5:1 ([tabla](decisiones-tecnicas.md#accesibilidad)). El tema se aplica antes del primer pintado, sin destello al recargar ([detalle](decisiones-tecnicas.md#tema-sin-destello)).

**Pruebas**
- [`EstadoConsulta.test.jsx`](../src/components/EstadoConsulta.test.jsx), [`AvisoErrorConsulta.test.jsx`](../src/components/AvisoErrorConsulta.test.jsx), [`Aviso.test.jsx`](../src/components/Aviso.test.jsx), [`Cargando.test.jsx`](../src/components/Cargando.test.jsx) y [`Boton.test.jsx`](../src/components/Boton.test.jsx): cada estado (carga, error, lista vacía) con su texto, su rol accesible y sus acciones.
- [`BotonTema.test.jsx`](../src/components/BotonTema.test.jsx): alternar el tema, `data-tema`, la preferencia guardada y la del sistema; [`tema.test.js`](../src/utils/tema.test.js): el script que aplica el tema antes del primer pintado.
- [`MockNoDisponible.test.jsx`](../src/components/MockNoDisponible.test.jsx): el aviso de cada diagnóstico del mock y el botón de recarga.
- El diseño a 360 px y el contraste se revisan en la [matriz de pruebas](pruebas.md#matriz-de-pruebas-en-navegadores), porque jsdom no aplica estilos.

**Cómo comprobarlo:** recorrer el sitio a 360 px (modo dispositivo de las herramientas de desarrollo) y en escritorio, en ambos temas. Ver la [matriz de pruebas](pruebas.md#matriz-de-pruebas-en-navegadores).

## API REST simulada

**Código**
- Handler `GET /api/destinos` en [`handlers.js`](../src/mocks/handlers.js), con demora realista y los modos de falla del selector. Detalle en [API simulada](api-simulada.md#api-rest).
- Cliente HTTP con caché por URL, peticiones compartidas y cancelación en [`clienteHttp.js`](../src/services/clienteHttp.js); servicio en [`destinos.js`](../src/services/destinos.js); hook [`useDestinos.js`](../src/hooks/useDestinos.js) sobre [`useConsulta.js`](../src/hooks/useConsulta.js).
- Tiempo límite de 15 s por petición ([`tiempoLimite.js`](../src/services/tiempoLimite.js)), validación del listado ([`validacion.js`](../src/utils/validacion.js)) y vencimiento de la caché a los 5 minutos: un dato vencido se muestra al instante y se actualiza en segundo plano; si la actualización falla, sigue visible junto al aviso. Detalle en [decisiones técnicas](decisiones-tecnicas.md#capa-de-datos).
- Página [`Destinos.jsx`](../src/pages/Destinos.jsx) con carga, error, lista vacía y lista.

**Pruebas**
- [`handlers.test.js`](../src/mocks/handlers.test.js): la lista con sus campos, ids únicos, el 500 con `{ mensaje }` y la falla de red según el modo de simulación.
- [`clienteHttp.test.js`](../src/services/clienteHttp.test.js): caché, peticiones compartidas, cancelación (incluido el doble efecto de StrictMode), errores que no quedan en caché, tiempo límite, validación y vencimiento de la caché.
- [`destinos.test.js`](../src/services/destinos.test.js): dos consultas seguidas hacen una sola petición, un error o un listado inválido no quedan en caché y los modos "Sin respuesta" y "Respuesta lenta".
- [`useConsulta.test.jsx`](../src/hooks/useConsulta.test.jsx) y [`useDestinos.test.jsx`](../src/hooks/useDestinos.test.jsx): carga, éxito, error, reintento, caché vigente y cancelación sin mostrarla como error.
- [`Destinos.test.jsx`](../src/pages/Destinos.test.jsx): la página completa con carga, tarjetas, filtro, lista vacía, error del servidor, sin conexión, datos incompletos, tiempo límite, modo lento, vencimiento de la caché y cancelación; [`TarjetaDestino.test.jsx`](../src/components/destinos/TarjetaDestino.test.jsx) y [`FiltroRegion.test.jsx`](../src/components/destinos/FiltroRegion.test.jsx).

**Cómo comprobarlo:** pasos 1, 2 y 5 de la [revisión rápida](../README.md#revisión-rápida). En *Network* se ve una sola petición a `api/destinos` aunque se navegue varias veces por la página.

## API GraphQL simulada

**Código**
- Endpoint GraphQL en [`handlers.js`](../src/mocks/handlers.js): un esquema real (`buildSchema`) contra el que se ejecuta cada consulta, de modo que se responden solo los campos pedidos y los errores llevan `path` y `extensions.code`.
- Consulta `OpcionesViaje` en [`consultas.js`](../src/services/consultas.js): el destino, sus vuelos (fechas, horarios, escalas, precio y asientos) y sus hoteles (estrellas, fechas, precio por noche y habitaciones) en una sola petición.
- Cliente Apollo con caché normalizada en [`clienteApollo.js`](../src/services/clienteApollo.js) y hook [`useOpcionesViaje.js`](../src/hooks/useOpcionesViaje.js). Usa el mismo tiempo límite, una validación propia de `OpcionesViaje` y el mismo vencimiento de 5 minutos que REST.
- Página [`Destino.jsx`](../src/pages/Destino.jsx).

**Pruebas**
- [`handlers.test.js`](../src/mocks/handlers.test.js): destino con vuelos y hoteles, solo los campos pedidos, destino sin oferta, ids equivalentes ("7" y "007"), id inexistente (`NOT_FOUND`), id inválido (`BAD_USER_INPUT`), incluso con una falla simulada activa, y los modos de simulación.
- [`clienteApollo.test.js`](../src/services/clienteApollo.test.js): integración con el cliente Apollo real; caché por id, una sola petición al volver a un destino, la clase de error que entrega Apollo en cada caso con su tipo normalizado, tiempo límite, validación y vencimiento de la caché.
- [`Destino.test.jsx`](../src/pages/Destino.test.jsx): la página completa con el encabezado, las opciones, la selección y la cotización, destino sin oferta, id inválido sin petición, destino inexistente (también con "Error del servidor" activo), error del servidor, sin conexión, datos incompletos, tiempo límite, modo lento y vencimiento de la caché de Apollo.
- [`humo.test.jsx`](../src/test/humo.test.jsx): el enrutador, la página diferida, el cliente Apollo y MSW funcionando juntos.

**Cómo comprobarlo:** pasos 3 a 6 de la [revisión rápida](../README.md#revisión-rápida). En *Network*, la petición `graphql` muestra en *Payload* la consulta y sus variables, y en *Response* solo los campos pedidos.

## Navegación

**Código**
- Rutas en [`AppRoutes.jsx`](../src/routes/AppRoutes.jsx): `/`, `/destinos`, `/destinos/:id` y `*` (página no encontrada), todas dentro de `Layout` y con carga diferida (`lazy`). El único `Suspense` envuelve el `Outlet` de `Layout`, así que el encabezado y el pie no desaparecen al cambiar de página.
- `BrowserRouter` con `basename={BASE_URL}` en [`main.jsx`](../src/main.jsx) (la base del sitio, leída en [`entorno.js`](../src/config/entorno.js)): las rutas funcionan en la subcarpeta de GitHub Pages.
- Navegación solo con `Link`, `NavLink` y `useNavigate`. "Volver" usa [`useVolver.js`](../src/hooks/useVolver.js): vuelve atrás si la página anterior es del sitio y, si se entró directo a la URL, va a la ruta de respaldo.
- Parámetros: `useParams` para el id del destino (validado con [`convertirEntero`](../src/utils/ids.js)) y `useSearchParams` para el filtro de región.
- [`VolverArriba.jsx`](../src/components/VolverArriba.jsx) lleva la ventana al inicio al navegar, y respeta la posición al usar atrás y adelante.
- El build copia `index.html` como `404.html` ([`vite.config.js`](../vite.config.js)) para que recargar una ruta interna funcione en GitHub Pages.

**Pruebas**
- [`App.test.jsx`](../src/App.test.jsx): cada ruta muestra su página dentro del `Layout` con carga diferida y su título de pestaña, y el enlace activo del menú.
- [`NoEncontrado.test.jsx`](../src/pages/NoEncontrado.test.jsx), [`useVolver.test.jsx`](../src/hooks/useVolver.test.jsx), [`VolverArriba.test.jsx`](../src/components/VolverArriba.test.jsx) y [`TituloPagina.test.jsx`](../src/components/TituloPagina.test.jsx): página no encontrada, Volver con y sin historial, subir al inicio al navegar y el título de cada página.
- [`Destinos.test.jsx`](../src/pages/Destinos.test.jsx): el filtro en la URL (`?region=`); [`ids.test.js`](../src/utils/ids.test.js) y [`destinos.test.js`](../src/utils/destinos.test.js): validación del id y de la región.

**Cómo comprobarlo:** paso 7 de la [revisión rápida](../README.md#revisión-rápida); entrar directo a `/destinos/1` y pulsar **Volver** (va a Destinos, no sale del sitio).

## Organización y reutilización del código

- **Capas separadas:** las páginas nunca llaman a `fetch` ni a Apollo; usan hooks (`useDestinos`, `useOpcionesViaje`), que usan servicios (`clienteHttp`, `clienteApollo`, `consultas`). Los datos del mock (`datos.js`) están separados de su lógica (`handlers.js`).
- **Componentes reutilizables:** `Boton`, `Aviso`, `AvisoErrorConsulta`, `Cargando`, `EstadoConsulta` y `TituloPagina` se usan en varias páginas. `GrupoOpciones` sirve para vuelos y para hoteles, y `HorarioTramo` para la tarjeta del vuelo y para el resumen.
- **Compartido entre las dos APIs:** `normalizarError` traduce los errores REST y los de Apollo al mismo formato, así `AvisoErrorConsulta` muestra los mismos avisos en Destinos y en Destino; `convertirEntero` valida los ids en las páginas y en los handlers de ambas APIs; `esperarRed()` aplica la misma simulación de red a REST y a GraphQL; `useOpcionesViaje` devuelve la misma forma que `useConsulta` (`datos`, `cargando`, `error` y `reintentar`); `conTiempoLimite` aplica el mismo plazo a los dos clientes. Detalle en [decisiones técnicas](decisiones-tecnicas.md#reutilización-dentro-del-proyecto).
- **Funciones puras en `src/utils`**, cada una con su prueba: formato de precios, fechas y duraciones ([`formato.js`](../src/utils/formato.js)), cálculos del viaje ([`viaje.js`](../src/utils/viaje.js)), filtro ([`destinos.js`](../src/utils/destinos.js)), errores ([`errores.js`](../src/utils/errores.js)), ids ([`ids.js`](../src/utils/ids.js)), diagnóstico del mock ([`mock.js`](../src/utils/mock.js)), almacenamiento ([`almacenamiento.js`](../src/utils/almacenamiento.js)), validación de las respuestas ([`validacion.js`](../src/utils/validacion.js)), vigencia de la caché ([`vigencia.js`](../src/utils/vigencia.js)) y estado de las consultas ([`consulta.js`](../src/utils/consulta.js)).
- **Una sola fuente para cada regla:** el nombre del sitio y el país de la agencia en [`sitio.js`](../src/config/sitio.js); las clases de Tailwind compartidas en [`clases.js`](../src/styles/clases.js); los modos de simulación en [`simulacion.js`](../src/mocks/simulacion.js); el tiempo límite y la vigencia de la caché en [`api.js`](../src/config/api.js); la clave y los valores del tema en [`tema.js`](../src/utils/tema.js), también para el script de `index.html`.

**Cómo comprobarlo:** la [estructura](../README.md#estructura) y `npm run lint` sin errores.

## Manejo de estado

| Dónde | Estado | Para qué |
| --- | --- | --- |
| [`useConsulta.js`](../src/hooks/useConsulta.js) | `useState` (resultado y reintento) y `useEffect` (petición con `AbortController` y limpieza) | Consultas REST: carga, error, datos y reintento. Al reintentar o al actualizar un dato vencido se mantienen los datos anteriores |
| [`Destino.jsx`](../src/pages/Destino.jsx) | `useState` (`vueloId` y `hotelId`) | Selección del viaje, local a la página |
| [`BotonTema.jsx`](../src/components/BotonTema.jsx) | `useState` (tema) y `useEffect` (aplica `data-tema` en `<html>`) | Tema claro u oscuro |
| [`SelectorSimulacion.jsx`](../src/components/SelectorSimulacion.jsx) | `useState` (modo) | Modo de simulación de la API |
| [`VolverArriba.jsx`](../src/components/VolverArriba.jsx) | `useEffect` | Volver al inicio de la ventana al navegar |
| [`Destinos.jsx`](../src/pages/Destinos.jsx) | URL con `useSearchParams` | Filtro de región: vive en la URL para poder compartirlo y recargarlo, no en `useState` |
| [`useOpcionesViaje.js`](../src/hooks/useOpcionesViaje.js) | Estado de Apollo (`useQuery`) | Consulta GraphQL con la misma forma que `useConsulta` |

**Estado derivado (se calcula, no se guarda):**
- En `useConsulta` y `useOpcionesViaje`: `cargando`, `error` y `datos` se calculan a partir del resultado, la caché y su vigencia ([`consulta.js`](../src/utils/consulta.js)).
- En la página del destino: el vuelo y el hotel elegidos (se buscan por id en los datos actuales; si tras una actualización ya no existen o se agotaron, quedan como no elegidos), las noches, el total estimado, si las fechas calzan y la anticipación recomendada ([`viaje.js`](../src/utils/viaje.js)).
- En Destinos: la lista filtrada y el texto "Mostrando N de M destinos" ([`destinos.js`](../src/utils/destinos.js)).

**Actualización fluida:** al elegir una opción el resumen cambia de inmediato; al reintentar o al actualizar un dato vencido no desaparecen los datos (`aria-busy` en la región); al cambiar de destino la selección se reinicia con `key` sin mezclar datos.

**Pruebas:** [`viaje.test.js`](../src/utils/viaje.test.js) y [`consulta.test.js`](../src/utils/consulta.test.js) para el estado derivado; [`useConsulta.test.jsx`](../src/hooks/useConsulta.test.jsx) para el estado de las consultas; [`Destino.test.jsx`](../src/pages/Destino.test.jsx) para la selección y el resumen; [`BotonTema.test.jsx`](../src/components/BotonTema.test.jsx) y [`SelectorSimulacion.test.jsx`](../src/components/SelectorSimulacion.test.jsx) para el tema y el modo de simulación; [`Destinos.test.jsx`](../src/pages/Destinos.test.jsx) para el filtro en la URL.

**Cómo comprobarlo:** paso 4 de la [revisión rápida](../README.md#revisión-rápida); con "Respuesta lenta (4 s)" se ve el indicador de carga mientras el título ya está visible.

## Publicación en GitHub Pages

- Repositorio con la estructura descrita en el [README](../README.md#estructura) y documentación en `docs/`.
- Publicación con `npm run deploy` (`gh-pages -d dist`, que antes ejecuta `npm run build`) en la rama `gh-pages` ([`package.json`](../package.json)).
- [`vite.config.js`](../vite.config.js): `base` "/pruebas-unitarias-alonso-basualdo-pfy2202/" al compilar y en `npm run preview`; copia de `index.html` como `404.html`.
- El worker de MSW se registra con la base del sitio ([`browser.js`](../src/mocks/browser.js)), por eso la API simulada funciona en GitHub Pages ([detalle](api-simulada.md#msw-en-producción-y-arranque-del-worker)).

**Cómo comprobarlo:** abrir el [sitio publicado](https://l0ncho.github.io/pruebas-unitarias-alonso-basualdo-pfy2202/) y, en *Application → Service Workers*, ver `mockServiceWorker.js` con el alcance de la subcarpeta.

## Pruebas

- [Matriz de pruebas](pruebas.md#matriz-de-pruebas-en-navegadores) en Chrome (Windows, motor Chromium) y Safari (iPhone, motor WebKit): 17 casos (flujo principal, filtro, selección y total, errores con el selector, 404, recarga en ruta interna, celular o 360 px, ambos temas, tiempo límite, respuesta lenta, errores de id con una falla activa, destino sin oferta, tema sin destello, vencimiento de la caché y advertencia de rutas sin manejador), aprobados en ambos navegadores, salvo la advertencia en la consola, que no se puede revisar en Safari del iPhone.
- [Errores encontrados y corregidos](pruebas.md#errores-encontrados-y-corregidos): el aviso equivocado con el almacenamiento bloqueado en Chrome, con su causa y corrección.
- Compatibilidad prevista en el código: el aviso específico cuando el navegador no permite Service Workers ([`MockNoDisponible.jsx`](../src/components/MockNoDisponible.jsx)), el acceso seguro al almacenamiento ([`almacenamiento.js`](../src/utils/almacenamiento.js)) y fechas calculadas en UTC para no depender de la zona horaria del navegador.
- Pruebas automatizadas con Jest, React Testing Library y MSW: 470 pruebas en 36 archivos, 370 de lógica y 100 de interfaz, con una cobertura de 98,59 % de statements, 95,71 % de branches, 98,51 % de functions y 99,41 % de lines, y un umbral mínimo en `npm run test:coverage` ([detalle](pruebas.md#archivos-de-prueba)).
