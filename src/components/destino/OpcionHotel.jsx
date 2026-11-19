import { useId } from 'react'
import {
  formatearDisponibles,
  formatearFecha,
  formatearNoches,
  formatearPrecio,
} from '../../utils/formato.js'
import { estaDisponible, nochesHotel, totalEstadia } from '../../utils/viaje.js'
import { clasesEtiquetaAgotado, clasesOpcion, clasesRadioOpcion } from '../../styles/clases.js'

const MAXIMO_ESTRELLAS = 5

// Un hotel como opción de radio. Las estrellas se dibujan con símbolos ocultos para los
// lectores de pantalla, que leen "4 de 5 estrellas"
function OpcionHotel({ hotel, nombreGrupo, seleccionado, onElegir }) {
  const idTitulo = useId()
  const idDetalle = useId()
  const disponible = estaDisponible(hotel.habitacionesDisponibles)
  const estrellas = '★'.repeat(hotel.estrellas) + '☆'.repeat(MAXIMO_ESTRELLAS - hotel.estrellas)

  return (
    <label className={clasesOpcion}>
      <input
        type="radio"
        name={nombreGrupo}
        value={hotel.id}
        checked={seleccionado}
        disabled={!disponible}
        onChange={() => onElegir(hotel.id)}
        aria-labelledby={idTitulo}
        aria-describedby={idDetalle}
        className={clasesRadioOpcion}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span id={idTitulo} className="flex flex-col">
          <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="font-semibold">{hotel.nombre}</span>
            {!disponible && <span className={clasesEtiquetaAgotado}>Agotado</span>}
          </span>
          <span className="text-sm">
            <span aria-hidden="true" className="tracking-wide text-acento">
              {estrellas}
            </span>
            <span className="sr-only">
              {hotel.estrellas} de {MAXIMO_ESTRELLAS} estrellas
            </span>
            <span className="text-texto-suave"> · {hotel.zona}</span>
          </span>
        </span>
        <span id={idDetalle} className="flex flex-col gap-1 text-sm">
          <span className="text-texto-suave">
            Entrada: {formatearFecha(hotel.fechaEntrada)}
            <br />
            Salida: {formatearFecha(hotel.fechaSalida)}
          </span>
          <span className="text-texto-suave">{formatearNoches(nochesHotel(hotel))}</span>
          <span>
            <span className="text-lg font-bold text-acento">
              {formatearPrecio(hotel.precioPorNoche)}
            </span>{' '}
            <span className="text-texto-suave">por noche</span>
          </span>
          <span>Total estadía: {formatearPrecio(totalEstadia(hotel))}</span>
          <span className={disponible ? 'text-texto-suave' : 'font-semibold text-peligro'}>
            {disponible
              ? formatearDisponibles(hotel.habitacionesDisponibles, 'habitación', 'habitaciones')
              : 'Sin habitaciones disponibles'}
          </span>
        </span>
      </span>
    </label>
  )
}

export default OpcionHotel
