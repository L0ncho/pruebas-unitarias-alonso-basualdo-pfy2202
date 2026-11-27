import { screen, waitFor } from '@testing-library/react'
import { NOMBRE_SITIO } from '../config/sitio.js'
import { ESPERA, renderizarRuta } from '../test/renderizar.jsx'

const BIENVENIDA = `Te damos la bienvenida a ${NOMBRE_SITIO}`

async function esperarPagina() {
  return screen.findByRole('heading', { level: 1, name: 'Página no encontrada' }, ESPERA)
}

describe('NoEncontrado', () => {
  it('informa que la dirección no existe y cambia el título de la pestaña', async () => {
    renderizarRuta('/no-existe')

    expect(await esperarPagina()).toBeInTheDocument()
    expect(screen.getByText('La dirección que buscas no existe o fue movida.')).toBeInTheDocument()
    expect(document.title).toBe(`Página no encontrada | ${NOMBRE_SITIO}`)
  })

  it('el enlace "Ir al inicio" lleva a la portada', async () => {
    const { usuario } = renderizarRuta('/no-existe', { conUbicacion: true })
    await esperarPagina()

    await usuario.click(screen.getByRole('link', { name: 'Ir al inicio' }))

    expect(await screen.findByRole('heading', { level: 1, name: BIENVENIDA }, ESPERA)).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Ubicación actual' })).toHaveTextContent(/^\/$/)
  })

  it('"Volver" sin historial dentro del sitio lleva a la portada', async () => {
    const { usuario } = renderizarRuta('/no-existe')
    await esperarPagina()

    await usuario.click(screen.getByRole('button', { name: 'Volver' }))

    expect(await screen.findByRole('heading', { level: 1, name: BIENVENIDA }, ESPERA)).toBeInTheDocument()
  })

  it('"Volver" con historial regresa a la página anterior del sitio', async () => {
    const { usuario } = renderizarRuta('/no-existe', { entradas: ['/destinos', '/no-existe'] })
    await esperarPagina()

    await usuario.click(screen.getByRole('button', { name: 'Volver' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Destinos' }, ESPERA)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Cargando destinos…')).not.toBeInTheDocument(), ESPERA)
  })
})
