// Los formateadores se crean una sola vez: construir un Intl en cada llamada es costoso
const formatoPesos = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

// Las fechas sin hora ("2026-12-15") se interpretan en UTC; se formatean también en UTC
// para que la zona horaria del navegador no las corra un día
const formatoFecha = new Intl.DateTimeFormat('es-CL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

// Precio en pesos chilenos: 18990 → "$18.990"
export function formatearPrecio(precio) {
  return formatoPesos.format(precio)
}

// Fecha ISO sin hora: "2026-12-15" → "mar, 15 dic 2026"
export function formatearFecha(fechaIso) {
  return formatoFecha.format(new Date(fechaIso))
}

// Escalas de un vuelo: 0 → "Directo", 1 → "1 escala", 2 → "2 escalas"
export function formatearEscalas(escalas) {
  if (escalas === 0) return 'Directo'
  return escalas === 1 ? '1 escala' : `${escalas} escalas`
}

// Noches: 1 → "1 noche", 5 → "5 noches"
export function formatearNoches(noches) {
  return noches === 1 ? '1 noche' : `${noches} noches`
}

// Disponibilidad con su unidad: (1, 'asiento', 'asientos') → "1 asiento disponible"
export function formatearDisponibles(cantidad, singular, plural) {
  return cantidad === 1 ? `1 ${singular} disponible` : `${cantidad} ${plural} disponibles`
}

// Duración en minutos: 125 → "2 h 5 min", 180 → "3 h", 45 → "45 min"
export function formatearDuracion(minutos) {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas === 0) return `${resto} min`
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}
