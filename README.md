# AirFly · Vuelos y hoteles para tu próximo viaje

Aplicación de una sola página (SPA) en React para una agencia de viajes. El usuario explora los destinos disponibles (API REST simulada), elige uno y compara sus vuelos y hoteles (API GraphQL simulada) para armar una cotización de su viaje. Ambas APIs se simulan con MSW (Mock Service Worker) en el navegador, con demoras realistas y errores que se pueden provocar desde la interfaz.

Actividad sumativa de la semana 5 de Frontend II (PFY2202).

- **Sitio publicado:** https://l0ncho.github.io/viajes-alonso-basualdo-pfy2202/
- **Repositorio:** https://github.com/L0ncho/viajes-alonso-basualdo-pfy2202
- **Base técnica reutilizada** de mi proyecto anterior, Librarte (semana 4): [libreria-alonso-basualdo-pfy2202](https://github.com/L0ncho/libreria-alonso-basualdo-pfy2202). El detalle de qué se reutilizó y qué es nuevo está en [decisiones técnicas](docs/decisiones-tecnicas.md#reutilización-desde-librarte).

## Revisión rápida

En el sitio publicado, con las herramientas de desarrollo abiertas en la pestaña *Network*. El selector **"Simulación de la API"** está en el pie de página.

1. **REST:** desde Inicio, pulsa **Ver destinos**. Se piden los 8 destinos con una sola petición `GET …/api/destinos`, respondida por el Service Worker.
2. **Filtro:** elige **Nacionales**. Se muestran 4 destinos, el texto dice "Mostrando 4 de 8 destinos" y la URL queda con `?region=nacionales`, sin nuevas peticiones. Al recargar, el filtro se mantiene.
3. **GraphQL:** abre **San Pedro de Atacama → Ver vuelos y hoteles**. Una sola petición `POST …/graphql` trae el destino, sus vuelos y sus hoteles. La nota "Cómo llegar" explica que los vuelos llegan a Calama. Pulsa **Volver** y entra de nuevo: no hay una segunda petición (caché de Apollo).
4. **Selección del viaje:** elige el vuelo de **AeroAndes** y el **Hotel Desierto Rojo**. El resumen muestra 5 noches de viaje, 5 de hotel y un total estimado de **$679.990** (vuelo $189.990 más 5 noches de $98.000). Si cambias al **Lodge Altiplano** (estadía en enero), el resumen advierte que las fechas no calzan. Las opciones **Agotado** no se pueden elegir.
5. **Errores:** elige **Error del servidor (500)** en el selector y abre **Cusco**. Aparece "Error del servidor" con **Reintentar** y un enlace a los destinos. Vuelve a **Normal**, pulsa **Reintentar** y los datos llegan sin salir de la página. Con **Sin conexión** el aviso es distinto ("Sin conexión") y ofrece las mismas alternativas.
6. **No encontrado y sin oferta:** abre `/destinos/99` (destino inexistente según la API) y `/destinos/abc` (id inválido: no hace ninguna petición). Ambos muestran "Destino no encontrado", sin Reintentar. **Madrid** no tiene vuelos ni hoteles y lo indica con su propio mensaje.
7. **404 y recarga:** abre `/cualquier-cosa` para ver "Página no encontrada". Recarga estando en `/destinos/1`: la página carga igual gracias al `404.html` que genera el build.

## Criterios de la pauta

| Criterio | Puntaje | Dónde se cumple |
| --- | --- | --- |
| 1. Interfaz intuitiva, funcional y responsiva | 15 | [Detalle](docs/criterios.md#1-interfaz-intuitiva-funcional-y-responsiva) · [`Layout.jsx`](src/components/Layout.jsx), [`Destino.jsx`](src/pages/Destino.jsx), [`index.css`](src/index.css) |
| 2. API REST mock que lista datos sin errores | 15 | [Detalle](docs/criterios.md#2-api-rest-mock) · [`handlers.js`](src/mocks/handlers.js), [`clienteHttp.js`](src/services/clienteHttp.js), [`Destinos.jsx`](src/pages/Destinos.jsx) |
| 3. API GraphQL mock con información detallada | 15 | [Detalle](docs/criterios.md#3-api-graphql-mock) · [`handlers.js`](src/mocks/handlers.js), [`consultas.js`](src/services/consultas.js), [`useOpcionesViaje.js`](src/hooks/useOpcionesViaje.js) |
| 4. React Router con navegación fluida | 10 | [Detalle](docs/criterios.md#4-react-router) · [`AppRoutes.jsx`](src/routes/AppRoutes.jsx), [`useVolver.js`](src/hooks/useVolver.js) |
| 5. Código modular y reutilizable | 10 | [Detalle](docs/criterios.md#5-código-modular-y-reutilizable) · [estructura](#estructura) |
| 6. Estado con useState y useEffect | 10 | [Detalle](docs/criterios.md#6-manejo-de-estado-con-usestate-y-useeffect) · [`useConsulta.js`](src/hooks/useConsulta.js), [`Destino.jsx`](src/pages/Destino.jsx) |
| 7. Publicación en GitHub y gh-pages | 10 | [Detalle](docs/criterios.md#7-publicación-en-github) · [`vite.config.js`](vite.config.js), [`package.json`](package.json) |
| 8. Pruebas en distintos navegadores | 15 | [Detalle](docs/criterios.md#8-pruebas-en-distintos-navegadores) · [pruebas](docs/pruebas.md) |

## Alcance

- **Cotización, no reserva:** el usuario elige un vuelo y un hotel y ve el total estimado para **1 pasajero y 1 habitación**. No se realiza ninguna reserva y la API GraphQL no tiene mutaciones: la actividad no las pide.
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
npm run build     # compilación en dist/ (base "/viajes-alonso-basualdo-pfy2202/")
npm run preview   # sirve dist/ con la misma base que GitHub Pages
npm run deploy    # compila y publica dist/ en la rama gh-pages
```

## Estructura

```
src/
  config/       nombre, eslogan y país de la agencia (sitio.js)
  mocks/        datos.js (solo datos), handlers.js (REST y GraphQL), browser.js, simulacion.js
  services/     cliente HTTP con caché, servicio de destinos, cliente Apollo y consultas GraphQL
  hooks/        useConsulta, useDestinos, useOpcionesViaje, useVolver
  routes/       AppRoutes.jsx
  pages/        Inicio, Destinos, Destino, NoEncontrado
  components/   comunes (Layout, Boton, Aviso…), destinos/ y destino/
  utils/        funciones puras: errores, ids, formato, viaje, destinos, mock, almacenamiento, tema
  styles/       clases de Tailwind compartidas
  test/         configuración y utilidades de las pruebas
docs/           documentación técnica
```

## Documentación

- [Criterios de la pauta](docs/criterios.md): evidencia de cada criterio y cómo comprobarlo.
- [API simulada](docs/api-simulada.md): endpoints REST y GraphQL, modos de simulación y escenarios de los datos.
- [REST frente a GraphQL](docs/rest-vs-graphql.md): comparación aplicada a AirFly.
- [Decisiones técnicas](docs/decisiones-tecnicas.md): reutilización, diferencias con la guía, capa de datos, carga, estado y accesibilidad.
- [Pruebas](docs/pruebas.md): pruebas automatizadas, matriz de navegadores y errores corregidos.
- [Diagramas](docs/diagramas.md): arquitectura y flujos en Mermaid.
