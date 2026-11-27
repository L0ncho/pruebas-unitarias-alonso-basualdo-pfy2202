import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router'
import UbicacionActual from './UbicacionActual.jsx'
import AppRoutes from '../routes/AppRoutes.jsx'

// Utilidades de renderizado para las pruebas de componentes y páginas.
// - Enrutador en memoria con la ruta inicial indicada, en lugar de BrowserRouter (no hay basename:
//   en las pruebas la base es "/").
// - StrictMode, igual que main.jsx: el doble montaje de los efectos también se prueba.
// - Sin proveedor de Apollo propio: las páginas que usan GraphQL montan el ProveedorApollo real
//   con el cliente de la aplicación, igual que en el navegador. El setup vacía su caché (y la del
//   cliente HTTP) después de cada prueba.
// - Las peticiones las responde el servidor MSW del setup, con los handlers del sitio.
// Devuelve lo mismo que render() de Testing Library, más usuario (user-event) para interactuar

// Espera de las consultas a la API simulada con temporizadores reales: las páginas se cargan de
// forma diferida y el mock demora entre 400 y 900 ms en responder
export const ESPERA = { timeout: 3000 }

// Monta un componente dentro del enrutador. Opciones:
// - ruta: la URL inicial (por defecto, "/")
// - entradas: historial inicial del enrutador; se abre en la última. Simula haber llegado
//   navegando dentro del sitio (solo la primera entrada tiene la key "default")
// - opcionesUsuario: opciones de userEvent.setup (por ejemplo, advanceTimers con temporizadores falsos)
// - conUbicacion: agrega UbicacionActual junto al componente, para leer la URL actual por su rol
export function renderizar(ui, { ruta = '/', entradas, opcionesUsuario, conUbicacion = false } = {}) {
  const usuario = userEvent.setup(opcionesUsuario)
  const historial = entradas ?? [ruta]
  const resultado = render(
    <StrictMode>
      <MemoryRouter initialEntries={historial} initialIndex={historial.length - 1}>
        {ui}
        {conUbicacion && <UbicacionActual />}
      </MemoryRouter>
    </StrictMode>,
  )
  return { ...resultado, usuario }
}

// Monta la aplicación completa (Layout y rutas con sus páginas diferidas) en la ruta indicada,
// con las mismas opciones que renderizar
export function renderizarRuta(ruta, opciones = {}) {
  return renderizar(<AppRoutes />, { ...opciones, ruta })
}
