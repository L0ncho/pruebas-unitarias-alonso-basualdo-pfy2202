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
