import { render, screen } from '@testing-library/react'
import Cargando from './Cargando.jsx'

describe('Cargando', () => {
  it('anuncia un texto de carga por defecto', () => {
    render(<Cargando />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
  })

  it('anuncia el texto que recibe', () => {
    render(<Cargando texto="Cargando destinos…" />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando destinos…')
  })
})
