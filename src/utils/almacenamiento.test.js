import { ALMACENES, guardarAlmacenamiento, leerAlmacenamiento } from './almacenamiento.js'
import { CLAVE_SIMULACION, guardarModoSimulacion, leerModoSimulacion, MODOS } from '../mocks/simulacion.js'
import { crearAlmacenamiento } from '../test/almacenamiento.js'
import { definirGlobal, sustituirGlobal } from '../test/globales.js'
import { CLAVE_TEMA, guardarTema, leerTemaGuardado, TEMAS } from './tema.js'

// Almacenamiento bloqueado como en Chrome con "No se permite guardar datos": leer la propiedad
// global (window.localStorage o window.sessionStorage) lanza SecurityError
function bloquearPropiedad(almacen) {
  definirGlobal(almacen, {
    get() {
      throw new DOMException(
        `Failed to read the '${almacen}' property from 'Window': Access is denied for this document.`,
        'SecurityError',
      )
    },
  })
}

// Almacenamiento que existe pero cuyos métodos lanzan SecurityError
function almacenamientoQueLanza() {
  const lanzar = () => {
    throw new DOMException('Access is denied for this document.', 'SecurityError')
  }
  return { getItem: lanzar, setItem: lanzar, removeItem: lanzar, clear: lanzar }
}

// Cada prueba reemplaza el almacenamiento de jsdom por uno propio (disponible, bloqueado,
// que lanza o inexistente). El setup (src/test/configuracion.js) restaura el de jsdom después
// de cada prueba con restaurarGlobales

describe.each([ALMACENES.local, ALMACENES.sesion])('%s', (almacen) => {
  it('lee y guarda cuando está disponible', () => {
    sustituirGlobal(almacen, crearAlmacenamiento())

    expect(guardarAlmacenamiento(almacen, 'airfly-prueba', 'valor')).toBe(true)
    expect(leerAlmacenamiento(almacen, 'airfly-prueba')).toBe('valor')
    expect(leerAlmacenamiento(almacen, 'airfly-otra')).toBeNull()
  })

  it('si leer la propiedad global lanza SecurityError: lee null y no guarda, sin lanzar', () => {
    bloquearPropiedad(almacen)

    expect(() => globalThis[almacen]).toThrow('Access is denied')
    expect(leerAlmacenamiento(almacen, 'airfly-prueba')).toBeNull()
    expect(guardarAlmacenamiento(almacen, 'airfly-prueba', 'valor')).toBe(false)
  })

  it('si getItem y setItem lanzan SecurityError: lee null y no guarda, sin lanzar', () => {
    sustituirGlobal(almacen, almacenamientoQueLanza())

    expect(leerAlmacenamiento(almacen, 'airfly-prueba')).toBeNull()
    expect(guardarAlmacenamiento(almacen, 'airfly-prueba', 'valor')).toBe(false)
  })

  it('si no existe: lee null y no guarda', () => {
    sustituirGlobal(almacen, undefined)

    expect(leerAlmacenamiento(almacen, 'airfly-prueba')).toBeNull()
    expect(guardarAlmacenamiento(almacen, 'airfly-prueba', 'valor')).toBe(false)
  })
})

describe('modo de simulación (sessionStorage)', () => {
  it('con almacenamiento disponible guarda y lee el modo', () => {
    sustituirGlobal('sessionStorage', crearAlmacenamiento())

    guardarModoSimulacion(MODOS.lenta)
    expect(sessionStorage.getItem(CLAVE_SIMULACION)).toBe(MODOS.lenta)
    expect(leerModoSimulacion()).toBe(MODOS.lenta)
  })

  it('con el almacenamiento bloqueado usa "normal" y guardar no rompe', () => {
    bloquearPropiedad('sessionStorage')

    expect(leerModoSimulacion()).toBe(MODOS.normal)
    expect(() => guardarModoSimulacion(MODOS.errorServidor)).not.toThrow()
    expect(leerModoSimulacion()).toBe(MODOS.normal)
  })

  it('un valor guardado inválido se ignora', () => {
    sustituirGlobal('sessionStorage', crearAlmacenamiento())
    sessionStorage.setItem(CLAVE_SIMULACION, 'otro')

    expect(leerModoSimulacion()).toBe(MODOS.normal)
  })
})

describe('tema (localStorage)', () => {
  it('con almacenamiento disponible guarda y lee el tema elegido', () => {
    sustituirGlobal('localStorage', crearAlmacenamiento())

    guardarTema(TEMAS.oscuro)
    expect(localStorage.getItem(CLAVE_TEMA)).toBe(TEMAS.oscuro)
    expect(leerTemaGuardado()).toBe(TEMAS.oscuro)
  })

  it('con el almacenamiento bloqueado no hay tema guardado (se sigue el sistema) y guardar no rompe', () => {
    bloquearPropiedad('localStorage')

    expect(leerTemaGuardado()).toBeNull()
    expect(() => guardarTema(TEMAS.claro)).not.toThrow()
  })

  it('un valor guardado inválido se ignora', () => {
    sustituirGlobal('localStorage', crearAlmacenamiento())
    localStorage.setItem(CLAVE_TEMA, 'azul')

    expect(leerTemaGuardado()).toBeNull()
  })
})
