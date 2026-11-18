import { useId } from 'react'

// Tarjeta de un destino del listado: nombre, país, descripción y actividades populares
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
    </article>
  )
}

export default TarjetaDestino
