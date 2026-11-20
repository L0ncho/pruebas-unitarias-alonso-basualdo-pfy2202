import { VIGENCIA_CACHE_MS } from '../config/api.js'

// Un dato recibido en recibidoEn sigue vigente en momento si no ha cumplido la vigencia.
// Al cumplirla exactamente ya está vencido. Sin hora de recepción no hay dato vigente
export function estaVigente(recibidoEn, momento, vigencia = VIGENCIA_CACHE_MS) {
  return Number.isFinite(recibidoEn) && momento - recibidoEn < vigencia
}
