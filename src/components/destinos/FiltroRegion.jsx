import { useId } from 'react'
import { OPCIONES_REGION } from '../../utils/destinos.js'

// Cada opción es un radio nativo dentro de su label, con aspecto de botón segmentado.
// La elegida se marca con fondo primario y el foco de teclado se ve en el label
const clasesOpcion =
  'cursor-pointer rounded-lg border border-primario bg-superficie px-4 py-1.5 font-semibold text-primario hover:bg-fondo has-checked:bg-primario has-checked:text-sobre-primario has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-primario'

// Filtro del listado por región. Grupo de radios: una sola parada de Tab y flechas para
// cambiar de opción. El estado vive en la URL (lo maneja la página)
function FiltroRegion({ region, onCambiar }) {
  const nombreGrupo = useId()

  return (
    <fieldset className="mb-4">
      <legend className="mb-2 text-sm font-semibold text-texto">Filtrar por región</legend>
      <div className="flex flex-wrap gap-2">
        {OPCIONES_REGION.map((opcion) => (
          <label key={opcion.valor} className={clasesOpcion}>
            <input
              type="radio"
              name={nombreGrupo}
              value={opcion.valor}
              checked={region === opcion.valor}
              onChange={() => onCambiar(opcion.valor)}
              className="sr-only"
            />
            {opcion.etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default FiltroRegion
