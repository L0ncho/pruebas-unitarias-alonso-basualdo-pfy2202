import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { useVolver } from './useVolver.js'
import { ESPERA, renderizar, renderizarRuta } from '../test/renderizar.jsx'

// Página con el botón Volver; la ruta de respaldo es la portada
function Detalle() {
  const volver = useVolver('/')
  return (
    <>
      <h1>Detalle</h1>
      <button type="button" onClick={volver}>
        Volver
      </button>
    </>
  )
}

function renderizarRutas(opciones) {
  return renderizar(
    <Routes>
      <Route path="/" element={<h1>Portada</h1>} />
      <Route path="/listado" element={<h1>Listado</h1>} />
      <Route path="/detalle" element={<Detalle />} />
    </Routes>,
    { ...opciones, conUbicacion: true },
  )
}

describe('useVolver', () => {
  it('con historial dentro del sitio vuelve a la página anterior', async () => {
    const { usuario } = renderizarRutas({ entradas: ['/listado', '/detalle'] })

    await usuario.click(screen.getByRole('button', { name: 'Volver' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Listado' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Ubicación actual' })).toHaveTextContent('/listado')
  })

  it('sin historial (entrada directa) va a la ruta de respaldo', async () => {
    const { usuario } = renderizarRutas({ ruta: '/detalle' })

    await usuario.click(screen.getByRole('button', { name: 'Volver' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Portada' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Ubicación actual' })).toHaveTextContent(/^\/$/)
  })

  it('el botón Volver de un destino abierto directamente lleva al listado de destinos', async () => {
    const { usuario } = renderizarRuta('/destinos/abc')
    await screen.findByRole('heading', { level: 1, name: 'Destino no encontrado' }, ESPERA)

    await usuario.click(screen.getByRole('button', { name: 'Volver' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Destinos' }, ESPERA)).toBeInTheDocument()
    expect(await screen.findAllByRole('article', {}, ESPERA)).toHaveLength(8)
  })
})
