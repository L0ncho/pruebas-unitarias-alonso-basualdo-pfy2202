# Diagramas

GitHub muestra estos diagramas directamente a partir del código Mermaid.

## Arquitectura

Las páginas usan hooks; los hooks usan los servicios; las peticiones las responde el Service Worker de MSW con los handlers y los datos del mock.

```mermaid
flowchart TB
  subgraph Paginas["Páginas (src/pages)"]
    Inicio["Inicio"]
    Destinos["Destinos"]
    Destino["Destino"]
    NoEncontrado["NoEncontrado"]
  end

  subgraph Hooks["Hooks (src/hooks)"]
    useDestinos["useDestinos"]
    useConsulta["useConsulta<br/>useState + useEffect"]
    useOpcionesViaje["useOpcionesViaje<br/>useQuery de Apollo"]
  end

  subgraph Servicios["Servicios (src/services)"]
    servicioDestinos["destinos.js"]
    clienteHttp["clienteHttp.js<br/>caché por URL (5 min)"]
    consultas["consultas.js<br/>OpcionesViaje"]
    clienteApollo["clienteApollo.js<br/>InMemoryCache (5 min)"]
    tiempoLimite["tiempoLimite.js<br/>15 s"]
  end

  errores["utils/errores.js<br/>normalizarError"]
  validacion["utils/validacion.js"]

  subgraph Mock["MSW (src/mocks)"]
    worker["Service Worker<br/>mockServiceWorker.js"]
    handlerRest["GET /api/destinos"]
    handlerGraphql["POST /graphql<br/>esquema + ejecutor diferido"]
    datos["datos.js"]
  end

  Destinos --> useDestinos --> useConsulta --> clienteHttp
  useDestinos -.-> servicioDestinos -.-> clienteHttp
  Destino --> useOpcionesViaje --> consultas
  useOpcionesViaje --> clienteApollo
  clienteHttp -- fetch --> worker
  clienteApollo -- fetch --> worker
  worker --> handlerRest --> datos
  worker --> handlerGraphql --> datos
  clienteHttp --> tiempoLimite
  clienteApollo --> tiempoLimite
  clienteHttp --> validacion
  clienteApollo --> validacion
  clienteHttp --> errores
  useOpcionesViaje --> errores
```

## Flujo del usuario

```mermaid
flowchart LR
  Inicio["Inicio"] -- "Ver destinos" --> Destinos["Destinos<br/>(REST)"]
  Destinos -- "Filtro: Todos, Nacionales,<br/>Internacionales (?region=)" --> Destinos
  Destinos -- "Ver vuelos y hoteles" --> Destino["Destino<br/>(GraphQL)"]
  Destino --> SinOferta{"¿Tiene vuelos<br/>u hoteles?"}
  SinOferta -- "No (Madrid)" --> Mensaje["Mensaje sin oferta<br/>y enlace a destinos"]
  SinOferta -- "Sí" --> Eleccion["Elegir vuelo y hotel<br/>(radios)"]
  Eleccion --> Resumen["Resumen: noches, total,<br/>advertencia de fechas<br/>y anticipación"]
  Resumen -- "Limpiar selección" --> Eleccion
  Destino -- "Volver" --> Destinos
```

## Arranque del mock y sus avisos

```mermaid
flowchart TB
  inicio["main.jsx"] --> soporta{"¿navigator.serviceWorker<br/>disponible?"}
  soporta -- "No" --> sinSW["Aviso: Este navegador<br/>no permite Service Workers"]
  soporta -- "Sí" --> importar["import('./mocks/browser.js')"]
  importar -- "Falla" --> descarga{"¿Es falla de descarga<br/>del módulo? (TypeError<br/>con el mensaje del navegador)"}
  descarga -- "Sí" --> errorCarga["Aviso: No se pudieron<br/>descargar los datos simulados"]
  descarga -- "No (por ejemplo, SecurityError<br/>por almacenamiento bloqueado)" --> errorInicio["Aviso: El navegador no permitió<br/>iniciar los datos simulados"]
  importar -- "OK" --> start["worker.start()"]
  start -- "Falla" --> errorInicio
  start -- "OK" --> app["Renderiza la aplicación<br/>con BrowserRouter"]
```

## Flujo de una consulta con caché y errores

Consulta REST con `useConsulta`. La consulta GraphQL sigue el mismo esquema con la caché de Apollo: `cache-first` con un dato vigente, `cache-and-network` con uno vencido y `refetch()` para reintentar.

```mermaid
sequenceDiagram
  participant P as Página
  participant H as useConsulta
  participant C as clienteHttp
  participant W as MSW (Service Worker)

  P->>H: useDestinos()
  H->>C: leerCache(ruta) y cacheVigente(ruta)
  alt Dato vigente (menos de 5 minutos)
    C-->>H: datos
    H-->>P: datos, sin indicador de carga
  else Dato vencido o sin caché
    H-->>P: dato vencido (si hay) y cargando (aria-busy)
    H->>C: obtenerJson(ruta, signal)
    C->>W: fetch con tiempo límite de 15 s (o se une a la petición en curso)
    W->>W: esperarRed(): demora y modo de simulación
    alt Normal
      W-->>C: 200 con datos
      C->>C: valida y guarda en caché con la hora
      C-->>H: datos
      H-->>P: datos nuevos, sin parpadeo
    else Error del servidor, sin conexión, sin respuesta o datos inválidos
      W-->>C: 500, falla de red, nada en 15 s o datos inválidos
      C-->>H: normalizarError: servidor, red, tiempo-agotado o datos-incompletos (no se guarda en caché)
      H-->>P: aviso con Reintentar y enlace de salida, con el dato vencido visible
      P->>H: reintentar()
      H->>C: obtenerJson(ruta, forzar)
    end
  end
  Note over H,C: Al desmontar, el efecto cancela con AbortController,<br/>y una cancelación nunca se muestra como error
```

## Arquitectura de pruebas

Jest carga el setup en cada archivo; el setup inicia un servidor MSW único con los mismos manejadores del navegador. Las pruebas renderizan la interfaz con React Testing Library dentro de un `MemoryRouter`, y las páginas usan los clientes reales, cuyas peticiones responde ese servidor.

```mermaid
flowchart TB
  jest["Jest<br/>jest-fixed-jsdom + babel-jest"] --> setup["Setup<br/>src/test/configuracion.js"]
  jest --> pruebas["Archivos de prueba<br/>*.test.js · *.test.jsx"]

  setup -- "listen / resetHandlers / close" --> servidor
  setup -- "después de cada prueba" --> limpieza["Limpieza: storages,<br/>caché HTTP y cliente Apollo"]

  subgraph servidor["Servidor MSW compartido (msw/node)"]
    rest["GET /api/destinos"]
    gql["POST /graphql<br/>esquema real"]
    datos["datos.js"]
    rest --> datos
    gql --> datos
  end

  subgraph rtl["React Testing Library + user-event"]
    renderizar["renderizar / renderizarRuta<br/>StrictMode + MemoryRouter"]
    paginas["Páginas y componentes"]
    proveedor["ProveedorApollo real<br/>(cliente de la aplicación)"]
    renderizar --> paginas
    paginas --> proveedor
  end

  pruebas --> renderizar
  pruebas -. "server.use (casos puntuales)" .-> servidor
  pruebas -. "modo en sessionStorage" .-> servidor
  paginas -- "clienteHttp: fetch" --> rest
  proveedor -- "clienteApollo: fetch" --> gql
  rest -- "respuesta" --> paginas
  gql -- "respuesta" --> proveedor
```
