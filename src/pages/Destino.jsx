import { useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import AvisoErrorConsulta from '../components/AvisoErrorConsulta.jsx'
import Boton from '../components/Boton.jsx'
import EstadoConsulta from '../components/EstadoConsulta.jsx'
import ProveedorApollo from '../components/ProveedorApollo.jsx'
import TituloPagina from '../components/TituloPagina.jsx'
import EncabezadoDestino from '../components/destino/EncabezadoDestino.jsx'
import GrupoOpciones from '../components/destino/GrupoOpciones.jsx'
import OpcionHotel from '../components/destino/OpcionHotel.jsx'
import OpcionVuelo from '../components/destino/OpcionVuelo.jsx'
import ResumenViaje from '../components/destino/ResumenViaje.jsx'
import { useOpcionesViaje } from '../hooks/useOpcionesViaje.js'
import { useVolver } from '../hooks/useVolver.js'
import { errorIdInvalido, TIPOS_ERROR } from '../utils/errores.js'
import { convertirEntero } from '../utils/ids.js'
import { hotelElegido, vueloElegido } from '../utils/viaje.js'

const SALIDA = { to: '/destinos', texto: 'Ver todos los destinos' }
const TITULO_NO_ENCONTRADO = 'Destino no encontrado'

// Vuelos, hoteles y selección del viaje de un destino ya validado
function ContenidoDestino({ id }) {
  const { datos: destino, cargando, error, reintentar } = useOpcionesViaje(id)
  // Solo se guardan los ids elegidos; los objetos, las noches y los totales se calculan
  const [vueloId, setVueloId] = useState(null)
  const [hotelId, setHotelId] = useState(null)
  const nombreGrupoVuelos = useId()
  const nombreGrupoHoteles = useId()

  const noEncontrado = error?.tipo === TIPOS_ERROR.noEncontrado
  const titulo = destino?.nombre ?? (noEncontrado ? TITULO_NO_ENCONTRADO : 'Vuelos y hoteles')
  const tituloPestana = destino?.nombre ?? (noEncontrado ? TITULO_NO_ENCONTRADO : 'Destino')

  // Con los datos actuales: tras una actualización, una opción que ya no existe o se agotó
  // queda como no elegida
  const vuelo = vueloElegido(destino, vueloId)
  const hotel = hotelElegido(destino, hotelId)
  const sinOferta = destino && destino.vuelos.length === 0 && destino.hoteles.length === 0

  function limpiarSeleccion() {
    setVueloId(null)
    setHotelId(null)
  }

  return (
    <>
      <TituloPagina texto={tituloPestana} />
      <h1>{titulo}</h1>

      <EstadoConsulta
        cargando={cargando}
        error={error}
        reintentar={reintentar}
        salida={SALIDA}
        textoCargando="Cargando vuelos y hoteles…"
        vacio={
          sinOferta && {
            titulo: 'Sin vuelos ni hoteles disponibles',
            texto: `Por ahora no hay vuelos ni hoteles disponibles para ${destino.nombre}.`,
            acciones: <Link to={SALIDA.to}>Ver otros destinos</Link>,
          }
        }
      >
        {destino && <EncabezadoDestino destino={destino} />}

        {destino && !sinOferta && (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem] md:items-start">
            <div className="flex min-w-0 flex-col gap-8">
              <GrupoOpciones
                titulo="Elige tu vuelo"
                descripcion="Vuelos de ida y vuelta. Precios por persona."
              >
                {destino.vuelos.length === 0 ? (
                  <p className="text-texto-suave">No hay vuelos disponibles para este destino.</p>
                ) : (
                  destino.vuelos.map((item) => (
                    <OpcionVuelo
                      key={item.id}
                      vuelo={item}
                      nombreGrupo={nombreGrupoVuelos}
                      seleccionado={item.id === vuelo?.id}
                      onElegir={setVueloId}
                    />
                  ))
                )}
              </GrupoOpciones>

              <GrupoOpciones
                titulo="Elige tu hotel"
                descripcion="Precios por habitación. El total considera todas las noches de la estadía."
              >
                {destino.hoteles.length === 0 ? (
                  <p className="text-texto-suave">No hay hoteles disponibles para este destino.</p>
                ) : (
                  destino.hoteles.map((item) => (
                    <OpcionHotel
                      key={item.id}
                      hotel={item}
                      nombreGrupo={nombreGrupoHoteles}
                      seleccionado={item.id === hotel?.id}
                      onElegir={setHotelId}
                    />
                  ))
                )}
              </GrupoOpciones>
            </div>

            <ResumenViaje
              pais={destino.pais}
              vuelo={vuelo}
              hotel={hotel}
              onLimpiar={limpiarSeleccion}
            />
          </div>
        )}
      </EstadoConsulta>
    </>
  )
}

function Destino() {
  const { id: idTexto } = useParams()
  const id = convertirEntero(idTexto)
  const volver = useVolver('/destinos')

  return (
    <section>
      <Boton variante="secundario" tamano="compacto" onClick={volver} className="mb-4">
        <span aria-hidden="true">←</span> Volver
      </Boton>

      {id === null ? (
        // Id inválido: no se consulta la API; se informa igual que un destino inexistente
        <>
          <TituloPagina texto={TITULO_NO_ENCONTRADO} />
          <h1>{TITULO_NO_ENCONTRADO}</h1>
          <AvisoErrorConsulta
            error={errorIdInvalido(`No existe un destino con el id «${idTexto}».`)}
            salida={SALIDA}
          />
        </>
      ) : (
        // key con el id normalizado: al cambiar de destino la selección parte de cero
        // ("7" y "007" son el mismo destino y conservan la selección)
        <ProveedorApollo>
          <ContenidoDestino key={id} id={id} />
        </ProveedorApollo>
      )}
    </section>
  )
}

export default Destino
