import { Link, useSearchParams } from 'react-router'
import Aviso from '../components/Aviso.jsx'
import AvisoErrorConsulta from '../components/AvisoErrorConsulta.jsx'
import Boton from '../components/Boton.jsx'
import Cargando from '../components/Cargando.jsx'
import TituloPagina from '../components/TituloPagina.jsx'
import FiltroRegion from '../components/destinos/FiltroRegion.jsx'
import TarjetaDestino from '../components/destinos/TarjetaDestino.jsx'
import { useDestinos } from '../hooks/useDestinos.js'
import {
  filtrarDestinos,
  normalizarRegion,
  REGIONES,
  textoResultadoFiltro,
} from '../utils/destinos.js'

const SALIDA = { to: '/', texto: 'Volver al inicio' }
const PARAMETRO_REGION = 'region'

function Destinos() {
  const { datos: destinos, cargando, error, reintentar } = useDestinos()
  // El filtro vive en la URL (?region=nacionales): se puede compartir y sobrevive a la recarga.
  // Un valor desconocido se trata como "todos"
  const [parametros, setParametros] = useSearchParams()
  const region = normalizarRegion(parametros.get(PARAMETRO_REGION))
  // Estado derivado: la lista filtrada se calcula, no se guarda
  const destinosFiltrados = destinos ? filtrarDestinos(destinos, region) : []

  // replace: cambiar el filtro no agrega entradas al historial ("Volver" no recorre filtros)
  function cambiarRegion(nuevaRegion) {
    setParametros(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales)
        if (nuevaRegion === REGIONES.todos) {
          siguientes.delete(PARAMETRO_REGION)
        } else {
          siguientes.set(PARAMETRO_REGION, nuevaRegion)
        }
        return siguientes
      },
      { replace: true },
    )
  }

  return (
    <section>
      <TituloPagina texto="Destinos" />
      <h1>Destinos</h1>
      <p className="mb-6 max-w-[60ch] text-texto-suave">
        Conoce los destinos disponibles, su país y las actividades más populares de cada uno.
      </p>

      {cargando && <Cargando texto="Cargando destinos…" />}
      {error && <AvisoErrorConsulta error={error} reintentar={reintentar} salida={SALIDA} />}

      {/* Región que se actualiza: al reintentar se mantienen los datos anteriores con aria-busy */}
      <div aria-busy={cargando}>
        {destinos?.length === 0 && (
          <Aviso
            titulo="Sin destinos disponibles"
            acciones={
              <>
                <Boton onClick={reintentar}>Reintentar</Boton>
                <Link to={SALIDA.to}>{SALIDA.texto}</Link>
              </>
            }
          >
            Por ahora no hay destinos para mostrar. Vuelve a intentarlo en unos momentos.
          </Aviso>
        )}

        {destinos?.length > 0 && (
          <>
            <FiltroRegion region={region} onCambiar={cambiarRegion} />
            <p aria-live="polite" className="mb-4 text-sm text-texto-suave">
              {textoResultadoFiltro(destinosFiltrados.length, destinos.length)}
            </p>

            {destinosFiltrados.length === 0 ? (
              <p className="text-texto">
                No hay destinos en esta región.{' '}
                <Link to="/destinos" replace>
                  Ver todos los destinos
                </Link>
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {destinosFiltrados.map((destino) => (
                  <li key={destino.id}>
                    <TarjetaDestino destino={destino} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default Destinos
