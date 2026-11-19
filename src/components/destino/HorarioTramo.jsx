import { formatearDuracion } from '../../utils/formato.js'

// Horario de un tramo del vuelo: "08:15 → 11:40 · 3 h 25 min". Las horas son locales de cada
// aeropuerto. La flecha y el punto se ocultan a los lectores de pantalla, que leen
// "08:15 a 11:40, duración 3 h 25 min"
function HorarioTramo({ salida, llegada, duracionMinutos }) {
  return (
    <span>
      {salida} <span aria-hidden="true">→</span>
      <span className="sr-only">a</span> {llegada}
      <span aria-hidden="true"> · </span>
      <span className="sr-only">, duración </span>
      {formatearDuracion(duracionMinutos)}
    </span>
  )
}

export default HorarioTramo
