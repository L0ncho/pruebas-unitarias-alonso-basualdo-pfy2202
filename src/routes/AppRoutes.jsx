import { lazy } from 'react'
import { Route, Routes } from 'react-router'
import Layout from '../components/Layout.jsx'

// Cada página se descarga recién cuando se visita su ruta
const Inicio = lazy(() => import('../pages/Inicio.jsx'))
const NoEncontrado = lazy(() => import('../pages/NoEncontrado.jsx'))

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
