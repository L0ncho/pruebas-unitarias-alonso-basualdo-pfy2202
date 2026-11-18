import { ESLOGAN, NOMBRE_SITIO } from '../config/sitio.js'

// Sin texto (página de inicio) se muestra el nombre del sitio con su eslogan
function TituloPagina({ texto }) {
  const titulo = texto ? `${texto} | ${NOMBRE_SITIO}` : `${NOMBRE_SITIO} | ${ESLOGAN}`

  return <title>{titulo}</title>
}

export default TituloPagina
