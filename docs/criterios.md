# Criterios de la pauta

Evidencia de cada criterio: dónde está en el código, qué pruebas lo cubren y cómo comprobarlo en el sitio. Las rutas del sitio son relativas a https://l0ncho.github.io/viajes-alonso-basualdo-pfy2202/

## 1. Interfaz intuitiva, funcional y responsiva

**Código**
- Estructura común en [`Layout.jsx`](../src/components/Layout.jsx): encabezado con nombre, eslogan, menú con el enlace activo marcado (`aria-current`) y botón de tema; contenido; pie con el selector de simulación.
- Recorrido guiado: Inicio → Destinos (tarjetas con "Ver vuelos y hoteles") → Destino (vuelos, hoteles y resumen) → Volver.
- Cada estado tiene su mensaje y una alternativa: carga ([`Cargando.jsx`](../src/components/Cargando.jsx)), error con Reintentar y salida ([`AvisoErrorConsulta.jsx`](../src/components/AvisoErrorConsulta.jsx)), lista vacía, destino sin oferta, no encontrado y fechas que no calzan.
- Diseño responsivo con los breakpoints `sm` y `md` de Tailwind:
  - Destinos: grilla de 1 columna a 360 px, 2 en `sm` y 3 en `md` ([`Destinos.jsx`](../src/pages/Destinos.jsx)).
  - Destino: una columna en celular con el resumen al final; en `md`, dos columnas con el resumen fijo al costado ([`Destino.jsx`](../src/pages/Destino.jsx)).
- Tema claro y oscuro con variables de color en [`index.css`](../src/index.css); todos los pares de texto y fondo cumplen 4,5:1 ([tabla](decisiones-tecnicas.md#accesibilidad)).

**Cómo comprobarlo:** recorrer el sitio a 360 px (modo dispositivo de las herramientas de desarrollo) y en escritorio, en ambos temas. Ver la [matriz de pruebas](pruebas.md#matriz-de-pruebas-en-navegadores).

## 2. API REST mock

**Código**
- Handler `GET /api/destinos` en [`handlers.js`](../src/mocks/handlers.js), con demora realista y los modos de falla del selector. Detalle en [API simulada](api-simulada.md#api-rest).
- Cliente HTTP con caché por URL, peticiones compartidas y cancelación en [`clienteHttp.js`](../src/services/clienteHttp.js); servicio en [`destinos.js`](../src/services/destinos.js); hook [`useDestinos.js`](../src/hooks/useDestinos.js) sobre [`useConsulta.js`](../src/hooks/useConsulta.js).
- Página [`Destinos.jsx`](../src/pages/Destinos.jsx) con carga, error, lista vacía y lista.

**Pruebas**
- [`handlers.test.js`](../src/mocks/handlers.test.js): la lista con sus campos, ids únicos, el 500 con `{ mensaje }` y la falla de red según el modo de simulación.
- [`clienteHttp.test.js`](../src/services/clienteHttp.test.js): caché, peticiones compartidas, cancelación (incluido el doble efecto de StrictMode) y errores que no quedan en caché.
- [`destinos.test.js`](../src/services/destinos.test.js): dos consultas seguidas hacen una sola petición y un error no queda en caché.

**Cómo comprobarlo:** pasos 1, 2 y 5 de la [revisión rápida](../README.md#revisión-rápida). En *Network* se ve una sola petición a `api/destinos` aunque se navegue varias veces por la página.

## 3. API GraphQL mock

**Código**
- Endpoint GraphQL en [`handlers.js`](../src/mocks/handlers.js): un esquema real (`buildSchema`) contra el que se ejecuta cada consulta, de modo que se responden solo los campos pedidos y los errores llevan `path` y `extensions.code`.
- Consulta `OpcionesViaje` en [`consultas.js`](../src/services/consultas.js): el destino, sus vuelos (fechas, horarios, escalas, precio y asientos) y sus hoteles (estrellas, fechas, precio por noche y habitaciones) en una sola petición.
- Cliente Apollo con caché normalizada en [`clienteApollo.js`](../src/services/clienteApollo.js) y hook [`useOpcionesViaje.js`](../src/hooks/useOpcionesViaje.js).
- Página [`Destino.jsx`](../src/pages/Destino.jsx).

**Pruebas**
- [`handlers.test.js`](../src/mocks/handlers.test.js): destino con vuelos y hoteles, solo los campos pedidos, destino sin oferta, ids equivalentes ("7" y "007"), id inexistente (`NOT_FOUND`), id inválido (`BAD_USER_INPUT`) y los modos de simulación.
- [`clienteApollo.test.js`](../src/services/clienteApollo.test.js): integración con el cliente Apollo real; caché por id, una sola petición al volver a un destino y la clase de error que entrega Apollo en cada caso con su tipo normalizado.

**Cómo comprobarlo:** pasos 3 a 6 de la [revisión rápida](../README.md#revisión-rápida). En *Network*, la petición `graphql` muestra en *Payload* la consulta y sus variables, y en *Response* solo los campos pedidos.

## 4. React Router

**Código**
- Rutas en [`AppRoutes.jsx`](../src/routes/AppRoutes.jsx): `/`, `/destinos`, `/destinos/:id` y `*` (página no encontrada), todas dentro de `Layout` y con carga diferida (`lazy`). El único `Suspense` envuelve el `Outlet` de `Layout`, así que el encabezado y el pie no desaparecen al cambiar de página.
- `BrowserRouter` con `basename={import.meta.env.BASE_URL}` en [`main.jsx`](../src/main.jsx): las rutas funcionan en la subcarpeta de GitHub Pages.
- Navegación solo con `Link`, `NavLink` y `useNavigate`. "Volver" usa [`useVolver.js`](../src/hooks/useVolver.js): vuelve atrás si la página anterior es del sitio y, si se entró directo a la URL, va a la ruta de respaldo.
- Parámetros: `useParams` para el id del destino (validado con [`convertirEntero`](../src/utils/ids.js)) y `useSearchParams` para el filtro de región.
- [`VolverArriba.jsx`](../src/components/VolverArriba.jsx) lleva la ventana al inicio al navegar, y respeta la posición al usar atrás y adelante.
- El build copia `index.html` como `404.html` ([`vite.config.js`](../vite.config.js)) para que recargar una ruta interna funcione en GitHub Pages.

**Cómo comprobarlo:** paso 7 de la [revisión rápida](../README.md#revisión-rápida); entrar directo a `/destinos/1` y pulsar **Volver** (va a Destinos, no sale del sitio).

## 5. Código modular y reutilizable

- **Capas separadas:** las páginas nunca llaman a `fetch` ni a Apollo; usan hooks (`useDestinos`, `useOpcionesViaje`), que usan servicios (`clienteHttp`, `clienteApollo`, `consultas`). Los datos del mock (`datos.js`) están separados de su lógica (`handlers.js`).
- **Componentes reutilizables:** `Boton`, `Aviso`, `AvisoErrorConsulta`, `Cargando` y `TituloPagina` se usan en varias páginas. `GrupoOpciones` sirve para vuelos y para hoteles, y `HorarioTramo` para la tarjeta del vuelo y para el resumen.
- **Funciones puras en `src/utils`**, cada una con su prueba: formato de precios, fechas y duraciones ([`formato.js`](../src/utils/formato.js)), cálculos del viaje ([`viaje.js`](../src/utils/viaje.js)), filtro ([`destinos.js`](../src/utils/destinos.js)), errores ([`errores.js`](../src/utils/errores.js)), ids ([`ids.js`](../src/utils/ids.js)), diagnóstico del mock ([`mock.js`](../src/utils/mock.js)) y almacenamiento ([`almacenamiento.js`](../src/utils/almacenamiento.js)).
- **Una sola fuente para cada regla:** el nombre del sitio y el país de la agencia en [`sitio.js`](../src/config/sitio.js); las clases de Tailwind compartidas en [`clases.js`](../src/styles/clases.js); los modos de simulación en [`simulacion.js`](../src/mocks/simulacion.js).
- **Reutilización entre proyectos:** la base técnica proviene de Librarte, el proyecto de la semana 4 ([detalle](decisiones-tecnicas.md#reutilización-desde-librarte)).

**Cómo comprobarlo:** la [estructura](../README.md#estructura) y `npm run lint` sin errores.

## 6. Manejo de estado con useState y useEffect

| Dónde | Estado | Para qué |
| --- | --- | --- |
| [`useConsulta.js`](../src/hooks/useConsulta.js) | `useState` (resultado y reintento) y `useEffect` (petición con `AbortController` y limpieza) | Consultas REST: carga, error, datos y reintento. Al reintentar se mantienen los datos anteriores |
| [`Destino.jsx`](../src/pages/Destino.jsx) | `useState` (`vueloId` y `hotelId`) | Selección del viaje, local a la página |
| [`BotonTema.jsx`](../src/components/BotonTema.jsx) | `useState` (tema) y `useEffect` (aplica `data-tema` en `<html>`) | Tema claro u oscuro |
| [`SelectorSimulacion.jsx`](../src/components/SelectorSimulacion.jsx) | `useState` (modo) | Modo de simulación de la API |
| [`VolverArriba.jsx`](../src/components/VolverArriba.jsx) | `useEffect` | Volver al inicio de la ventana al navegar |
| [`Destinos.jsx`](../src/pages/Destinos.jsx) | URL con `useSearchParams` | Filtro de región: vive en la URL para poder compartirlo y recargarlo, no en `useState` |
| [`useOpcionesViaje.js`](../src/hooks/useOpcionesViaje.js) | Estado de Apollo (`useQuery`) | Consulta GraphQL con la misma forma que `useConsulta` |

**Estado derivado (se calcula, no se guarda):**
- En `useConsulta`: `cargando`, `error` y `datos` se calculan a partir del resultado y la caché.
- En la página del destino: el vuelo y el hotel elegidos (se buscan por id), las noches, el total estimado, si las fechas calzan y la anticipación recomendada ([`viaje.js`](../src/utils/viaje.js)).
- En Destinos: la lista filtrada y el texto "Mostrando N de M destinos" ([`destinos.js`](../src/utils/destinos.js)).

**Actualización fluida:** al elegir una opción el resumen cambia de inmediato; al reintentar no desaparecen los datos (`aria-busy` en la región); al cambiar de destino la selección se reinicia con `key` sin mezclar datos.

**Cómo comprobarlo:** paso 4 de la [revisión rápida](../README.md#revisión-rápida); con "Respuesta lenta (4 s)" se ve el indicador de carga mientras el título ya está visible.

## 7. Publicación en GitHub

- Repositorio con la estructura descrita en el [README](../README.md#estructura) y documentación en `docs/`.
- Publicación con `npm run deploy` (`gh-pages -d dist`, que antes ejecuta `npm run build`) en la rama `gh-pages` ([`package.json`](../package.json)).
- [`vite.config.js`](../vite.config.js): `base` "/viajes-alonso-basualdo-pfy2202/" al compilar y en `npm run preview`; copia de `index.html` como `404.html`.
- El worker de MSW se registra con la base del sitio ([`browser.js`](../src/mocks/browser.js)), por eso la API simulada funciona en GitHub Pages ([detalle](api-simulada.md#msw-en-producción-y-arranque-del-worker)).

**Cómo comprobarlo:** abrir el [sitio publicado](https://l0ncho.github.io/viajes-alonso-basualdo-pfy2202/) y, en *Application → Service Workers*, ver `mockServiceWorker.js` con el alcance de la subcarpeta.

## 8. Pruebas en distintos navegadores

- [Matriz de pruebas](pruebas.md#matriz-de-pruebas-en-navegadores) en Chrome y Edge (Windows) y Safari (iPhone), con casos de flujo, teclado, errores, 360 px y ambos temas.
- [Errores encontrados y corregidos](pruebas.md#errores-encontrados-y-corregidos): el aviso equivocado con el almacenamiento bloqueado en Chrome, con su causa y corrección.
- Compatibilidad prevista en el código: el aviso específico cuando el navegador no permite Service Workers ([`MockNoDisponible.jsx`](../src/components/MockNoDisponible.jsx)), el acceso seguro al almacenamiento ([`almacenamiento.js`](../src/utils/almacenamiento.js)) y fechas calculadas en UTC para no depender de la zona horaria del navegador.
- Pruebas automatizadas: 225 pruebas en 11 archivos ([detalle](pruebas.md#pruebas-automatizadas)).
