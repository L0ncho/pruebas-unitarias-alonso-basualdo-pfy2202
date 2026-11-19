import { ApolloProvider } from '@apollo/client/react'
import { Outlet } from 'react-router'
import { clienteApollo } from '../services/clienteApollo.js'

// Ruta padre (con carga diferida) de las páginas que usan GraphQL: Apollo se descarga solo al
// visitarlas. La caché no se pierde al salir porque el cliente es único para toda la aplicación
function ProveedorApollo() {
  return (
    <ApolloProvider client={clienteApollo}>
      <Outlet />
    </ApolloProvider>
  )
}

export default ProveedorApollo
