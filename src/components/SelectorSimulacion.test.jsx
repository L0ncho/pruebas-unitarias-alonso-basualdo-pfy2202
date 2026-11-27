import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SelectorSimulacion from './SelectorSimulacion.jsx'
import { CLAVE_SIMULACION, MODOS, OPCIONES_SIMULACION } from '../mocks/simulacion.js'
import { NOMBRE_SITIO } from '../config/sitio.js'
import { ESPERA, renderizarRuta } from '../test/renderizar.jsx'

describe('SelectorSimulacion', () => {
  it('ofrece los modos de simulación y parte en el modo guardado en sessionStorage', () => {
    sessionStorage.setItem(CLAVE_SIMULACION, MODOS.lenta)

    render(<SelectorSimulacion />)

    const selector = screen.getByRole('combobox', { name: 'Simulación de la API' })
    expect(screen.getAllByRole('option').map((opcion) => opcion.textContent)).toEqual(
      OPCIONES_SIMULACION.map((opcion) => opcion.etiqueta),
    )
    expect(selector).toHaveDisplayValue('Respuesta lenta (4 s)')
  })

  it('sin modo guardado parte en "Normal" y al cambiarlo lo guarda en sessionStorage', async () => {
    const usuario = userEvent.setup()
    render(<SelectorSimulacion />)
    const selector = screen.getByRole('combobox', { name: 'Simulación de la API' })
    expect(selector).toHaveDisplayValue('Normal')

    await usuario.selectOptions(selector, 'Error del servidor (500)')

    expect(selector).toHaveDisplayValue('Error del servidor (500)')
    expect(sessionStorage.getItem(CLAVE_SIMULACION)).toBe(MODOS.errorServidor)
  })

  it('la siguiente consulta respeta el modo elegido en el pie, sin recargar la página', async () => {
    const { usuario } = renderizarRuta('/')
    await screen.findByRole('heading', { level: 1, name: `Te damos la bienvenida a ${NOMBRE_SITIO}` }, ESPERA)

    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Simulación de la API' }), 'Sin conexión')
    await usuario.click(screen.getByRole('link', { name: 'Destinos' }))

    const alerta = await screen.findByRole('alert', {}, ESPERA)
    expect(alerta).toHaveTextContent('Sin conexión')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
})
