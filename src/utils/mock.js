// Diagnóstico del arranque de la API simulada (MSW). Funciones puras: main.jsx les entrega lo
// que observó y decide con el resultado si muestra la aplicación o el aviso

export const ESTADOS_MOCK = {
  // El worker quedó activo: la aplicación funciona con normalidad
  activo: 'activo',
  // El navegador no ofrece Service Workers (ventana privada de Firefox, sitio sin HTTPS,
  // o Service Workers deshabilitados en la configuración)
  sinServiceWorker: 'sin-service-worker',
  // No se pudo descargar el código del mock (falla de red al pedir el módulo)
  errorCarga: 'error-carga',
  // El navegador no permitió cargar o iniciar el mock: almacenamiento bloqueado (MSW lee
  // localStorage al importarse), registro del worker rechazado, una extensión, etc.
  errorInicio: 'error-inicio',
}

// Si el navegador ofrece Service Workers. Recibe el objeto navigator (u otro con la misma forma).
// Leer navigator.serviceWorker puede lanzar SecurityError en contextos restringidos
export function soportaServiceWorker(navegador) {
  try {
    return typeof navegador?.serviceWorker?.register === 'function'
  } catch {
    return false
  }
}

// Mensajes con que cada navegador rechaza un import() cuyo módulo no se pudo descargar
// (siempre un TypeError): Chrome y Edge, Firefox y Safari
const FALLA_DESCARGA_MODULO =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i

// Si el error de un import() se debe a que el módulo no se descargó (red). Un SecurityError u
// otro error lanzado al evaluar el módulo no cuenta: el archivo sí llegó
export function esFallaDescargaModulo(error) {
  return (
    error?.name === 'TypeError' &&
    typeof error.message === 'string' &&
    FALLA_DESCARGA_MODULO.test(error.message)
  )
}

// Estado del mock a partir de lo observado al arrancar:
// - soportado: resultado de soportaServiceWorker
// - errorImportacion: error del import() del mock, o null
// - errorArranque: error de worker.start(), o null
// Solo una falla de descarga es "error-carga"; cualquier otro error es "error-inicio"
export function estadoMock({ soportado, errorImportacion = null, errorArranque = null }) {
  if (!soportado) return ESTADOS_MOCK.sinServiceWorker
  if (errorImportacion) {
    return esFallaDescargaModulo(errorImportacion) ? ESTADOS_MOCK.errorCarga : ESTADOS_MOCK.errorInicio
  }
  if (errorArranque) return ESTADOS_MOCK.errorInicio
  return ESTADOS_MOCK.activo
}
