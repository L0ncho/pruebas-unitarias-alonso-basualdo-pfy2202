import { screen, within } from '@testing-library/react'
import TarjetaDestino from './TarjetaDestino.jsx'
import { destinos } from '../../mocks/datos.js'
import { renderizar } from '../../test/renderizar.jsx'

const cusco = destinos.find((destino) => destino.nombre === 'Cusco')

describe('TarjetaDestino', () => {
  it('muestra el nombre, el país, la descripción y las actividades populares del destino', () => {
    renderizar(<TarjetaDestino destino={cusco} />)

    const tarjeta = screen.getByRole('article')
    expect(within(tarjeta).getByRole('heading', { level: 2, name: 'Cusco' })).toBeInTheDocument()
    expect(within(tarjeta).getByText(cusco.pais)).toBeInTheDocument()
    expect(within(tarjeta).getByText(cusco.descripcion)).toBeInTheDocument()

    const actividades = within(tarjeta).getByRole('list', { name: 'Actividades populares' })
    expect(within(actividades).getAllByRole('listitem').map((item) => item.textContent)).toEqual(
      cusco.actividades,
    )
  })

  it('enlaza al detalle con un nombre accesible que incluye el destino', () => {
    renderizar(<TarjetaDestino destino={cusco} />)

    expect(screen.getByRole('link', { name: 'Ver vuelos y hoteles de Cusco' })).toHaveAttribute(
      'href',
      `/destinos/${cusco.id}`,
    )
  })
})
