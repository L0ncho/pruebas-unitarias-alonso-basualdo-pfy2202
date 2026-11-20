// Configuración común de las APIs REST y GraphQL

// Tiempo máximo de cada petición, incluida la lectura del cuerpo. Supera con holgura la
// "respuesta lenta" (4 s) del selector de simulación, que no debe agotarlo
export const TIEMPO_LIMITE_MS = 15000
