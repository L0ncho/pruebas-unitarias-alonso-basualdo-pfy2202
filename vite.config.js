import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { SCRIPT_TEMA_INICIAL } from './src/utils/tema.js'

// GitHub Pages responde con 404.html al recargar una ruta interna:
// se copia index.html para que la SPA cargue y React Router resuelva la ruta
function copiarIndexComo404() {
  let carpetaSalida

  return {
    name: 'copiar-index-como-404',
    apply: 'build',
    configResolved(config) {
      carpetaSalida = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      copyFileSync(resolve(carpetaSalida, 'index.html'), resolve(carpetaSalida, '404.html'))
    },
  }
}

// Inserta en el <head> el script que aplica el tema antes del primer pintado. Su clave y sus
// valores salen de src/utils/tema.js, la misma fuente que usa la aplicación. Corre en desarrollo
// y al compilar
function scriptTemaInicial() {
  return {
    name: 'script-tema-inicial',
    transformIndexHtml() {
      return [{ tag: 'script', children: SCRIPT_TEMA_INICIAL, injectTo: 'head' }]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // El sitio publicado vive en la subcarpeta del repositorio; en desarrollo se usa la raíz.
  // vite preview también corre con command "serve": sin isPreview serviría dist en la raíz,
  // aunque la compilación apunta a la subcarpeta, y no reproduciría GitHub Pages
  base: command === 'build' || isPreview ? '/pruebas-unitarias-alonso-basualdo-pfy2202/' : '/',
  plugins: [react(), tailwindcss(), copiarIndexComo404(), scriptTemaInicial()],
  // graphql se divide en dos archivos:
  // - graphql-lenguaje (analizador y utilidades de lenguaje): lo usan de forma estática MSW (para
  //   reconocer las operaciones) y Apollo, así que siempre se descarga al iniciar el mock.
  // - graphql (esquema, validación y ejecución): solo lo usa el mock para responder, y lo carga
  //   de forma diferida con la primera consulta GraphQL.
  // Sin estos grupos, el empaquetador junta todo graphql (y módulos de la aplicación que el mock
  // importa al iniciar, como utils/ids.js) en un mismo archivo que se descarga antes del primer
  // render en todas las páginas
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'graphql-lenguaje',
              test: /[\\/]node_modules[\\/]graphql[\\/](language|jsutils|error|polyfills)[\\/]/,
              priority: 2,
            },
            { name: 'graphql', test: /[\\/]node_modules[\\/]graphql[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
}))
