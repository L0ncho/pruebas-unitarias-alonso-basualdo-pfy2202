import Aviso from './Aviso.jsx'
import AvisoErrorConsulta from './AvisoErrorConsulta.jsx'
import Cargando from './Cargando.jsx'

// Estado de una consulta, común a las páginas que muestran datos de la API:
// - indicador de carga (textoCargando) mientras cargando es true;
// - error con su alternativa (Reintentar y el enlace de salida);
// - región que se actualiza con aria-busy: al reintentar o actualizar se mantienen los datos
//   anteriores (children) visibles;
// - vacio: { titulo, texto, acciones } del aviso de lista vacía, o null si hay datos que mostrar.
//   Va dentro de la región, después del contenido
function EstadoConsulta({ cargando, error, reintentar, salida, textoCargando, vacio, children }) {
  return (
    <>
      {cargando && <Cargando texto={textoCargando} />}
      {error && <AvisoErrorConsulta error={error} reintentar={reintentar} salida={salida} />}

      <div aria-busy={cargando}>
        {children}
        {vacio && (
          <Aviso titulo={vacio.titulo} acciones={vacio.acciones}>
            {vacio.texto}
          </Aviso>
        )}
      </div>
    </>
  )
}

export default EstadoConsulta
