import { screen } from '@testing-library/react'
import AvisoErrorConsulta from './AvisoErrorConsulta.jsx'
import { renderizar } from '../test/renderizar.jsx'
import { TIPOS_ERROR } from '../utils/errores.js'

const SALIDA = { to: '/destinos', texto: 'Ver todos los destinos' }

describe('AvisoErrorConsulta', () => {
  it.each([
    [TIPOS_ERROR.servidor, 'Error del servidor'],
    [TIPOS_ERROR.red, 'Sin conexión'],
    [TIPOS_ERROR.tiempoAgotado, 'Tiempo agotado'],
    [TIPOS_ERROR.datosIncompletos, 'Datos incompletos'],
    [TIPOS_ERROR.desconocido, 'Error inesperado'],
  ])(
    'un error "%s" muestra el título "%s", su mensaje, Reintentar y el enlace de salida',
    async (tipo, titulo) => {
      const reintentar = jest.fn()
      const { usuario } = renderizar(
        <AvisoErrorConsulta
          error={{ tipo, estado: null, mensaje: 'Mensaje del error' }}
          reintentar={reintentar}
          salida={SALIDA}
        />,
      )

      const alerta = screen.getByRole('alert')
      expect(alerta).toHaveTextContent(titulo)
      expect(alerta).toHaveTextContent('Mensaje del error')
      expect(screen.getByRole('link', { name: SALIDA.texto })).toHaveAttribute('href', SALIDA.to)

      await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
      expect(reintentar).toHaveBeenCalledTimes(1)
    },
  )

  it('un recurso no encontrado ofrece solo el enlace de salida, sin Reintentar', () => {
    renderizar(
      <AvisoErrorConsulta
        error={{ tipo: TIPOS_ERROR.noEncontrado, estado: 404, mensaje: 'No existe.' }}
        reintentar={jest.fn()}
        salida={SALIDA}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('No encontrado')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: SALIDA.texto })).toHaveAttribute('href', SALIDA.to)
  })
})
