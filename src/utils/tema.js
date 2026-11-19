import { ALMACENES, guardarAlmacenamiento, leerAlmacenamiento } from './almacenamiento.js'

// Tema guardado por el usuario. Misma clave y valores que el script de index.html que aplica el
// tema antes de cargar React. La clave lleva el prefijo del sitio porque otros sitios publicados
// en el mismo dominio comparten el localStorage
export const CLAVE_TEMA = 'airfly-tema'

export const TEMAS = {
  claro: 'claro',
  oscuro: 'oscuro',
}

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
