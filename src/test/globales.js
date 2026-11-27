// Reemplazo temporal de propiedades globales (localStorage, sessionStorage, window, document...),
// equivalente a vi.stubGlobal de Vitest, que Jest no trae. El setup llama a restaurarGlobales
// después de cada prueba: cada propiedad vuelve a su descriptor original o, si no existía como
// propiedad propia de globalThis, se borra y reaparece la heredada (por ejemplo, la de jsdom)

const originales = new Map()

// Define la propiedad global con el descriptor dado (value, o get para simular una lectura que lanza)
export function definirGlobal(nombre, descriptor) {
  if (!originales.has(nombre)) {
    originales.set(nombre, Object.getOwnPropertyDescriptor(globalThis, nombre))
  }
  Object.defineProperty(globalThis, nombre, { configurable: true, enumerable: true, ...descriptor })
}

// Reemplaza la propiedad global por un valor (también undefined, para simular que no existe)
export function sustituirGlobal(nombre, valor) {
  definirGlobal(nombre, { value: valor, writable: true })
}

export function restaurarGlobales() {
  for (const [nombre, descriptor] of originales) {
    if (descriptor) {
      Object.defineProperty(globalThis, nombre, descriptor)
    } else {
      delete globalThis[nombre]
    }
  }
  originales.clear()
}
