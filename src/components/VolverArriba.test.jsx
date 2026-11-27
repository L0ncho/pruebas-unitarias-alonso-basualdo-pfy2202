import { screen } from '@testing-library/react'
import { Link, Route, Routes } from 'react-router'
import VolverArriba from './VolverArriba.jsx'
import { useVolver } from '../hooks/useVolver.js'
import { renderizar } from '../test/renderizar.jsx'

// Rutas mínimas, sin consultas a la API: solo interesa la navegación
function PaginaA() {
  return (
    <>
      <h1>Página A</h1>
      <Link to="/b">Ir a B</Link>
    </>
  )
}

function PaginaB() {
  const volver = useVolver('/')
  return (
    <>
      <h1>Página B</h1>
      <button type="button" onClick={volver}>
        Volver
      </button>
    </>
  )
}

function renderizarConRutas() {
  return renderizar(
    <>
      <VolverArriba />
      <Routes>
        <Route path="/" element={<PaginaA />} />
        <Route path="/b" element={<PaginaB />} />
      </Routes>
    </>,
  )
}

beforeEach(() => jest.spyOn(window, 'scrollTo'))
afterEach(() => jest.restoreAllMocks())

describe('VolverArriba', () => {
  it('no mueve la ventana en la carga inicial', () => {
    renderizarConRutas()

    expect(screen.getByRole('heading', { level: 1, name: 'Página A' })).toBeInTheDocument()
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('al navegar a otra ruta sube al inicio de la ventana', async () => {
    const { usuario } = renderizarConRutas()

    await usuario.click(screen.getByRole('link', { name: 'Ir a B' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Página B' })).toBeInTheDocument()
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('al volver atrás respeta la posición que restaura el navegador', async () => {
    const { usuario } = renderizarConRutas()
    await usuario.click(screen.getByRole('link', { name: 'Ir a B' }))
    window.scrollTo.mockClear()

    await usuario.click(screen.getByRole('button', { name: 'Volver' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Página A' })).toBeInTheDocument()
    expect(window.scrollTo).not.toHaveBeenCalled()
  })
})
