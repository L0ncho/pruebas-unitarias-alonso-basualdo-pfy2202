import { screen } from '@testing-library/react'
import EstadoConsulta from './EstadoConsulta.jsx'
import { renderizar } from '../test/renderizar.jsx'
import { TIPOS_ERROR } from '../utils/errores.js'

const SALIDA = { to: '/', texto: 'Volver al inicio' }

function renderizarEstado(props) {
  return renderizar(
    <EstadoConsulta reintentar={jest.fn()} salida={SALIDA} textoCargando="Cargando datos…" {...props}>
      <p>Contenido de la consulta</p>
    </EstadoConsulta>,
  )
}

// Región que se actualiza: el contenedor del contenido, con aria-busy
function region() {
  return screen.getByText('Contenido de la consulta').parentElement
}

describe('EstadoConsulta', () => {
  it('con datos muestra el contenido, sin indicador de carga ni alertas', () => {
    renderizarEstado({ cargando: false, error: null })

    expect(screen.getByText('Contenido de la consulta')).toBeInTheDocument()
    expect(region()).toHaveAttribute('aria-busy', 'false')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('mientras carga anuncia el texto de carga y marca la región como ocupada sin quitar el contenido', () => {
    renderizarEstado({ cargando: true, error: null })

    expect(screen.getByRole('status')).toHaveTextContent('Cargando datos…')
    expect(region()).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Contenido de la consulta')).toBeInTheDocument()
  })

  it('con un error muestra la alerta y su botón Reintentar llama a reintentar', async () => {
    const reintentar = jest.fn()
    const { usuario } = renderizarEstado({
      cargando: false,
      error: { tipo: TIPOS_ERROR.servidor, estado: 500, mensaje: 'Falló el servidor.' },
      reintentar,
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Falló el servidor.')
    expect(screen.getByRole('link', { name: SALIDA.texto })).toHaveAttribute('href', SALIDA.to)
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(reintentar).toHaveBeenCalledTimes(1)
  })

  it('con una lista vacía muestra el aviso con su título, texto y acciones dentro de la región', () => {
    renderizarEstado({
      cargando: false,
      error: null,
      vacio: { titulo: 'Sin resultados', texto: 'No hay nada.', acciones: <a href="/">Volver</a> },
    })

    const aviso = screen.getByRole('status')
    expect(aviso).toHaveTextContent('Sin resultados')
    expect(aviso).toHaveTextContent('No hay nada.')
    expect(aviso).toContainElement(screen.getByRole('link', { name: 'Volver' }))
    expect(region()).toContainElement(aviso)
  })
})
