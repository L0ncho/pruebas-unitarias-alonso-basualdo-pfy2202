import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Boton from './Boton.jsx'

describe('Boton', () => {
  it('es de tipo "button" por defecto y ejecuta su acción al hacer clic', async () => {
    const usuario = userEvent.setup()
    const alHacerClic = jest.fn()
    render(<Boton onClick={alHacerClic}>Guardar</Boton>)

    const boton = screen.getByRole('button', { name: 'Guardar' })
    expect(boton).toHaveAttribute('type', 'button')
    await usuario.click(boton)
    expect(alHacerClic).toHaveBeenCalledTimes(1)
  })

  it('respeta el tipo indicado', () => {
    render(<Boton type="submit">Enviar</Boton>)

    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveAttribute('type', 'submit')
  })

  it('deshabilitado no ejecuta su acción y conserva los atributos ARIA', async () => {
    const usuario = userEvent.setup()
    const alHacerClic = jest.fn()
    render(
      <Boton disabled aria-pressed={true} onClick={alHacerClic}>
        Modo oscuro
      </Boton>,
    )

    const boton = screen.getByRole('button', { name: 'Modo oscuro', pressed: true })
    expect(boton).toBeDisabled()
    await usuario.click(boton)
    expect(alHacerClic).not.toHaveBeenCalled()
  })
})
