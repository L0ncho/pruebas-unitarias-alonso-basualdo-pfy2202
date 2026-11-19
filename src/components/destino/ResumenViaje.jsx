import { useId } from 'react'
import Boton from '../Boton.jsx'
import { formatearFecha, formatearNoches, formatearPrecio } from '../../utils/formato.js'
import {
  fechasCalzan,
  nochesHotel,
  nochesViaje,
  totalEstadia,
  totalViaje,
} from '../../utils/viaje.js'

const clasesTermino = 'text-sm font-semibold text-texto-suave'
const clasesFaltante = 'text-texto-suave italic'

// Resumen de la cotización con lo elegido. Todo se calcula a partir del vuelo y el hotel;
// nada se guarda. vuelo y hotel son undefined mientras no se elijan
function ResumenViaje({ vuelo, hotel, onLimpiar }) {
  const idTitulo = useId()
  const hayAlgo = Boolean(vuelo || hotel)
  const completo = Boolean(vuelo && hotel)
  const calzan = completo ? fechasCalzan(vuelo, hotel) : true

  return (
    <aside
      aria-labelledby={idTitulo}
      className="rounded-xl border border-borde bg-superficie p-5 md:sticky md:top-4"
    >
      <h2 id={idTitulo}>Tu viaje</h2>

      {!hayAlgo ? (
        <p className="mb-4 text-texto-suave">
          Elige un vuelo y un hotel para ver el total estimado.
        </p>
      ) : (
        <dl className="mb-4 flex flex-col gap-3">
          <div>
            <dt className={clasesTermino}>Vuelo</dt>
            {vuelo ? (
              <dd>
                {vuelo.aerolinea}
                <br />
                <span className="text-sm text-texto-suave">
                  {formatearFecha(vuelo.fechaIda)} al {formatearFecha(vuelo.fechaVuelta)}
                </span>
                <br />
                {formatearPrecio(vuelo.precio)}
              </dd>
            ) : (
              <dd className={clasesFaltante}>Falta elegir un vuelo</dd>
            )}
          </div>
          <div>
            <dt className={clasesTermino}>Hotel</dt>
            {hotel ? (
              <dd>
                {hotel.nombre}
                <br />
                <span className="text-sm text-texto-suave">
                  {formatearFecha(hotel.fechaEntrada)} al {formatearFecha(hotel.fechaSalida)}
                </span>
                <br />
                {formatearPrecio(totalEstadia(hotel))}
              </dd>
            ) : (
              <dd className={clasesFaltante}>Falta elegir un hotel</dd>
            )}
          </div>
          {vuelo && (
            <div className="flex justify-between gap-3">
              <dt className={clasesTermino}>Noches del viaje</dt>
              <dd>{formatearNoches(nochesViaje(vuelo))}</dd>
            </div>
          )}
          {hotel && (
            <div className="flex justify-between gap-3">
              <dt className={clasesTermino}>Noches de hotel</dt>
              <dd>{formatearNoches(nochesHotel(hotel))}</dd>
            </div>
          )}
        </dl>
      )}

      {/* Se anuncia al cambiar la selección */}
      <div aria-live="polite">
        {completo && (
          <p className="mb-4 border-t border-borde pt-3">
            <span className="block text-sm font-semibold text-texto-suave">
              Total estimado (1 pasajero, 1 habitación)
            </span>
            <span className="text-2xl font-bold text-acento">
              {formatearPrecio(totalViaje(vuelo, hotel))}
            </span>
          </p>
        )}
        {completo && !calzan && (
          <p className="mb-4 rounded-lg border border-l-4 border-borde border-l-alerta px-3 py-2 text-sm text-alerta">
            Las fechas del hotel no calzan con las del vuelo: la estadía debe quedar entre la ida y
            la vuelta.
          </p>
        )}
      </div>

      <p className="mb-4 text-sm text-texto-suave">
        Cotización simulada: no se realiza ninguna reserva.
      </p>
      <Boton variante="secundario" onClick={onLimpiar} disabled={!hayAlgo} className="w-full">
        Limpiar selección
      </Boton>
    </aside>
  )
}

export default ResumenViaje
