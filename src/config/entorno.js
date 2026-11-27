// Único lugar de la aplicación que lee import.meta.env (lo completa Vite en desarrollo y al
// compilar). El resto de los módulos importa estos valores desde aquí.
// En Jest, moduleNameMapper reemplaza este archivo por src/test/entorno.js: import.meta no
// existe en los módulos CommonJS que genera Babel para las pruebas

// Base del sitio: "/" en desarrollo y la subcarpeta del repositorio en GitHub Pages
export const BASE_URL = import.meta.env.BASE_URL

// Si corre el servidor de desarrollo (npm run dev)
export const ES_DESARROLLO = import.meta.env.DEV
