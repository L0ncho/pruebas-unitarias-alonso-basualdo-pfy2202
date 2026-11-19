import { useEffect, useState } from 'react'
import Boton from './Boton.jsx'
import { guardarTema, leerTemaGuardado, TEMAS } from '../utils/tema.js'

// Sin elección guardada (o sin acceso a localStorage) se usa la preferencia del sistema
function temaInicial() {
  return (
    leerTemaGuardado() ??
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? TEMAS.oscuro : TEMAS.claro)
  )
}

function BotonTema() {
  const [tema, setTema] = useState(temaInicial)
  const oscuro = tema === TEMAS.oscuro

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
  }, [tema])

  // Solo se guarda una elección explícita; sin elección se sigue la preferencia del sistema
  function alternar() {
    const nuevoTema = oscuro ? TEMAS.claro : TEMAS.oscuro
    setTema(nuevoTema)
    guardarTema(nuevoTema)
  }

  return (
    <Boton variante="encabezado" tamano="compacto" aria-pressed={oscuro} onClick={alternar}>
      Modo oscuro
    </Boton>
  )
}

export default BotonTema
