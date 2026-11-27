import { useLocation } from 'react-router'

// Muestra la URL actual del enrutador en memoria (ruta y parámetros de búsqueda). Es un output
// con nombre accesible: las pruebas lo leen por rol y nombre ("Ubicación actual"), sin data-testid.
// Lo monta renderizar con la opción conUbicacion
function UbicacionActual() {
  const { pathname, search } = useLocation()
  return <output aria-label="Ubicación actual">{`${pathname}${search}`}</output>
}

export default UbicacionActual
