import { render, screen } from '@testing-library/react'
import Aviso from './Aviso.jsx'

describe('Aviso', () => {
  it('un aviso de error se anuncia como alerta con su título y su texto', () => {
    render(
      <Aviso tipo="error" titulo="Error del servidor">
        Intenta nuevamente.
      </Aviso>,
    )

    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent('Error del servidor')
    expect(alerta).toHaveTextContent('Intenta nuevamente.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('por defecto es informativo y se anuncia como estado', () => {
    render(<Aviso>Sin novedades.</Aviso>)

    expect(screen.getByRole('status')).toHaveTextContent('Sin novedades.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('un tipo desconocido se muestra como aviso informativo', () => {
    render(<Aviso tipo="otro">Texto</Aviso>)

    expect(screen.getByRole('status')).toHaveTextContent('Texto')
  })

  it('sin título ni acciones muestra solo el texto', () => {
    render(<Aviso>Solo el texto</Aviso>)

    expect(screen.getByRole('status')).toHaveTextContent(/^Solo el texto$/)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('muestra las acciones que recibe dentro del aviso', () => {
    render(
      <Aviso titulo="Atención" acciones={<button type="button">Reintentar</button>}>
        Algo pasó.
      </Aviso>,
    )

    expect(screen.getByRole('status')).toContainElement(
      screen.getByRole('button', { name: 'Reintentar' }),
    )
  })
})
