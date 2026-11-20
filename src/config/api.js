// Configuración común de las APIs REST y GraphQL

// Tiempo máximo de cada petición, incluida la lectura del cuerpo. Supera con holgura la
// "respuesta lenta" (4 s) del selector de simulación, que no debe agotarlo
export const TIEMPO_LIMITE_MS = 15000

// Vigencia de un dato en caché (REST y GraphQL), contada desde que llega la respuesta. Un dato
// vencido se muestra al instante y se actualiza en segundo plano
export const VIGENCIA_CACHE_MS = 5 * 60 * 1000
