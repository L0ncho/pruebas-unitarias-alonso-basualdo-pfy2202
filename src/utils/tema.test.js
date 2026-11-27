/**
 * @jest-environment node
 */
// Entorno node: la prueba reemplaza window y document por versiones mínimas, y en jsdom window
// no se puede reemplazar
import { restaurarGlobales, sustituirGlobal } from '../test/globales.js'
import { CLAVE_TEMA, SCRIPT_TEMA_INICIAL, TEMAS } from './tema.js'

// El script que vite.config.js inserta en index.html, ejecutado con un documento y un
// almacenamiento simulados. Usa la clave y los valores de este módulo
function ejecutarScript({ guardado, leerLanza = false, sistemaOscuro = false }) {
  const atributos = {}
  sustituirGlobal('localStorage', {
    getItem: (clave) => {
      if (leerLanza) throw new Error('SecurityError')
      return clave === CLAVE_TEMA ? guardado : null
    },
  })
  sustituirGlobal('window', { matchMedia: () => ({ matches: sistemaOscuro }) })
  sustituirGlobal('document', { documentElement: { setAttribute: (nombre, valor) => (atributos[nombre] = valor) } })
  new Function(SCRIPT_TEMA_INICIAL)()
  return atributos['data-tema']
}

afterEach(() => restaurarGlobales())

describe('SCRIPT_TEMA_INICIAL', () => {
  it('aplica el tema guardado con la clave de tema.js', () => {
    expect(ejecutarScript({ guardado: TEMAS.oscuro })).toBe(TEMAS.oscuro)
    expect(ejecutarScript({ guardado: TEMAS.claro, sistemaOscuro: true })).toBe(TEMAS.claro)
  })

  it('sin tema válido o con el almacenamiento bloqueado sigue la preferencia del sistema', () => {
    expect(ejecutarScript({ guardado: 'otro', sistemaOscuro: true })).toBe(TEMAS.oscuro)
    expect(ejecutarScript({ guardado: null })).toBe(TEMAS.claro)
    expect(ejecutarScript({ leerLanza: true, sistemaOscuro: true })).toBe(TEMAS.oscuro)
  })
})
