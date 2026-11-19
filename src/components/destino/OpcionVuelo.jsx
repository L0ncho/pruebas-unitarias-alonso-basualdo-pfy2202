import { useId } from 'react'
import {
  formatearDisponibles,
  formatearEscalas,
  formatearFecha,
  formatearPrecio,
} from '../../utils/formato.js'
import { estaDisponible } from '../../utils/viaje.js'
import { clasesEtiquetaAgotado, clasesOpcion, clasesRadioOpcion } from '../../styles/clases.js'

// Un vuelo como opción de radio. El nombre accesible del radio es la aerolínea y la ruta;
// el resto de la tarjeta queda como descripción
function OpcionVuelo({ vuelo, nombreGrupo, seleccionado, onElegir }) {
  const idTitulo = useId()
  const idDetalle = useId()
  const disponible = estaDisponible(vuelo.asientosDisponibles)

  return (
    <label className={clasesOpcion}>
      <input
        type="radio"
        name={nombreGrupo}
        value={vuelo.id}
        checked={seleccionado}
        disabled={!disponible}
        onChange={() => onElegir(vuelo.id)}
        aria-labelledby={idTitulo}
        aria-describedby={idDetalle}
        className={clasesRadioOpcion}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span id={idTitulo} className="flex flex-col">
          <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="font-semibold">{vuelo.aerolinea}</span>
            {!disponible && <span className={clasesEtiquetaAgotado}>Agotado</span>}
          </span>
          <span className="text-sm">
            {vuelo.origen} <span aria-hidden="true">→</span>
            <span className="sr-only">a</span> {vuelo.llegada}
          </span>
        </span>
        <span id={idDetalle} className="flex flex-col gap-1 text-sm">
          <span className="text-texto-suave">
            Ida: {formatearFecha(vuelo.fechaIda)}
            <br />
            Vuelta: {formatearFecha(vuelo.fechaVuelta)}
          </span>
          <span className="text-texto-suave">{formatearEscalas(vuelo.escalas)}</span>
          <span>
            <span className="text-lg font-bold text-acento">{formatearPrecio(vuelo.precio)}</span>{' '}
            <span className="text-texto-suave">por persona</span>
          </span>
          <span className={disponible ? 'text-texto-suave' : 'font-semibold text-peligro'}>
            {disponible
              ? formatearDisponibles(vuelo.asientosDisponibles, 'asiento', 'asientos')
              : 'Sin asientos disponibles'}
          </span>
        </span>
      </span>
    </label>
  )
}

export default OpcionVuelo
