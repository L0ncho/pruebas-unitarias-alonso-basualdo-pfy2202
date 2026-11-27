import { screen, waitFor } from '@testing-library/react'
import TituloPagina from './TituloPagina.jsx'
import { ESLOGAN, NOMBRE_SITIO } from '../config/sitio.js'
import { ESPERA, renderizar, renderizarRuta } from '../test/renderizar.jsx'

describe('TituloPagina', () => {
  it('con texto, el título de la pestaña es el texto seguido del nombre del sitio', () => {
    renderizar(<TituloPagina texto="Destinos" />)

    expect(document.title).toBe(`Destinos | ${NOMBRE_SITIO}`)
  })

  it('sin texto, el título es el nombre del sitio con su eslogan', () => {
    renderizar(<TituloPagina />)

    expect(document.title).toBe(`${NOMBRE_SITIO} | ${ESLOGAN}`)
  })

  it('el título cambia al navegar de una página a otra', async () => {
    const { usuario } = renderizarRuta('/')
    await screen.findByRole(
      'heading',
      { level: 1, name: `Te damos la bienvenida a ${NOMBRE_SITIO}` },
      ESPERA,
    )
    expect(document.title).toBe(`${NOMBRE_SITIO} | ${ESLOGAN}`)

    await usuario.click(screen.getByRole('link', { name: 'Destinos' }))

    await screen.findByRole('heading', { level: 1, name: 'Destinos' }, ESPERA)
    expect(document.title).toBe(`Destinos | ${NOMBRE_SITIO}`)
    // La consulta del listado termina antes de cerrar la prueba
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument(), ESPERA)
  })
})
