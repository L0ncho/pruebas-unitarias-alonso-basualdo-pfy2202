// Apariencia de los botones: la usan Boton y los enlaces con aspecto de botón,
// para que ambos se vean siempre iguales. El hover usa not-disabled: (y no enabled:)
// porque un enlace nunca coincide con :enabled, pero tampoco está deshabilitado
const clasesBaseBoton =
  'inline-block cursor-pointer rounded-lg border text-center font-semibold no-underline disabled:cursor-not-allowed disabled:opacity-60'

const clasesVarianteBoton = {
  primario:
    'border-primario bg-primario text-sobre-primario not-disabled:hover:border-primario-oscuro not-disabled:hover:bg-primario-oscuro',
  secundario:
    'border-primario bg-superficie text-primario not-disabled:hover:bg-fondo not-disabled:hover:text-primario-oscuro',
  // Para usar sobre el fondo primario del encabezado
  encabezado:
    'border-sobre-primario bg-transparent text-sobre-primario not-disabled:hover:bg-primario-oscuro aria-pressed:bg-primario-oscuro focus-visible:outline-sobre-primario',
}

const clasesTamanoBoton = {
  normal: 'px-4.5 py-2.5',
  compacto: 'px-3 py-1',
}

export function clasesBoton(variante = 'primario', tamano = 'normal') {
  return [clasesBaseBoton, clasesVarianteBoton[variante], clasesTamanoBoton[tamano]].join(' ')
}

// Enlace (Link) con el aspecto del botón primario
export const clasesEnlaceBoton = clasesBoton('primario')

// Opción elegible (vuelo u hotel): un label que envuelve el radio y toda la tarjeta.
// La seleccionada se marca con borde y anillo primario y el foco de teclado se ve en la tarjeta.
// Una opción agotada no se atenúa (mantiene el contraste): se distingue por su etiqueta,
// el radio deshabilitado y el cursor
export const clasesOpcion =
  'flex h-full cursor-pointer gap-3 rounded-xl border border-borde bg-superficie p-4 text-texto has-checked:border-primario has-checked:ring-2 has-checked:ring-primario has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-primario has-disabled:cursor-not-allowed'

// Radio nativo de una opción: el foco se muestra en la tarjeta, no en el radio
export const clasesRadioOpcion =
  'mt-1 size-4 shrink-0 accent-primario focus-visible:outline-none disabled:cursor-not-allowed'

// Etiqueta "Agotado" de una opción sin disponibilidad
export const clasesEtiquetaAgotado =
  'rounded-full border border-peligro px-2 py-0.5 text-xs font-semibold text-peligro'

// Tarjeta enlazada de los listados
export const clasesTarjetaEnlace =
  'flex h-full flex-col gap-2 rounded-xl border border-borde bg-superficie p-5 font-normal text-texto no-underline hover:border-primario'
