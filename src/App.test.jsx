import { screen, waitFor, within } from '@testing-library/react'
import { ESLOGAN, NOMBRE_SITIO } from './config/sitio.js'
import { ESPERA, renderizarRuta } from './test/renderizar.jsx'

// React.lazy guarda la página ya cargada en el módulo de rutas: después de visitarla una vez, las
// pruebas siguientes del archivo ya no verían "Cargando página…". Para que la carga diferida se
// compruebe en cualquier orden (y con -t), cada prueba de ruta corre entera dentro de
// jest.isolateModulesAsync, con su propia copia de la aplicación, de React, del enrutador y de
// Testing Library. La prueba debe terminar dentro del bloque aislado: las páginas diferidas se
// importan durante la prueba y tienen que salir del mismo registro de módulos que el React que
// las renderiza. Se monta igual que renderizar (StrictMode y MemoryRouter), pero sin user-event
// (estas pruebas no interactúan). La limpieza automática de esa copia de Testing Library se
// desactiva, porque registraría un afterEach dentro de una prueba; se desmonta a mano al terminar
async function conAplicacionNueva(prueba) {
  await jest.isolateModulesAsync(async () => {
    globalThis.process.env.RTL_SKIP_AUTO_CLEANUP = 'true'
    const { cleanup, render } = await import('@testing-library/react')
    delete globalThis.process.env.RTL_SKIP_AUTO_CLEANUP
    const { StrictMode } = await import('react')
    const { MemoryRouter } = await import('react-router')
    const { default: App } = await import('./App.jsx')

    function montar(ruta) {
      render(
        <StrictMode>
          <MemoryRouter initialEntries={[ruta]}>
            <App />
          </MemoryRouter>
        </StrictMode>,
      )
    }

    try {
      await prueba(montar)
    } finally {
      cleanup()
    }
  })
}

// Espera a que termine la consulta de la página (si la hay) antes de desmontar
async function esperarFinDeCarga() {
  await waitFor(() => expect(screen.queryByText(/^Cargando/)).not.toBeInTheDocument(), ESPERA)
}

describe('App', () => {
  it.each([
    ['/', `Te damos la bienvenida a ${NOMBRE_SITIO}`, `${NOMBRE_SITIO} | ${ESLOGAN}`],
    ['/destinos', 'Destinos', `Destinos | ${NOMBRE_SITIO}`],
    ['/destinos/1', 'San Pedro de Atacama', `San Pedro de Atacama | ${NOMBRE_SITIO}`],
    ['/ruta-inexistente', 'Página no encontrada', `Página no encontrada | ${NOMBRE_SITIO}`],
  ])('la ruta "%s" carga su página de forma diferida dentro del Layout', (ruta, titulo, tituloPestana) =>
    conAplicacionNueva(async (montar) => {
      montar(ruta)

      // Mientras se descarga la página, el Layout ya está visible con el indicador de carga
      expect(screen.getByRole('status')).toHaveTextContent('Cargando página…')
      expect(screen.getByRole('banner')).toHaveTextContent(NOMBRE_SITIO)
      expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: 'Simulación de la API' })).toBeInTheDocument()

      const encabezado = await screen.findByRole('heading', { level: 1, name: titulo }, ESPERA)
      expect(screen.getByRole('main')).toContainElement(encabezado)
      expect(screen.queryByText('Cargando página…')).not.toBeInTheDocument()
      expect(document.title).toBe(tituloPestana)
      await esperarFinDeCarga()
    }),
  )

  it('la navegación marca como actual el enlace de la página visitada', async () => {
    const { usuario } = renderizarRuta('/')
    const navegacion = screen.getByRole('navigation', { name: 'Navegación principal' })
    await screen.findByRole('heading', { level: 1, name: `Te damos la bienvenida a ${NOMBRE_SITIO}` }, ESPERA)
    expect(within(navegacion).getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')

    await usuario.click(within(navegacion).getByRole('link', { name: 'Destinos' }))

    await screen.findByRole('heading', { level: 1, name: 'Destinos' }, ESPERA)
    expect(within(navegacion).getByRole('link', { name: 'Destinos' })).toHaveAttribute('aria-current', 'page')
    expect(within(navegacion).getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current')
    await esperarFinDeCarga()
  })
})
