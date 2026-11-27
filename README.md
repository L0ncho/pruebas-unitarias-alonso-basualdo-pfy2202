# AirFly · Vuelos y hoteles para tu próximo viaje

Aplicación de una sola página (SPA) en React para una agencia de viajes. El usuario explora los destinos disponibles (API REST simulada), elige uno y compara sus vuelos y hoteles (API GraphQL simulada) para armar una cotización de su viaje. Ambas APIs se simulan con MSW (Mock Service Worker) en el navegador, con demoras realistas y errores que se pueden provocar desde la interfaz.

- **Sitio publicado:** https://l0ncho.github.io/pruebas-unitarias-alonso-basualdo-pfy2202/
- **Repositorio:** https://github.com/L0ncho/pruebas-unitarias-alonso-basualdo-pfy2202

## Revisión rápida

Un recorrido por el sitio publicado para ver sus funciones en unos minutos. Conviene abrir las herramientas de desarrollo del navegador en la pestaña *Network* para ver las peticiones. El selector **"Simulación de la API"** está en el pie de página.

1. **REST:** desde Inicio, pulsa **Ver destinos**. Se piden los 8 destinos con una sola petición `GET …/api/destinos`, respondida por el Service Worker.
2. **Filtro:** elige **Nacionales**. Se muestran 4 destinos, el texto dice "Mostrando 4 de 8 destinos" y la URL queda con `?region=nacionales`, sin nuevas peticiones. Al recargar, el filtro se mantiene.
3. **GraphQL:** abre **San Pedro de Atacama → Ver vuelos y hoteles**. Una sola petición `POST …/graphql` trae el destino, sus vuelos y sus hoteles. La nota "Cómo llegar" explica que los vuelos llegan a Calama. Pulsa **Volver** y entra de nuevo: no hay una segunda petición (caché de Apollo).
4. **Selección del viaje:** elige el vuelo de **AeroAndes** y el **Hotel Desierto Rojo**. El resumen muestra 5 noches de viaje, 5 de hotel y un total estimado de **$679.990** (vuelo $189.990 más 5 noches de $98.000). Si cambias al **Lodge Altiplano** (estadía en enero), el resumen advierte que las fechas no calzan. Las opciones **Agotado** no se pueden elegir.
5. **Errores:** elige **Error del servidor (500)** en el selector y abre **Cusco**. Aparece "Error del servidor" con **Reintentar** y un enlace a los destinos. Vuelve a **Normal**, pulsa **Reintentar** y los datos llegan sin salir de la página. Con **Sin conexión** el aviso es distinto ("Sin conexión") y ofrece las mismas alternativas. Con **Sin respuesta**, el servidor nunca responde: a los 15 s aparece "Tiempo agotado" con **Reintentar**.
6. **No encontrado y sin oferta:** abre `/destinos/99` (destino inexistente según la API) y `/destinos/abc` (id inválido: no hace ninguna petición). Ambos muestran "Destino no encontrado", sin Reintentar, aunque haya una falla activa en el selector. **Madrid** no tiene vuelos ni hoteles y lo indica con su propio mensaje.
7. **404 y recarga:** abre `/cualquier-cosa` para ver "Página no encontrada". Recarga estando en `/destinos/1`: la página carga igual gracias al `404.html` que genera el build.
8. **Vencimiento de la caché:** con un destino ya visitado, espera 5 minutos y vuelve a abrirlo. Los vuelos y hoteles aparecen al instante con el indicador de carga encima, y una sola petición `graphql` los actualiza en segundo plano. Lo mismo ocurre con el listado de destinos.

## Qué incluye y dónde verlo

| Tema | Qué incluye | Dónde verlo |
| --- | --- | --- |
| Interfaz responsiva | Recorrido Inicio → Destinos → Destino, avisos para cada estado, diseño de 360 px a escritorio, tema claro y oscuro | [Detalle](docs/funcionalidades.md#interfaz-responsiva) · [`Layout.jsx`](src/components/Layout.jsx), [`Destino.jsx`](src/pages/Destino.jsx), [`index.css`](src/index.css) |
| API REST simulada | `GET /api/destinos` con cliente HTTP propio: caché por URL que vence a los 5 minutos, tiempo límite de 15 s, validación de la respuesta y cancelación | [Detalle](docs/funcionalidades.md#api-rest-simulada) · [`handlers.js`](src/mocks/handlers.js), [`clienteHttp.js`](src/services/clienteHttp.js), [`Destinos.jsx`](src/pages/Destinos.jsx) |
| API GraphQL simulada | Una consulta con el destino, sus vuelos y sus hoteles; Apollo Client con caché normalizada, con el mismo vencimiento, tiempo límite y validación que REST | [Detalle](docs/funcionalidades.md#api-graphql-simulada) · [`handlers.js`](src/mocks/handlers.js), [`consultas.js`](src/services/consultas.js), [`useOpcionesViaje.js`](src/hooks/useOpcionesViaje.js) |
| Navegación | React Router con carga diferida, Volver seguro, filtro en la URL, página 404 y recarga en rutas internas | [Detalle](docs/funcionalidades.md#navegación) · [`AppRoutes.jsx`](src/routes/AppRoutes.jsx), [`useVolver.js`](src/hooks/useVolver.js) |
| Organización y reutilización del código | Capas separadas, componentes y funciones compartidos entre páginas y entre las dos APIs | [Detalle](docs/funcionalidades.md#organización-y-reutilización-del-código) · [estructura](#estructura) |
| Manejo de estado | `useState` y `useEffect`, estado derivado y estado en la URL | [Detalle](docs/funcionalidades.md#manejo-de-estado) · [`useConsulta.js`](src/hooks/useConsulta.js), [`Destino.jsx`](src/pages/Destino.jsx) |
| Publicación en GitHub Pages | Base de la subcarpeta, `404.html` y worker de MSW registrado con la base | [Detalle](docs/funcionalidades.md#publicación-en-github-pages) · [`vite.config.js`](vite.config.js), [`package.json`](package.json) |
| Pruebas | 370 pruebas automatizadas y pruebas manuales en Chrome y Safari | [Detalle](docs/funcionalidades.md#pruebas) · [pruebas](docs/pruebas.md) |

## Alcance

- **Cotización, no reserva:** el usuario elige un vuelo y un hotel y ve el total estimado para **1 pasajero y 1 habitación**. El sitio es un cotizador: no realiza reservas, por eso la API GraphQL solo tiene consultas y no mutaciones.
- **Destinos sin aeropuerto propio:** San Pedro de Atacama (vuelos a Calama) y Valparaíso (vuelos a Santiago) muestran una nota con la distancia aproximada y que el traslado terrestre no está incluido. Puerto Natales indica que sus vuelos son principalmente de temporada alta.
- **Horarios:** horas locales de cada aeropuerto y duración de cada tramo; ningún tramo llega al día siguiente.
- **Datos simulados:** todos los destinos, aerolíneas, hoteles y precios son ficticios.

## Stack

| Herramienta | Versión | Uso |
| --- | --- | --- |
| React | 19.3 | Interfaz |
| React Router | 8.5 (paquete `react-router`) | Rutas en modo declarativo con `BrowserRouter` |
| Vite | 8.3 | Servidor de desarrollo y compilación |
| Tailwind CSS | 4.3 (con `@tailwindcss/vite`) | Estilos, sin `tailwind.config.js` ni PostCSS |
| MSW | 2.15 | API REST y GraphQL simuladas en el navegador |
| Apollo Client | 4.3 (con `graphql` 16.15 y `rxjs` 7.8) | Consultas GraphQL y caché normalizada |
| Vitest | 5.1 | Pruebas automatizadas |
| ESLint | 10.14 | Revisión del código |
| gh-pages | 6.3 | Publicación de `dist` en la rama `gh-pages` |

## Requisitos y comandos

Requiere **Node 22.22 o superior**.

```bash
npm install       # instala las dependencias
npm run dev       # servidor de desarrollo (base "/")
npm run lint      # revisión del código con ESLint
npm run test      # pruebas con Vitest
npm run build     # compilación en dist/ (base "/pruebas-unitarias-alonso-basualdo-pfy2202/")
npm run preview   # sirve dist/ con la misma base que GitHub Pages
npm run deploy    # compila y publica dist/ en la rama gh-pages
```

## Estructura

```
src/
  config/       nombre, eslogan y país de la agencia (sitio.js); tiempo límite y vigencia de la caché (api.js)
  mocks/        datos.js (solo datos), handlers.js (REST y GraphQL), browser.js, simulacion.js
  services/     cliente HTTP con caché, servicio de destinos, cliente Apollo, consultas GraphQL, tiempo límite y reloj
  hooks/        useConsulta, useDestinos, useOpcionesViaje, useVolver
  routes/       AppRoutes.jsx
  pages/        Inicio, Destinos, Destino, NoEncontrado
  components/   comunes (Layout, Boton, Aviso…), destinos/ y destino/
  utils/        funciones puras: errores, ids, formato, viaje, destinos, mock, almacenamiento, tema, validacion, vigencia, consulta
  styles/       clases de Tailwind compartidas
  test/         configuración y utilidades de las pruebas
docs/           documentación técnica
```

## Documentación

- [Funcionalidades](docs/funcionalidades.md): qué incluye el sitio, dónde está en el código y cómo comprobarlo.
- [API simulada](docs/api-simulada.md): endpoints REST y GraphQL, modos de simulación y escenarios de los datos.
- [REST frente a GraphQL](docs/rest-vs-graphql.md): comparación aplicada a AirFly.
- [Decisiones técnicas](docs/decisiones-tecnicas.md): reutilización, herramientas elegidas, capa de datos, carga, estado y accesibilidad.
- [Pruebas](docs/pruebas.md): pruebas automatizadas, matriz de navegadores y errores corregidos.
- [Diagramas](docs/diagramas.md): arquitectura y flujos en Mermaid.
