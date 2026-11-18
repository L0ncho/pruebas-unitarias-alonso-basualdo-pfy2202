// Datos de la API simulada (solo datos, sin lógica). Precios en pesos chilenos (enteros)
// y fechas en formato ISO.
// Los ids de los destinos son estables: los vuelos y hoteles se asocian a ellos por id
export const destinos = [
  {
    id: 1,
    nombre: 'San Pedro de Atacama',
    pais: 'Chile',
    descripcion:
      'Un oasis en el desierto más árido del mundo, rodeado de salares, géiseres y volcanes. Sus cielos despejados lo hacen ideal para mirar las estrellas.',
    actividades: [
      'Géiseres del Tatio al amanecer',
      'Valle de la Luna',
      'Observación astronómica',
      'Lagunas altiplánicas',
    ],
  },
  {
    id: 2,
    nombre: 'Rapa Nui',
    pais: 'Chile',
    descripcion:
      'La isla de los moáis, en medio del océano Pacífico. Cultura ancestral, playas de arena blanca y paisajes volcánicos.',
    actividades: ['Ahu Tongariki al amanecer', 'Playa Anakena', 'Volcán Rano Kau', 'Buceo'],
  },
  {
    id: 3,
    nombre: 'Puerto Natales',
    pais: 'Chile',
    descripcion:
      'La puerta de entrada al Parque Nacional Torres del Paine, con glaciares, lagos turquesa y montañas de granito.',
    actividades: ['Trekking a la base de las Torres', 'Navegación al glaciar Grey', 'Cueva del Milodón'],
  },
  {
    id: 4,
    nombre: 'Valparaíso',
    pais: 'Chile',
    descripcion:
      'Ciudad puerto de cerros coloridos, ascensores históricos y murales. Patrimonio de la Humanidad.',
    actividades: [
      'Paseo por los cerros Alegre y Concepción',
      'Viaje en ascensor',
      'La Sebastiana',
      'Recorrido en lancha por la bahía',
    ],
  },
  {
    id: 5,
    nombre: 'Cusco',
    pais: 'Perú',
    descripcion:
      'La antigua capital del imperio inca, punto de partida hacia Machu Picchu y el Valle Sagrado.',
    actividades: ['Machu Picchu', 'Valle Sagrado', 'Montaña de Siete Colores', 'Barrio de San Blas'],
  },
  {
    id: 6,
    nombre: 'Buenos Aires',
    pais: 'Argentina',
    descripcion:
      'Una capital vibrante de cafés, teatros y barrios con identidad propia, donde el tango se vive en la calle.',
    actividades: ['Caminito en La Boca', 'Show de tango', 'Teatro Colón', 'Feria de San Telmo'],
  },
  {
    id: 7,
    nombre: 'Cancún',
    pais: 'México',
    descripcion:
      'Playas de arena blanca y mar turquesa en el Caribe mexicano, cerca de cenotes y ruinas mayas.',
    actividades: ['Isla Mujeres', 'Nado en cenotes', 'Chichén Itzá', 'Snorkel en arrecifes'],
  },
  {
    id: 8,
    nombre: 'Madrid',
    pais: 'España',
    descripcion:
      'La capital española combina museos de primer nivel, parques amplios y una vida nocturna que no se detiene.',
    actividades: ['Museo del Prado', 'Parque del Retiro', 'Palacio Real', 'Tapeo en La Latina'],
  },
]
