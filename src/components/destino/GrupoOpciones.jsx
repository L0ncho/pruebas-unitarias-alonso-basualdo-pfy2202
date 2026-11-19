import { useId } from 'react'

// Grupo de opciones de radio (vuelos u hoteles). fieldset y legend agrupan los radios: el
// grupo es una sola parada de Tab y las flechas cambian la opción. El h2 dentro del legend
// permite además navegar la página por títulos
function GrupoOpciones({ titulo, descripcion, children }) {
  const idDescripcion = useId()

  return (
    <fieldset aria-describedby={descripcion ? idDescripcion : undefined} className="min-w-0">
      <legend className="mb-1">
        <h2 className="mb-0">{titulo}</h2>
      </legend>
      {descripcion && (
        <p id={idDescripcion} className="mb-3 text-sm text-texto-suave">
          {descripcion}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

export default GrupoOpciones
