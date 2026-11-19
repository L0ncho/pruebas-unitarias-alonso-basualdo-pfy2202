import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.jsx'
import MockNoDisponible from './components/MockNoDisponible.jsx'
import { ESTADOS_MOCK, estadoMock, soportaServiceWorker } from './utils/mock.js'

function renderizar(estado) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      {estado === ESTADOS_MOCK.activo ? (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <App />
        </BrowserRouter>
      ) : (
        <MockNoDisponible estado={estado} />
      )}
    </StrictMode>,
  )
}

// Arranca la API simulada y devuelve los errores observados en cada etapa (null si no hubo).
// El mock se importa de forma dinámica: MSW queda en un archivo propio que no cambia entre
// publicaciones y el navegador lo reutiliza desde su caché. Importarlo también puede fallar
// sin problemas de red: MSW lee localStorage al cargarse y, con el almacenamiento bloqueado,
// el navegador lanza SecurityError. estadoMock distingue ambos casos
async function iniciarApiSimulada() {
  let iniciarMock
  try {
    ;({ iniciarMock } = await import('./mocks/browser.js'))
  } catch (error) {
    console.error('No se pudo cargar la API simulada:', error)
    return { errorImportacion: error }
  }

  try {
    await iniciarMock()
    return {}
  } catch (error) {
    console.error('No se pudo iniciar la API simulada:', error)
    return { errorArranque: error }
  }
}

// Se renderiza después de iniciar la API simulada para que ninguna petición se adelante al
// worker. Si el navegador no ofrece Service Workers no se intenta: se muestra el aviso que lo
// explica en lugar de una aplicación donde todas las consultas fallarían como "sin conexión"
async function arrancar() {
  const soportado = soportaServiceWorker(window.navigator)
  const errores = soportado ? await iniciarApiSimulada() : {}
  renderizar(estadoMock({ soportado, ...errores }))
}

arrancar()
