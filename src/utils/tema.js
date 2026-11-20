import { ALMACENES, guardarAlmacenamiento, leerAlmacenamiento } from './almacenamiento.js'

// Tema guardado por el usuario. La clave lleva el prefijo del sitio porque otros sitios publicados
// en el mismo dominio comparten el localStorage
export const CLAVE_TEMA = 'airfly-tema'

export const TEMAS = {
  claro: 'claro',
  oscuro: 'oscuro',
}

// Script que aplica el tema antes del primer pintado (sin destello del tema claro). vite.config.js
// lo inserta en el <head> de index.html como script clásico y síncrono, así la clave y los valores
// salen solo de este archivo. Leer localStorage va en try/catch: con el almacenamiento bloqueado
// lanza SecurityError y se sigue la preferencia del sistema
export const SCRIPT_TEMA_INICIAL = `(function () {
  var clave = ${JSON.stringify(CLAVE_TEMA)}
  var claro = ${JSON.stringify(TEMAS.claro)}
  var oscuro = ${JSON.stringify(TEMAS.oscuro)}
  var tema = null
  try {
    tema = localStorage.getItem(clave)
  } catch (e) {}
  if (tema !== oscuro && tema !== claro) {
    tema = window.matchMedia('(prefers-color-scheme: dark)').matches ? oscuro : claro
  }
  document.documentElement.setAttribute('data-tema', tema)
})()`

// Tema elegido explícitamente, o null si no hay uno válido o localStorage no está disponible
// (entonces se sigue la preferencia del sistema)
export function leerTemaGuardado() {
  const guardado = leerAlmacenamiento(ALMACENES.local, CLAVE_TEMA)
  return guardado === TEMAS.oscuro || guardado === TEMAS.claro ? guardado : null
}

// Si no se puede guardar, el tema igual se aplica durante la visita
export function guardarTema(tema) {
  if (tema !== TEMAS.oscuro && tema !== TEMAS.claro) return
  guardarAlmacenamiento(ALMACENES.local, CLAVE_TEMA, tema)
}
