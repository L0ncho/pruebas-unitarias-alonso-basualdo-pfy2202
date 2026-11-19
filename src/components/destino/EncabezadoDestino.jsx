import Aviso from '../Aviso.jsx'

// Datos del destino bajo el h1 de la página: país, descripción y cómo se llega, si aplica
function EncabezadoDestino({ destino }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-sm font-semibold tracking-wide text-texto-suave uppercase">
        {destino.pais}
      </p>
      <p className="mb-4 max-w-[65ch] text-texto">{destino.descripcion}</p>
      {destino.notaLlegada && <Aviso titulo="Cómo llegar">{destino.notaLlegada}</Aviso>}
    </div>
  )
}

export default EncabezadoDestino
