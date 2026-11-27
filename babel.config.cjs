// Babel solo se usa en las pruebas: babel-jest transforma el código a CommonJS para Jest.
// Vite no lee este archivo (@vitejs/plugin-react 6 no usa Babel), así que npm run dev y
// npm run build no cambian. .cjs porque el paquete es "type": "module"

// import.meta no existe en CommonJS. Algunas dependencias lo leen (react-router consulta
// import.meta.hot, el reemplazo en caliente de Vite): se reemplaza por un objeto vacío, así esas
// lecturas dan undefined, como fuera de Vite. Solo se aplica a node_modules: el código de la
// aplicación lee import.meta.env únicamente en src/config/entorno.js, que Jest reemplaza por
// src/test/entorno.js (moduleNameMapper en jest.config.cjs)
function importMetaVacio({ types: t }) {
  return {
    name: 'import-meta-vacio',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          path.replaceWith(t.objectExpression([]))
        }
      },
    },
  }
}

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    // runtime automatic: JSX sin importar React, igual que en Vite
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  overrides: [{ test: /[\\/]node_modules[\\/]/, plugins: [importMetaVacio] }],
}
