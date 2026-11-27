import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router'
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

// Monta un componente dentro del enrutador. ruta: la URL inicial (por defecto, "/")
export function renderizar(ui, { ruta = '/' } = {}) {
  const usuario = userEvent.setup()
  const resultado = render(
    <StrictMode>
      <MemoryRouter initialEntries={[ruta]}>{ui}</MemoryRouter>
    </StrictMode>,
  )
  return { ...resultado, usuario }
}

// Monta la aplicación completa (Layout y rutas con sus páginas diferidas) en la ruta indicada
export function renderizarRuta(ruta) {
  return renderizar(<AppRoutes />, { ruta })
}
