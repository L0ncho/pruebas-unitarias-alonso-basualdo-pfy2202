import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

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

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // El sitio publicado vive en la subcarpeta del repositorio; en desarrollo se usa la raíz.
  // vite preview también corre con command "serve": sin isPreview serviría dist en la raíz,
  // aunque la compilación apunta a la subcarpeta, y no reproduciría GitHub Pages
  base: command === 'build' || isPreview ? '/viajes-alonso-basualdo-pfy2202/' : '/',
  plugins: [react(), tailwindcss(), copiarIndexComo404()],
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
  // Vitest: las pruebas corren en Node, sin entorno de navegador. La configuración común
  // (location para las rutas relativas de la API) está en src/test/configuracion.js
  test: {
    environment: 'node',
    setupFiles: ['./src/test/configuracion.js'],
  },
}))
