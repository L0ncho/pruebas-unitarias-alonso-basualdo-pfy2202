import { screen } from '@testing-library/react'
import { renderizarRuta } from './renderizar.jsx'
import { server } from './servidor.js'
import { ESLOGAN, NOMBRE_SITIO } from '../config/sitio.js'
import { ENDPOINT_GRAPHQL } from '../mocks/handlers.js'

// Pruebas de humo de la base de pruebas: Testing Library, el enrutador con sus páginas diferidas,
// el cliente Apollo de la aplicación y la API simulada (MSW) funcionando juntos

// Las páginas se cargan de forma diferida y el mock demora entre 400 y 900 ms en responder
const ESPERA = { timeout: 3000 }

let peticiones

beforeEach(() => {
  peticiones = []
  server.events.on('request:start', ({ request }) => peticiones.push(request))
})

afterEach(() => server.events.removeAllListeners())

it('la ruta "/" muestra la página de inicio dentro del Layout', async () => {
  renderizarRuta('/')

  expect(
    await screen.findByRole('heading', { level: 1, name: `Te damos la bienvenida a ${NOMBRE_SITIO}` }, ESPERA),
  ).toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getAllByText(ESLOGAN).length).toBeGreaterThan(0)
  // La portada no consulta la API
  expect(peticiones).toHaveLength(0)
})

it('la ruta "/destinos/1" muestra el destino que entrega la API GraphQL simulada', async () => {
  renderizarRuta('/destinos/1')

  // El nombre del destino solo llega por GraphQL: el h1 lo muestra cuando Apollo recibe la respuesta
  expect(
    await screen.findByRole('heading', { level: 1, name: 'San Pedro de Atacama' }, ESPERA),
  ).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'Elige tu vuelo' })).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'Elige tu hotel' })).toBeInTheDocument()
  expect(peticiones).toHaveLength(1)
  expect(new URL(peticiones[0].url).pathname).toBe(ENDPOINT_GRAPHQL)
})
