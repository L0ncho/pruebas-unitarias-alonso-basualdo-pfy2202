// Almacenamiento en memoria con la interfaz de Web Storage (getItem, setItem, removeItem, clear).
// En Node no hay sessionStorage: las pruebas lo reemplazan con esto para elegir el modo de
// simulación de la API igual que el selector del pie
export function crearAlmacenamiento() {
  const valores = new Map()

  return {
    getItem: (clave) => (valores.has(clave) ? valores.get(clave) : null),
    setItem: (clave, valor) => valores.set(clave, String(valor)),
    removeItem: (clave) => valores.delete(clave),
    clear: () => valores.clear(),
  }
}
