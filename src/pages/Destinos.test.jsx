import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { TIEMPO_LIMITE_MS, VIGENCIA_CACHE_MS } from '../config/api.js'
import { NOMBRE_SITIO, PAIS_NACIONAL } from '../config/sitio.js'
import { destinos } from '../mocks/datos.js'
import { DEMORA_LENTA } from '../mocks/handlers.js'
import { CLAVE_SIMULACION, MODOS } from '../mocks/simulacion.js'
import { registrarPeticiones } from '../test/peticiones.js'
import { ESPERA, renderizarRuta } from '../test/renderizar.jsx'
import { API, server } from '../test/servidor.js'
import { avanzar, simularSoloFecha } from '../test/temporizadores.js'

const RUTA_LISTADO = `${API}/destinos`
// Más que la demora máxima del mock en modo normal (900 ms)
const DEMORA_NORMAL_MAXIMA = 1000
const NACIONALES = destinos.filter((destino) => destino.pais === PAIS_NACIONAL)
const INTERNACIONALES = destinos.filter((destino) => destino.pais !== PAIS_NACIONAL)

function resumen({ id, nombre, pais, descripcion, actividades }) {
  return { id, nombre, pais, descripcion, actividades }
}

function esperarTarjetas() {
  return screen.findAllByRole('article', {}, ESPERA)
}

function nombresTarjetas() {
  return screen
    .getAllByRole('article')
    .map((tarjeta) => within(tarjeta).getByRole('heading', { level: 2 }).textContent)
}

function ubicacion() {
  return screen.getByRole('status', { name: 'Ubicación actual' })
}

function navegacion() {
  return screen.getByRole('navigation', { name: 'Navegación principal' })
}

function selectorSimulacion() {
  return screen.getByRole('combobox', { name: 'Simulación de la API' })
}

describe('Destinos', () => {
  describe('listado', () => {
    it('muestra la carga y después las tarjetas con sus datos y el enlace a cada detalle', async () => {
      renderizarRuta('/destinos')

      expect(await screen.findByText('Cargando destinos…', {}, ESPERA)).toBeInTheDocument()
      expect(await esperarTarjetas()).toHaveLength(destinos.length)
      expect(screen.queryByText('Cargando destinos…')).not.toBeInTheDocument()
      expect(nombresTarjetas()).toEqual(destinos.map((destino) => destino.nombre))
      expect(screen.getByText(`Mostrando ${destinos.length} de ${destinos.length} destinos`)).toBeInTheDocument()

      for (const destino of destinos) {
        expect(screen.getByRole('link', { name: `Ver vuelos y hoteles de ${destino.nombre}` })).toHaveAttribute(
          'href',
          `/destinos/${destino.id}`,
        )
      }
    })

    it('una lista vacía muestra el aviso con Reintentar, que vuelve a consultar', async () => {
      server.use(http.get(RUTA_LISTADO, () => HttpResponse.json([])))
      const { usuario } = renderizarRuta('/destinos')

      expect(await screen.findByText('Sin destinos disponibles', {}, ESPERA)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
      expect(screen.queryByRole('group', { name: 'Filtrar por región' })).not.toBeInTheDocument()

      server.resetHandlers()
      await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))

      expect(await esperarTarjetas()).toHaveLength(destinos.length)
      expect(screen.queryByText('Sin destinos disponibles')).not.toBeInTheDocument()
    })
  })

  describe('filtro por región', () => {
    it('al elegir una región actualiza ?region= y deja solo los destinos de esa región', async () => {
      const { usuario } = renderizarRuta('/destinos', { conUbicacion: true })
      await esperarTarjetas()

      await usuario.click(screen.getByRole('radio', { name: 'Nacionales' }))

      expect(ubicacion()).toHaveTextContent('/destinos?region=nacionales')
      expect(screen.getByRole('radio', { name: 'Nacionales' })).toBeChecked()
      expect(nombresTarjetas()).toEqual(NACIONALES.map((destino) => destino.nombre))
      expect(screen.getByText(`Mostrando ${NACIONALES.length} de ${destinos.length} destinos`)).toBeInTheDocument()
    })

    it('la URL con ?region= abre la página ya filtrada', async () => {
      renderizarRuta('/destinos?region=internacionales')
      await esperarTarjetas()

      expect(screen.getByRole('radio', { name: 'Internacionales' })).toBeChecked()
      expect(nombresTarjetas()).toEqual(INTERNACIONALES.map((destino) => destino.nombre))
    })

    it('volver a "Todos" quita el parámetro y muestra todos los destinos', async () => {
      const { usuario } = renderizarRuta('/destinos?region=nacionales', { conUbicacion: true })
      await esperarTarjetas()

      await usuario.click(screen.getByRole('radio', { name: 'Todos' }))

      expect(ubicacion()).toHaveTextContent(/^\/destinos$/)
      expect(screen.getAllByRole('article')).toHaveLength(destinos.length)
    })

    it('una región desconocida en la URL se trata como "Todos"', async () => {
      renderizarRuta('/destinos?region=antartica')
      await esperarTarjetas()

      expect(screen.getByRole('radio', { name: 'Todos' })).toBeChecked()
      expect(screen.getAllByRole('article')).toHaveLength(destinos.length)
    })

    it('una región sin destinos lo informa y su enlace vuelve a mostrar todos', async () => {
      server.use(http.get(RUTA_LISTADO, () => HttpResponse.json(NACIONALES.map(resumen))))
      const { usuario } = renderizarRuta('/destinos', { conUbicacion: true })
      await esperarTarjetas()

      await usuario.click(screen.getByRole('radio', { name: 'Internacionales' }))

      expect(screen.getByText(/No hay destinos en esta región\./)).toBeInTheDocument()
      expect(screen.getByText(`Mostrando 0 de ${NACIONALES.length} destinos`)).toBeInTheDocument()
      expect(screen.queryByRole('article')).not.toBeInTheDocument()

      await usuario.click(screen.getByRole('link', { name: 'Ver todos los destinos' }))

      expect(ubicacion()).toHaveTextContent(/^\/destinos$/)
      expect(screen.getByRole('radio', { name: 'Todos' })).toBeChecked()
      expect(screen.getAllByRole('article')).toHaveLength(NACIONALES.length)
    })
  })

  describe('errores', () => {
    it.each([
      [MODOS.errorServidor, 'Error del servidor', 'El servidor tuvo un problema. Intenta nuevamente en unos momentos.'],
      [
        MODOS.sinConexion,
        'Sin conexión',
        `No pudimos conectarnos con ${NOMBRE_SITIO}. Revisa tu conexión a internet e intenta nuevamente.`,
      ],
    ])('en modo "%s" muestra "%s" con Reintentar, que se recupera al volver al modo normal', async (modo, titulo, mensaje) => {
      sessionStorage.setItem(CLAVE_SIMULACION, modo)
      const { usuario } = renderizarRuta('/destinos')

      const alerta = await screen.findByRole('alert', {}, ESPERA)
      expect(alerta).toHaveTextContent(titulo)
      expect(alerta).toHaveTextContent(mensaje)
      expect(within(alerta).getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
      expect(screen.queryByRole('article')).not.toBeInTheDocument()

      await usuario.selectOptions(selectorSimulacion(), 'Normal')
      await usuario.click(within(alerta).getByRole('button', { name: 'Reintentar' }))

      expect(await esperarTarjetas()).toHaveLength(destinos.length)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('una respuesta con estructura inválida muestra "Datos incompletos" sin romper la página', async () => {
      server.use(http.get(RUTA_LISTADO, () => HttpResponse.json([{ id: 1, nombre: 'Sin país ni actividades' }])))
      const { usuario } = renderizarRuta('/destinos')

      const alerta = await screen.findByRole('alert', {}, ESPERA)
      expect(alerta).toHaveTextContent('Datos incompletos')
      expect(alerta).toHaveTextContent('La respuesta del servidor llegó incompleta o con un formato inválido.')
      expect(screen.getByRole('heading', { level: 1, name: 'Destinos' })).toBeInTheDocument()
      expect(screen.queryByText('Sin país ni actividades')).not.toBeInTheDocument()

      server.resetHandlers()
      await usuario.click(within(alerta).getByRole('button', { name: 'Reintentar' }))

      expect(await esperarTarjetas()).toHaveLength(destinos.length)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('tiempo límite', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    function renderizarConReloj() {
      return renderizarRuta('/destinos', { opcionesUsuario: { advanceTimers: jest.advanceTimersByTime } })
    }

    it('sin respuesta, al superar el tiempo límite muestra "Tiempo agotado" con Reintentar, que se recupera', async () => {
      sessionStorage.setItem(CLAVE_SIMULACION, MODOS.sinRespuesta)
      const peticiones = registrarPeticiones(RUTA_LISTADO)
      const { usuario } = renderizarConReloj()
      await avanzar(0)
      expect(screen.getByText('Cargando destinos…')).toBeInTheDocument()
      expect(peticiones).toHaveLength(1)

      await avanzar(TIEMPO_LIMITE_MS - 1)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByText('Cargando destinos…')).toBeInTheDocument()

      await avanzar(1)
      const alerta = screen.getByRole('alert')
      expect(alerta).toHaveTextContent('Tiempo agotado')
      expect(alerta).toHaveTextContent('El servidor tardó demasiado en responder. Intenta nuevamente.')
      expect(screen.queryByText('Cargando destinos…')).not.toBeInTheDocument()

      await usuario.selectOptions(selectorSimulacion(), 'Normal')
      await usuario.click(within(alerta).getByRole('button', { name: 'Reintentar' }))
      await avanzar(DEMORA_NORMAL_MAXIMA)

      expect(screen.getAllByRole('article')).toHaveLength(destinos.length)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('la respuesta lenta (4 s) llega sin activar el tiempo límite', async () => {
      sessionStorage.setItem(CLAVE_SIMULACION, MODOS.lenta)
      renderizarConReloj()
      await avanzar(0)

      await avanzar(DEMORA_LENTA - 1)
      expect(screen.queryByRole('article')).not.toBeInTheDocument()
      await avanzar(1)

      expect(screen.getAllByRole('article')).toHaveLength(destinos.length)
      await avanzar(TIEMPO_LIMITE_MS)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('caché', () => {
    const INICIO = new Date('2026-11-27T12:00:00Z').getTime()

    beforeEach(() => {
      simularSoloFecha()
      jest.setSystemTime(INICIO)
    })

    afterEach(() => jest.useRealTimers())

    async function irAInicioYVolver(usuario) {
      await usuario.click(within(navegacion()).getByRole('link', { name: 'Inicio' }))
      await screen.findByRole('heading', { level: 1, name: `Te damos la bienvenida a ${NOMBRE_SITIO}` }, ESPERA)
      await usuario.click(within(navegacion()).getByRole('link', { name: 'Destinos' }))
    }

    it('antes de vencer, volver al listado no hace una petición nueva', async () => {
      const peticiones = registrarPeticiones(RUTA_LISTADO)
      const { usuario } = renderizarRuta('/destinos')
      await esperarTarjetas()

      jest.setSystemTime(INICIO + VIGENCIA_CACHE_MS - 1)
      await irAInicioYVolver(usuario)

      expect(screen.getAllByRole('article')).toHaveLength(destinos.length)
      expect(screen.queryByText('Cargando destinos…')).not.toBeInTheDocument()
      expect(peticiones).toHaveLength(1)
    })

    it('después de vencer muestra los datos anteriores mientras los actualiza con una petición nueva', async () => {
      const peticiones = registrarPeticiones(RUTA_LISTADO)
      const { usuario } = renderizarRuta('/destinos')
      await esperarTarjetas()

      jest.setSystemTime(INICIO + VIGENCIA_CACHE_MS)
      await irAInicioYVolver(usuario)

      const tarjetas = screen.getAllByRole('article')
      expect(tarjetas).toHaveLength(destinos.length)
      expect(screen.getByText('Cargando destinos…')).toBeInTheDocument()
      expect(tarjetas[0].closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true')

      await waitFor(() => expect(screen.queryByText('Cargando destinos…')).not.toBeInTheDocument(), ESPERA)
      expect(tarjetas[0].closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false')
      expect(screen.getAllByRole('article')).toHaveLength(destinos.length)
      expect(peticiones).toHaveLength(2)
    })
  })

  it('salir mientras carga cancela la consulta sin mostrar un error al volver', async () => {
    const consoleError = jest.spyOn(console, 'error')
    const peticiones = registrarPeticiones(RUTA_LISTADO)
    const { usuario } = renderizarRuta('/destinos')
    await screen.findByText('Cargando destinos…', {}, ESPERA)

    await usuario.click(within(navegacion()).getByRole('link', { name: 'Inicio' }))
    await screen.findByRole('heading', { level: 1, name: `Te damos la bienvenida a ${NOMBRE_SITIO}` }, ESPERA)
    await waitFor(() => expect(peticiones[0].signal.aborted).toBe(true))

    await usuario.click(within(navegacion()).getByRole('link', { name: 'Destinos' }))

    expect(await esperarTarjetas()).toHaveLength(destinos.length)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
