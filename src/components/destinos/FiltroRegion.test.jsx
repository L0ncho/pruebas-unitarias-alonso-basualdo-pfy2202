import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FiltroRegion from './FiltroRegion.jsx'
import { REGIONES } from '../../utils/destinos.js'

describe('FiltroRegion', () => {
  it('muestra el grupo de regiones con la opción actual marcada', () => {
    render(<FiltroRegion region={REGIONES.nacionales} onCambiar={jest.fn()} />)

    const grupo = screen.getByRole('group', { name: 'Filtrar por región' })
    expect(grupo).toBeInTheDocument()
    expect(screen.getAllByRole('radio').map((radio) => radio.labels[0].textContent)).toEqual([
      'Todos',
      'Nacionales',
      'Internacionales',
    ])
    expect(screen.getByRole('radio', { name: 'Nacionales' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Todos' })).not.toBeChecked()
  })

  it('al elegir una región avisa el valor elegido', async () => {
    const usuario = userEvent.setup()
    const onCambiar = jest.fn()
    render(<FiltroRegion region={REGIONES.todos} onCambiar={onCambiar} />)

    await usuario.click(screen.getByRole('radio', { name: 'Internacionales' }))

    expect(onCambiar).toHaveBeenCalledWith(REGIONES.internacionales)
  })

  it('con el teclado, las flechas cambian de región', async () => {
    const usuario = userEvent.setup()
    const onCambiar = jest.fn()
    render(<FiltroRegion region={REGIONES.todos} onCambiar={onCambiar} />)

    await usuario.tab()
    expect(screen.getByRole('radio', { name: 'Todos' })).toHaveFocus()
    await usuario.keyboard('{ArrowRight}')

    expect(onCambiar).toHaveBeenCalledWith(REGIONES.nacionales)
  })
})
