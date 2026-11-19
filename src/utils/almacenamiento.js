// Acceso seguro a localStorage y sessionStorage. Con el almacenamiento bloqueado (por ejemplo,
// Chrome con "No se permite guardar datos" para el sitio) leer window.localStorage o
// window.sessionStorage lanza SecurityError; en otros casos el objeto no existe o getItem falla.
// Aquí todo eso se trata igual: leer devuelve null y guardar devuelve false, sin lanzar.
// Cada consumidor decide su valor por defecto

export const ALMACENES = {
  local: 'localStorage',
  sesion: 'sessionStorage',
}

// El acceso a globalThis[almacen] va dentro del try: es la propiedad misma la que puede lanzar
export function leerAlmacenamiento(almacen, clave) {
  try {
    const valor = globalThis[almacen]?.getItem(clave)
    return typeof valor === 'string' ? valor : null
  } catch {
    return null
  }
}

// Devuelve true si se guardó
export function guardarAlmacenamiento(almacen, clave, valor) {
  try {
    const destino = globalThis[almacen]
    if (typeof destino?.setItem !== 'function') return false
    destino.setItem(clave, valor)
    return true
  } catch {
    return false
  }
}
