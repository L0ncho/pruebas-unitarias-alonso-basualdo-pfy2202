import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockNoDisponible from './MockNoDisponible.jsx'
import { NOMBRE_SITIO } from '../config/sitio.js'
import { ESTADOS_MOCK } from '../utils/mock.js'

const PASOS_SERVICE_WORKER = [
  'Abre el sitio en una ventana normal, no privada.',
  'O ábrelo en otro navegador.',
  'Si bloqueaste los Service Workers, las cookies o el almacenamiento para este sitio, permítelos y recarga la página.',
]

const PASOS_CARGA = ['Revisa tu conexión a internet y recarga la página.']

function pasosMostrados() {
  return within(screen.getByRole('list')).getAllByRole('listitem').map((paso) => paso.textContent)
}

describe('MockNoDisponible', () => {
  it.each([
    [
      ESTADOS_MOCK.sinServiceWorker,
      'Este navegador no permite Service Workers',
      'Suele pasar en la ventana privada de Firefox',
      PASOS_SERVICE_WORKER,
    ],
    [
      ESTADOS_MOCK.errorInicio,
      'El navegador no permitió iniciar los datos simulados',
      'una extensión que bloquea los Service Workers',
      PASOS_SERVICE_WORKER,
    ],
    [
      ESTADOS_MOCK.errorCarga,
      'No se pudieron descargar los datos simulados',
      'Revisa tu conexión a internet.',
      PASOS_CARGA,
    ],
  ])('el diagnóstico "%s" muestra su título, su causa y sus pasos', (estado, titulo, causa, pasos) => {
    render(<MockNoDisponible estado={estado} />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'No podemos mostrar los datos del sitio' }),
    ).toBeInTheDocument()
    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent(titulo)
    expect(alerta).toHaveTextContent(causa)
    expect(alerta).toHaveTextContent('datos simulados que el navegador entrega mediante un Service Worker')
    expect(screen.getByRole('heading', { level: 2, name: 'Qué puedes hacer' })).toBeInTheDocument()
    expect(pasosMostrados()).toEqual(pasos)
  })

  it('un estado desconocido muestra el diagnóstico de error de inicio', () => {
    render(<MockNoDisponible estado="otro" />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'El navegador no permitió iniciar los datos simulados',
    )
    expect(pasosMostrados()).toEqual(PASOS_SERVICE_WORKER)
  })

  it('cambia el título de la pestaña y muestra el nombre del sitio', () => {
    render(<MockNoDisponible estado={ESTADOS_MOCK.errorCarga} />)

    expect(document.title).toBe(`Datos simulados no disponibles | ${NOMBRE_SITIO}`)
    expect(screen.getByRole('banner')).toHaveTextContent(NOMBRE_SITIO)
  })

  it('el botón "Recargar la página" llama a la acción de recarga', async () => {
    const usuario = userEvent.setup()
    const alRecargar = jest.fn()
    render(<MockNoDisponible estado={ESTADOS_MOCK.errorCarga} alRecargar={alRecargar} />)

    await usuario.click(screen.getByRole('button', { name: 'Recargar la página' }))

    expect(alRecargar).toHaveBeenCalledTimes(1)
  })
})
