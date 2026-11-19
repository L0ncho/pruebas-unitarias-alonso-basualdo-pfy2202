import { lazy } from 'react'
import { Route, Routes } from 'react-router'
import Layout from '../components/Layout.jsx'

// Cada página se descarga recién cuando se visita su ruta
const Inicio = lazy(() => import('../pages/Inicio.jsx'))
const Destinos = lazy(() => import('../pages/Destinos.jsx'))
// Incluye Apollo: se descarga junto con la página, solo al abrir un destino
const Destino = lazy(() => import('../pages/Destino.jsx'))
const NoEncontrado = lazy(() => import('../pages/NoEncontrado.jsx'))

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="destinos" element={<Destinos />} />
        <Route path="destinos/:id" element={<Destino />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
