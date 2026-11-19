import { ApolloProvider } from '@apollo/client/react'
import { clienteApollo } from '../services/clienteApollo.js'

// Proveedor de Apollo para las páginas que usan GraphQL. La página lo importa directamente:
// así Apollo llega en el mismo archivo diferido que la página, en una sola descarga, y no se
// descarga en las rutas que no lo usan. La caché no se pierde al salir de la página porque el
// cliente es único para toda la aplicación
function ProveedorApollo({ children }) {
  return <ApolloProvider client={clienteApollo}>{children}</ApolloProvider>
}

export default ProveedorApollo
