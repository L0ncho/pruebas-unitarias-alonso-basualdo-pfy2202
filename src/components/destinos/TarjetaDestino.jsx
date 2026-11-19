import { useId } from 'react'
import { Link } from 'react-router'
import { clasesBoton } from '../../styles/clases.js'

// Tarjeta de un destino del listado: nombre, país, descripción, actividades populares y el
// enlace a sus vuelos y hoteles
function TarjetaDestino({ destino }) {
  const idActividades = useId()

  return (
    <article className="flex h-full flex-col gap-3 rounded-xl border border-borde bg-superficie p-5">
      <header>
        <h2 className="mb-1">{destino.nombre}</h2>
        <p className="text-sm font-semibold tracking-wide text-texto-suave uppercase">
          {destino.pais}
        </p>
      </header>
      <p className="text-texto">{destino.descripcion}</p>
      <div className="mt-auto">
        <h3 id={idActividades} className="mb-2 text-sm font-semibold text-texto">
          Actividades populares
        </h3>
        {/* role="list": Safari quita la semántica de lista a un ul sin viñetas */}
        <ul role="list" aria-labelledby={idActividades} className="flex flex-wrap gap-2">
          {destino.actividades.map((actividad) => (
            <li
              key={actividad}
              className="rounded-full border border-borde bg-fondo px-3 py-1 text-sm text-texto"
            >
              {actividad}
            </li>
          ))}
        </ul>
      </div>
      <Link to={`/destinos/${destino.id}`} className={`${clasesBoton('secundario', 'compacto')} self-start`}>
        Ver vuelos y hoteles<span className="sr-only"> de {destino.nombre}</span>
      </Link>
    </article>
  )
}

export default TarjetaDestino
