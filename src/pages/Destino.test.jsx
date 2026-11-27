import { screen, waitFor, within } from '@testing-library/react'
import { graphql, HttpResponse } from 'msw'
import { TIEMPO_LIMITE_MS, VIGENCIA_CACHE_MS } from '../config/api.js'
import { NOMBRE_SITIO } from '../config/sitio.js'
import { destinos, hoteles, vuelos } from '../mocks/datos.js'
import { DEMORA_LENTA, ENDPOINT_GRAPHQL } from '../mocks/handlers.js'
import { CLAVE_SIMULACION, MODOS } from '../mocks/simulacion.js'
import { registrarPeticiones } from '../test/peticiones.js'
import { ESPERA, renderizarRuta } from '../test/renderizar.jsx'
import { server } from '../test/servidor.js'
import { avanzar, simularSoloFecha } from '../test/temporizadores.js'
import { formatearNoches, formatearPrecio } from '../utils/formato.js'
import { nochesHotel, nochesViaje, totalViaje } from '../utils/viaje.js'

// Más que la demora máxima del mock en modo normal (900 ms)
const DEMORA_NORMAL_MAXIMA = 1000

const SAN_PEDRO = destinos.find((destino) => destino.id === 1)
const vuelo = (aerolinea) => vuelos.find((item) => item.destinoId === 1 && item.aerolinea === aerolinea)
const hotel = (nombre) => hoteles.find((item) => item.nombre === nombre)

const AERO_ANDES = vuelo('AeroAndes')
const PACIFICO_SUR = vuelo('Pacífico Sur')
const DESIERTO_ROJO = hotel('Hotel Desierto Rojo')
const LODGE_ALTIPLANO = hotel('Lodge Altiplano')

const TEXTO_SIN_SELECCION = 'Elige un vuelo y un hotel para ver el total estimado.'
const TEXTO_TOTAL = 'Total estimado (1 pasajero, 1 habitación)'
const TEXTO_FECHAS_NO_CALZAN = /Las fechas del hotel no calzan con las del vuelo/

function esperarDestino(nombre = SAN_PEDRO.nombre) {
  return screen.findByRole('heading', { level: 1, name: nombre }, ESPERA)
}

function grupoVuelos() {
  return screen.getByRole('group', { name: 'Elige tu vuelo' })
}

function grupoHoteles() {
  return screen.getByRole('group', { name: 'Elige tu hotel' })
}

// El nombre accesible de cada opción empieza con la aerolínea o el nombre del hotel
function opcion(grupo, nombre) {
  return within(grupo).getByRole('radio', { name: new RegExp(`^${nombre}`) })
}

function resumen() {
  return screen.getByRole('complementary', { name: 'Tu viaje' })
}

// Valor (dd) de un término (dt) del resumen
function valorResumen(termino) {
  return within(resumen()).getByText(termino).nextElementSibling
}

function esperarFinDeCarga() {
  return waitFor(() => expect(screen.queryByText('Cargando vuelos y hoteles…')).not.toBeInTheDocument(), ESPERA)
}

function verificarResumen(vueloElegido, hotelElegido) {
  expect(valorResumen('Vuelo')).toHaveTextContent(vueloElegido.aerolinea)
  expect(valorResumen('Hotel')).toHaveTextContent(hotelElegido.nombre)
  expect(valorResumen('Noches del viaje')).toHaveTextContent(formatearNoches(nochesViaje(vueloElegido)))
  expect(valorResumen('Noches de hotel')).toHaveTextContent(formatearNoches(nochesHotel(hotelElegido)))
  expect(within(resumen()).getByText(TEXTO_TOTAL).nextElementSibling).toHaveTextContent(
    formatearPrecio(totalViaje(vueloElegido, hotelElegido)),
  )
}

describe('Destino', () => {
  describe('datos del destino', () => {
    it('muestra el encabezado del destino y sus opciones de vuelo y hotel', async () => {
      renderizarRuta('/destinos/1')

      expect(await screen.findByText('Cargando vuelos y hoteles…', {}, ESPERA)).toBeInTheDocument()
      expect(await esperarDestino()).toBeInTheDocument()
      expect(document.title).toBe(`${SAN_PEDRO.nombre} | ${NOMBRE_SITIO}`)
      expect(screen.getByText(SAN_PEDRO.pais)).toBeInTheDocument()
      expect(screen.getByText(SAN_PEDRO.descripcion)).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('Cómo llegar')

      const vuelosDelDestino = vuelos.filter((item) => item.destinoId === 1)
      const hotelesDelDestino = hoteles.filter((item) => item.destinoId === 1)
      expect(within(grupoVuelos()).getAllByRole('radio')).toHaveLength(vuelosDelDestino.length)
      expect(within(grupoHoteles()).getAllByRole('radio')).toHaveLength(hotelesDelDestino.length)
      // Las opciones agotadas no se pueden elegir
      expect(opcion(grupoVuelos(), 'Cóndor Air')).toBeDisabled()
      expect(opcion(grupoHoteles(), 'Hostal Licancabur')).toBeDisabled()
      expect(opcion(grupoVuelos(), 'AeroAndes')).toBeEnabled()

      expect(within(resumen()).getByText(TEXTO_SIN_SELECCION)).toBeInTheDocument()
      expect(within(resumen()).getByRole('button', { name: 'Limpiar selección' })).toBeDisabled()
    })

    it('un destino sin vuelos ni hoteles lo informa con un enlace a otros destinos', async () => {
      renderizarRuta('/destinos/8')

      expect(await esperarDestino('Madrid')).toBeInTheDocument()
      expect(await screen.findByText('Sin vuelos ni hoteles disponibles', {}, ESPERA)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ver otros destinos' })).toHaveAttribute('href', '/destinos')
      expect(screen.queryByRole('group', { name: 'Elige tu vuelo' })).not.toBeInTheDocument()
    })
  })

  describe('selección del viaje', () => {
    it('elegir vuelo y hotel actualiza las noches y el total del resumen', async () => {
      const { usuario } = renderizarRuta('/destinos/1')
      await esperarDestino()

      await usuario.click(opcion(grupoVuelos(), 'AeroAndes'))
      await usuario.click(opcion(grupoHoteles(), 'Hotel Desierto Rojo'))

      expect(opcion(grupoVuelos(), 'AeroAndes')).toBeChecked()
      verificarResumen(AERO_ANDES, DESIERTO_ROJO)
      expect(within(resumen()).queryByText(TEXTO_FECHAS_NO_CALZAN)).not.toBeInTheDocument()

      await usuario.click(opcion(grupoVuelos(), 'Pacífico Sur'))
      await usuario.click(opcion(grupoHoteles(), 'Lodge Altiplano'))

      expect(opcion(grupoVuelos(), 'AeroAndes')).not.toBeChecked()
      verificarResumen(PACIFICO_SUR, LODGE_ALTIPLANO)
      expect(within(resumen()).queryByText(TEXTO_FECHAS_NO_CALZAN)).not.toBeInTheDocument()
    })

    it('advierte cuando las fechas del hotel no calzan con las del vuelo', async () => {
      const { usuario } = renderizarRuta('/destinos/1')
      await esperarDestino()

      await usuario.click(opcion(grupoVuelos(), 'AeroAndes'))
      await usuario.click(opcion(grupoHoteles(), 'Lodge Altiplano'))

      verificarResumen(AERO_ANDES, LODGE_ALTIPLANO)
      expect(within(resumen()).getByText(TEXTO_FECHAS_NO_CALZAN)).toBeInTheDocument()
    })

    it('con solo el vuelo elegido indica lo que falta y "Limpiar selección" vuelve al inicio', async () => {
      const { usuario } = renderizarRuta('/destinos/1')
      await esperarDestino()

      await usuario.click(opcion(grupoVuelos(), 'AeroAndes'))

      expect(valorResumen('Hotel')).toHaveTextContent('Falta elegir un hotel')
      expect(within(resumen()).queryByText(TEXTO_TOTAL)).not.toBeInTheDocument()
      // Destino nacional: 2 horas de anticipación
      expect(within(resumen()).getByText(/llegar al aeropuerto con 2 horas de anticipación/)).toBeInTheDocument()

      await usuario.click(within(resumen()).getByRole('button', { name: 'Limpiar selección' }))

      expect(within(resumen()).getByText(TEXTO_SIN_SELECCION)).toBeInTheDocument()
      expect(opcion(grupoVuelos(), 'AeroAndes')).not.toBeChecked()
      expect(within(resumen()).getByRole('button', { name: 'Limpiar selección' })).toBeDisabled()
    })

    it('en un destino internacional recomienda 3 horas de anticipación', async () => {
      const { usuario } = renderizarRuta('/destinos/5')
      await esperarDestino('Cusco')
      const vueloCusco = vuelos.find((item) => item.destinoId === 5 && item.asientosDisponibles > 0)

      await usuario.click(opcion(grupoVuelos(), vueloCusco.aerolinea))

      expect(within(resumen()).getByText(/llegar al aeropuerto con 3 horas de anticipación/)).toBeInTheDocument()
      expect(valorResumen('Vuelo')).toHaveTextContent(vueloCusco.aerolinea)
    })
  })

  describe('destino inválido o inexistente', () => {
    it('un id no numérico muestra el aviso sin consultar la API', async () => {
      const peticiones = registrarPeticiones(ENDPOINT_GRAPHQL)
      renderizarRuta('/destinos/abc')

      expect(await esperarDestino('Destino no encontrado')).toBeInTheDocument()
      const alerta = screen.getByRole('alert')
      expect(alerta).toHaveTextContent('No encontrado')
      expect(alerta).toHaveTextContent('No existe un destino con el id «abc».')
      expect(within(alerta).queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
      expect(within(alerta).getByRole('link', { name: 'Ver todos los destinos' })).toHaveAttribute('href', '/destinos')
      expect(document.title).toBe(`Destino no encontrado | ${NOMBRE_SITIO}`)
      expect(peticiones).toHaveLength(0)
    })

    it.each([MODOS.normal, MODOS.errorServidor])(
      'un destino inexistente muestra "No encontrado" (modo "%s")',
      async (modo) => {
        sessionStorage.setItem(CLAVE_SIMULACION, modo)
        const peticiones = registrarPeticiones(ENDPOINT_GRAPHQL)
        renderizarRuta('/destinos/99')

        const alerta = await screen.findByRole('alert', {}, ESPERA)
        expect(alerta).toHaveTextContent('No encontrado')
        expect(alerta).toHaveTextContent('No existe un destino con el id «99».')
        expect(within(alerta).queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
        expect(screen.getByRole('heading', { level: 1, name: 'Destino no encontrado' })).toBeInTheDocument()
        expect(peticiones).toHaveLength(1)
      },
    )
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
      const { usuario } = renderizarRuta('/destinos/1')

      const alerta = await screen.findByRole('alert', {}, ESPERA)
      expect(alerta).toHaveTextContent(titulo)
      expect(alerta).toHaveTextContent(mensaje)
      expect(within(alerta).getByRole('link', { name: 'Ver todos los destinos' })).toBeInTheDocument()
      expect(screen.queryByRole('group', { name: 'Elige tu vuelo' })).not.toBeInTheDocument()

      await usuario.selectOptions(screen.getByRole('combobox', { name: 'Simulación de la API' }), 'Normal')
      await usuario.click(within(alerta).getByRole('button', { name: 'Reintentar' }))

      expect(await esperarDestino()).toBeInTheDocument()
      await esperarFinDeCarga()
      expect(grupoVuelos()).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('una respuesta con estructura inválida muestra "Datos incompletos" sin romper la página', async () => {
      server.use(
        graphql.query('OpcionesViaje', () =>
          HttpResponse.json({ data: { destino: { id: 1, nombre: 'Sin vuelos ni hoteles' } } }),
        ),
      )
      const { usuario } = renderizarRuta('/destinos/1')

      const alerta = await screen.findByRole('alert', {}, ESPERA)
      expect(alerta).toHaveTextContent('Datos incompletos')
      expect(screen.getByRole('heading', { level: 1, name: 'Vuelos y hoteles' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()

      server.resetHandlers()
      await usuario.click(within(alerta).getByRole('button', { name: 'Reintentar' }))

      expect(await esperarDestino()).toBeInTheDocument()
      await esperarFinDeCarga()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('tiempo límite', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    function renderizarConReloj() {
      return renderizarRuta('/destinos/1', { opcionesUsuario: { advanceTimers: jest.advanceTimersByTime } })
    }

    it('sin respuesta, al superar el tiempo límite muestra "Tiempo agotado" con Reintentar, que se recupera', async () => {
      sessionStorage.setItem(CLAVE_SIMULACION, MODOS.sinRespuesta)
      const peticiones = registrarPeticiones(ENDPOINT_GRAPHQL)
      const { usuario } = renderizarConReloj()
      await avanzar(0)
      expect(screen.getByText('Cargando vuelos y hoteles…')).toBeInTheDocument()
      expect(peticiones).toHaveLength(1)

      await avanzar(TIEMPO_LIMITE_MS - 1)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()

      await avanzar(1)
      const alerta = screen.getByRole('alert')
      expect(alerta).toHaveTextContent('Tiempo agotado')
      expect(alerta).toHaveTextContent('El servidor tardó demasiado en responder. Intenta nuevamente.')

      await usuario.selectOptions(screen.getByRole('combobox', { name: 'Simulación de la API' }), 'Normal')
      await usuario.click(within(alerta).getByRole('button', { name: 'Reintentar' }))
      await avanzar(DEMORA_NORMAL_MAXIMA)

      expect(screen.getByRole('heading', { level: 1, name: SAN_PEDRO.nombre })).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('la respuesta lenta (4 s) llega sin activar el tiempo límite', async () => {
      sessionStorage.setItem(CLAVE_SIMULACION, MODOS.lenta)
      renderizarConReloj()
      await avanzar(0)

      await avanzar(DEMORA_LENTA - 1)
      expect(screen.queryByRole('group', { name: 'Elige tu vuelo' })).not.toBeInTheDocument()
      await avanzar(1)

      expect(screen.getByRole('heading', { level: 1, name: SAN_PEDRO.nombre })).toBeInTheDocument()
      expect(grupoVuelos()).toBeInTheDocument()
      await avanzar(TIEMPO_LIMITE_MS)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('caché de Apollo', () => {
    const INICIO = new Date('2026-11-27T12:00:00Z').getTime()

    beforeEach(() => {
      simularSoloFecha()
      jest.setSystemTime(INICIO)
    })

    afterEach(() => jest.useRealTimers())

    // Sale al listado con la navegación y vuelve al destino con su tarjeta
    async function irAlListadoYVolver(usuario) {
      const navegacion = screen.getByRole('navigation', { name: 'Navegación principal' })
      await usuario.click(within(navegacion).getByRole('link', { name: 'Destinos' }))
      await usuario.click(
        await screen.findByRole('link', { name: `Ver vuelos y hoteles de ${SAN_PEDRO.nombre}` }, ESPERA),
      )
    }

    it('antes de vencer, volver al destino no hace una petición nueva', async () => {
      const peticiones = registrarPeticiones(ENDPOINT_GRAPHQL)
      const { usuario } = renderizarRuta('/destinos/1')
      await esperarDestino()

      jest.setSystemTime(INICIO + VIGENCIA_CACHE_MS - 1)
      await irAlListadoYVolver(usuario)

      expect(await esperarDestino()).toBeInTheDocument()
      expect(grupoVuelos()).toBeInTheDocument()
      expect(screen.queryByText('Cargando vuelos y hoteles…')).not.toBeInTheDocument()
      expect(peticiones).toHaveLength(1)
    })

    it('después de vencer muestra los datos anteriores mientras los actualiza', async () => {
      const peticiones = registrarPeticiones(ENDPOINT_GRAPHQL)
      const { usuario } = renderizarRuta('/destinos/1')
      await esperarDestino()

      jest.setSystemTime(INICIO + VIGENCIA_CACHE_MS)
      await irAlListadoYVolver(usuario)

      expect(await esperarDestino()).toBeInTheDocument()
      expect(screen.getByText('Cargando vuelos y hoteles…')).toBeInTheDocument()
      expect(grupoVuelos().closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true')

      await esperarFinDeCarga()
      expect(grupoVuelos().closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false')
      expect(peticiones).toHaveLength(2)
    })
  })
})
