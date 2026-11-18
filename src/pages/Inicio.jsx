import TituloPagina from '../components/TituloPagina.jsx'
import { ESLOGAN, NOMBRE_SITIO } from '../config/sitio.js'

function Inicio() {
  return (
    <section className="rounded-2xl border border-borde bg-superficie px-6 py-8 md:px-10 md:py-12">
      <TituloPagina />
      <h1>Te damos la bienvenida a {NOMBRE_SITIO}</h1>
      <p className="mb-2 font-titulos text-lg font-semibold text-texto">{ESLOGAN}</p>
      <p className="max-w-[60ch] text-texto-suave">
        Somos una agencia de viajes que te ayuda a planificar tu próxima aventura: elige un
        destino, conoce su país y sus actividades populares, y compara los vuelos y hoteles
        disponibles con sus precios y fechas para armar tu viaje.
      </p>
    </section>
  )
}

export default Inicio
