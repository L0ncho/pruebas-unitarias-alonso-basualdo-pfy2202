import { Link } from 'react-router'
import Aviso from '../components/Aviso.jsx'
import AvisoErrorConsulta from '../components/AvisoErrorConsulta.jsx'
import Boton from '../components/Boton.jsx'
import Cargando from '../components/Cargando.jsx'
import TituloPagina from '../components/TituloPagina.jsx'
import TarjetaDestino from '../components/destinos/TarjetaDestino.jsx'
import { useDestinos } from '../hooks/useDestinos.js'

const SALIDA = { to: '/', texto: 'Volver al inicio' }

function Destinos() {
  const { datos: destinos, cargando, error, reintentar } = useDestinos()

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
          <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {destinos.map((destino) => (
              <li key={destino.id}>
                <TarjetaDestino destino={destino} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default Destinos
