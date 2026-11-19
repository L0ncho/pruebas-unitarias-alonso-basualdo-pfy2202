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
    clienteHttp["clienteHttp.js<br/>caché por URL"]
    consultas["consultas.js<br/>OpcionesViaje"]
    clienteApollo["clienteApollo.js<br/>InMemoryCache"]
  end

  errores["utils/errores.js<br/>normalizarError"]

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

Consulta REST con `useConsulta`. La consulta GraphQL sigue el mismo esquema con la caché de Apollo (`cache-first`) y `refetch()` para reintentar.

```mermaid
sequenceDiagram
  participant P as Página
  participant H as useConsulta
  participant C as clienteHttp
  participant W as MSW (Service Worker)

  P->>H: useDestinos()
  H->>C: leerCache(ruta)
  alt Hay datos en caché
    C-->>H: datos
    H-->>P: datos, sin indicador de carga
  else Sin caché
    H-->>P: cargando (aria-busy)
    H->>C: obtenerJson(ruta, signal)
    C->>W: fetch (o se une a la petición en curso)
    W->>W: esperarRed(): demora y modo de simulación
    alt Normal
      W-->>C: 200 con datos
      C->>C: guarda en caché
      C-->>H: datos
      H-->>P: datos
    else Error del servidor o sin conexión
      W-->>C: 500 o falla de red
      C-->>H: normalizarError: servidor o red (no se guarda en caché)
      H-->>P: aviso con Reintentar y enlace de salida
      P->>H: reintentar()
      H->>C: obtenerJson(ruta, forzar)
    end
  end
  Note over H,C: Al desmontar, el efecto cancela con AbortController;<br/>una cancelación nunca se muestra como error
```
