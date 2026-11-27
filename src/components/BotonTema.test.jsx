import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BotonTema from './BotonTema.jsx'
import { CLAVE_TEMA, TEMAS } from '../utils/tema.js'

// Preferencia de color del sistema. El setup define window.matchMedia sin preferencia oscura;
// aquí se reemplaza para simular un sistema en modo oscuro
function simularSistemaOscuro() {
  const original = window.matchMedia
  jest.spyOn(window, 'matchMedia').mockImplementation((consulta) => ({
    ...original(consulta),
    matches: consulta === '(prefers-color-scheme: dark)',
  }))
}

afterEach(() => {
  jest.restoreAllMocks()
  document.documentElement.removeAttribute('data-tema')
})

describe('BotonTema', () => {
  it('sin preferencia guardada y con el sistema en modo claro, parte en claro', () => {
    render(<BotonTema />)

    expect(screen.getByRole('button', { name: 'Modo oscuro', pressed: false })).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-tema', TEMAS.claro)
    expect(localStorage.getItem(CLAVE_TEMA)).toBeNull()
  })

  it('alterna entre oscuro y claro, actualiza el documento y guarda la elección', async () => {
    const usuario = userEvent.setup()
    render(<BotonTema />)
    const boton = screen.getByRole('button', { name: 'Modo oscuro' })

    await usuario.click(boton)
    expect(boton).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).toHaveAttribute('data-tema', TEMAS.oscuro)
    expect(localStorage.getItem(CLAVE_TEMA)).toBe(TEMAS.oscuro)

    await usuario.click(boton)
    expect(boton).toHaveAttribute('aria-pressed', 'false')
    expect(document.documentElement).toHaveAttribute('data-tema', TEMAS.claro)
    expect(localStorage.getItem(CLAVE_TEMA)).toBe(TEMAS.claro)
  })

  it('respeta la preferencia guardada', () => {
    localStorage.setItem(CLAVE_TEMA, TEMAS.oscuro)

    render(<BotonTema />)

    expect(screen.getByRole('button', { name: 'Modo oscuro', pressed: true })).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-tema', TEMAS.oscuro)
  })

  it('sin preferencia guardada sigue al sistema en modo oscuro, sin guardar nada', () => {
    simularSistemaOscuro()

    render(<BotonTema />)

    expect(screen.getByRole('button', { name: 'Modo oscuro', pressed: true })).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-tema', TEMAS.oscuro)
    expect(localStorage.getItem(CLAVE_TEMA)).toBeNull()
  })

  it('la preferencia guardada tiene prioridad sobre la del sistema', () => {
    simularSistemaOscuro()
    localStorage.setItem(CLAVE_TEMA, TEMAS.claro)

    render(<BotonTema />)

    expect(screen.getByRole('button', { name: 'Modo oscuro', pressed: false })).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-tema', TEMAS.claro)
  })
})
