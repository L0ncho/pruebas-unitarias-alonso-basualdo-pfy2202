import { RUTA_DESTINOS } from '../services/destinos.js'
import { useConsulta } from './useConsulta.js'

// Listado de destinos: { datos, cargando, error, reintentar }
export function useDestinos() {
  return useConsulta(RUTA_DESTINOS)
}
