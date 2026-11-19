import Aviso from './Aviso.jsx'
import Boton from './Boton.jsx'
import TituloPagina from './TituloPagina.jsx'
import { ESLOGAN, NOMBRE_SITIO } from '../config/sitio.js'
import { ESTADOS_MOCK } from '../utils/mock.js'

const EXPLICACION =
  `${NOMBRE_SITIO} es un proyecto académico: sus destinos, vuelos y hoteles son datos simulados ` +
  'que el navegador entrega mediante un Service Worker.'

const AVISOS = {
  [ESTADOS_MOCK.sinServiceWorker]: {
    titulo: 'Este navegador no permite Service Workers',
    causa:
      'Suele pasar en la ventana privada de Firefox, cuando el navegador tiene los Service Workers ' +
      'deshabilitados o cuando el sitio no se abre con HTTPS.',
  },
  [ESTADOS_MOCK.errorInicio]: {
    titulo: 'El navegador no permitió iniciar los datos simulados',
    causa:
      'Puede deberse a la ventana privada, a la configuración de privacidad del navegador o a una ' +
      'extensión que bloquea los Service Workers o el almacenamiento del sitio.',
  },
  [ESTADOS_MOCK.errorCarga]: {
    titulo: 'No se pudieron descargar los datos simulados',
    causa: 'Parte del sitio no terminó de descargarse. Revisa tu conexión a internet.',
  },
}

const PASOS_SERVICE_WORKER = [
  'Abre el sitio en una ventana normal, no privada.',
  'O ábrelo en otro navegador.',
  'Si bloqueaste los Service Workers, las cookies o el almacenamiento para este sitio, permítelos y recarga la página.',
]

const PASOS_CARGA = ['Revisa tu conexión a internet y recarga la página.']

// Se muestra en lugar de la aplicación cuando la API simulada no pudo arrancar. Sin ella todas
// las consultas fallarían y se verían como "sin conexión", lo que no explica el problema real.
// Está fuera del router: es la misma pantalla en cualquier ruta
function MockNoDisponible({ estado }) {
  const aviso = AVISOS[estado] ?? AVISOS[ESTADOS_MOCK.errorInicio]
  const pasos = estado === ESTADOS_MOCK.errorCarga ? PASOS_CARGA : PASOS_SERVICE_WORKER

  return (
    <div className="flex min-h-screen flex-col">
      <TituloPagina texto="Datos simulados no disponibles" />
      <header className="bg-primario px-4 py-4 text-sobre-primario">
        <div className="mx-auto max-w-240">
          <p className="font-titulos text-2xl font-bold">{NOMBRE_SITIO}</p>
          <p className="mt-0.5 text-sm">{ESLOGAN}</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-240 flex-1 px-4 py-6">
        <h1>No podemos mostrar los datos del sitio</h1>
        <Aviso
          tipo="error"
          titulo={aviso.titulo}
          acciones={
            // Recargar no es navegación interna: vuelve a intentar el arranque del mock
            <Boton onClick={() => window.location.reload()}>Recargar la página</Boton>
          }
        >
          {EXPLICACION} {aviso.causa}
        </Aviso>
        <h2>Qué puedes hacer</h2>
        <ul className="list-disc space-y-1 pl-6 text-texto">
          {pasos.map((paso) => (
            <li key={paso}>{paso}</li>
          ))}
        </ul>
      </main>
    </div>
  )
}

export default MockNoDisponible
