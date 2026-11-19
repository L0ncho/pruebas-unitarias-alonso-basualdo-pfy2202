// Datos de la API simulada (solo datos, sin lógica). Precios en pesos chilenos (enteros)
// y fechas en formato ISO. notaLlegada (opcional) explica cómo se llega cuando el destino
// no tiene aeropuerto propio o sus vuelos son de temporada.
// Los ids de los destinos son estables: los vuelos y hoteles se asocian a ellos por id
export const destinos = [
  {
    id: 1,
    nombre: 'San Pedro de Atacama',
    pais: 'Chile',
    notaLlegada:
      'Los vuelos llegan a Calama, a unos 100 km de San Pedro de Atacama. El traslado terrestre no está incluido.',
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
    notaLlegada:
      'El aeropuerto de Puerto Natales recibe vuelos comerciales principalmente en temporada alta (verano).',
    descripcion:
      'La puerta de entrada al Parque Nacional Torres del Paine, con glaciares, lagos turquesa y montañas de granito.',
    actividades: ['Trekking a la base de las Torres', 'Navegación al glaciar Grey', 'Cueva del Milodón'],
  },
  {
    id: 4,
    nombre: 'Valparaíso',
    pais: 'Chile',
    notaLlegada:
      'Valparaíso no tiene aeropuerto comercial: los vuelos llegan a Santiago, a unos 120 km. El traslado terrestre no está incluido.',
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

// Vuelos ida y vuelta asociados a un destino por destinoId. origen y llegada: ciudad y código
// IATA del aeropuerto. precio: CLP por persona.
// asientosDisponibles 0 = sin disponibilidad. Madrid (8) no tiene vuelos ni hoteles
export const vuelos = [
  // San Pedro de Atacama
  { id: 101, destinoId: 1, aerolinea: 'AeroAndes', origen: 'Santiago (SCL)', llegada: 'Calama (CJC)', fechaIda: '2026-12-10', fechaVuelta: '2026-12-15', escalas: 0, precio: 189990, asientosDisponibles: 12 },
  { id: 102, destinoId: 1, aerolinea: 'Cóndor Air', origen: 'Santiago (SCL)', llegada: 'Calama (CJC)', fechaIda: '2026-12-10', fechaVuelta: '2026-12-15', escalas: 0, precio: 134990, asientosDisponibles: 0 },
  { id: 103, destinoId: 1, aerolinea: 'Pacífico Sur', origen: 'Santiago (SCL)', llegada: 'Calama (CJC)', fechaIda: '2027-01-07', fechaVuelta: '2027-01-12', escalas: 0, precio: 119990, asientosDisponibles: 5 },
  // Rapa Nui
  { id: 104, destinoId: 2, aerolinea: 'AeroAndes', origen: 'Santiago (SCL)', llegada: 'Isla de Pascua (IPC)', fechaIda: '2026-12-18', fechaVuelta: '2026-12-25', escalas: 0, precio: 589990, asientosDisponibles: 4 },
  { id: 105, destinoId: 2, aerolinea: 'AeroAndes', origen: 'Santiago (SCL)', llegada: 'Isla de Pascua (IPC)', fechaIda: '2027-01-15', fechaVuelta: '2027-01-22', escalas: 0, precio: 549990, asientosDisponibles: 0 },
  // Puerto Natales
  { id: 106, destinoId: 3, aerolinea: 'Pacífico Sur', origen: 'Santiago (SCL)', llegada: 'Puerto Natales (PNT)', fechaIda: '2027-01-20', fechaVuelta: '2027-01-27', escalas: 1, precio: 259990, asientosDisponibles: 9 },
  { id: 107, destinoId: 3, aerolinea: 'Cóndor Air', origen: 'Santiago (SCL)', llegada: 'Puerto Natales (PNT)', fechaIda: '2027-02-03', fechaVuelta: '2027-02-10', escalas: 0, precio: 289990, asientosDisponibles: 7 },
  // Valparaíso (llegada a Santiago)
  { id: 108, destinoId: 4, aerolinea: 'Cóndor Air', origen: 'Antofagasta (ANF)', llegada: 'Santiago (SCL)', fechaIda: '2026-12-28', fechaVuelta: '2027-01-02', escalas: 0, precio: 149990, asientosDisponibles: 10 },
  { id: 109, destinoId: 4, aerolinea: 'Pacífico Sur', origen: 'Puerto Montt (PMC)', llegada: 'Santiago (SCL)', fechaIda: '2026-12-28', fechaVuelta: '2027-01-02', escalas: 0, precio: 129990, asientosDisponibles: 0 },
  // Cusco
  { id: 110, destinoId: 5, aerolinea: 'AeroAndes', origen: 'Santiago (SCL)', llegada: 'Cusco (CUZ)', fechaIda: '2027-02-12', fechaVuelta: '2027-02-19', escalas: 1, precio: 429990, asientosDisponibles: 8 },
  { id: 111, destinoId: 5, aerolinea: 'Pacífico Sur', origen: 'Santiago (SCL)', llegada: 'Cusco (CUZ)', fechaIda: '2027-03-05', fechaVuelta: '2027-03-12', escalas: 1, precio: 389990, asientosDisponibles: 3 },
  // Buenos Aires
  { id: 112, destinoId: 6, aerolinea: 'Austral Vuelos', origen: 'Santiago (SCL)', llegada: 'Buenos Aires, Aeroparque (AEP)', fechaIda: '2026-12-03', fechaVuelta: '2026-12-07', escalas: 0, precio: 219990, asientosDisponibles: 15 },
  { id: 113, destinoId: 6, aerolinea: 'Cóndor Air', origen: 'Santiago (SCL)', llegada: 'Buenos Aires, Ezeiza (EZE)', fechaIda: '2027-01-28', fechaVuelta: '2027-02-02', escalas: 0, precio: 189990, asientosDisponibles: 0 },
  { id: 114, destinoId: 6, aerolinea: 'AeroAndes', origen: 'Santiago (SCL)', llegada: 'Buenos Aires, Ezeiza (EZE)', fechaIda: '2027-01-28', fechaVuelta: '2027-02-02', escalas: 0, precio: 239990, asientosDisponibles: 6 },
  // Cancún
  { id: 115, destinoId: 7, aerolinea: 'Caribe Jet', origen: 'Santiago (SCL)', llegada: 'Cancún (CUN)', fechaIda: '2027-02-20', fechaVuelta: '2027-02-28', escalas: 1, precio: 789990, asientosDisponibles: 6 },
  { id: 116, destinoId: 7, aerolinea: 'AeroAndes', origen: 'Santiago (SCL)', llegada: 'Cancún (CUN)', fechaIda: '2027-02-20', fechaVuelta: '2027-02-28', escalas: 0, precio: 949990, asientosDisponibles: 2 },
]

// Hoteles asociados a un destino por destinoId. precioPorNoche: CLP por habitación.
// Cada estadía calza con las fechas de al menos un vuelo del destino.
// habitacionesDisponibles 0 = sin disponibilidad
export const hoteles = [
  // San Pedro de Atacama
  { id: 201, destinoId: 1, nombre: 'Hotel Desierto Rojo', estrellas: 4, zona: 'Centro', fechaEntrada: '2026-12-10', fechaSalida: '2026-12-15', precioPorNoche: 98000, habitacionesDisponibles: 3 },
  { id: 202, destinoId: 1, nombre: 'Hostal Licancabur', estrellas: 2, zona: 'Ayllu de Solor', fechaEntrada: '2026-12-10', fechaSalida: '2026-12-15', precioPorNoche: 42000, habitacionesDisponibles: 0 },
  { id: 203, destinoId: 1, nombre: 'Lodge Altiplano', estrellas: 5, zona: 'Camino a Toconao', fechaEntrada: '2027-01-07', fechaSalida: '2027-01-12', precioPorNoche: 185000, habitacionesDisponibles: 2 },
  // Rapa Nui
  { id: 204, destinoId: 2, nombre: 'Hotel Hare Moana', estrellas: 4, zona: 'Hanga Roa', fechaEntrada: '2026-12-18', fechaSalida: '2026-12-25', precioPorNoche: 125000, habitacionesDisponibles: 2 },
  { id: 205, destinoId: 2, nombre: 'Cabañas Anakena', estrellas: 3, zona: 'Hanga Roa', fechaEntrada: '2027-01-15', fechaSalida: '2027-01-22', precioPorNoche: 78000, habitacionesDisponibles: 6 },
  // Puerto Natales
  { id: 206, destinoId: 3, nombre: 'Refugio Última Esperanza', estrellas: 3, zona: 'Costanera', fechaEntrada: '2027-01-20', fechaSalida: '2027-01-27', precioPorNoche: 89000, habitacionesDisponibles: 4 },
  { id: 207, destinoId: 3, nombre: 'Hotel Torres del Viento', estrellas: 5, zona: 'Costanera', fechaEntrada: '2027-02-03', fechaSalida: '2027-02-10', precioPorNoche: 210000, habitacionesDisponibles: 0 },
  { id: 208, destinoId: 3, nombre: 'Hostal Patagonia Austral', estrellas: 2, zona: 'Centro', fechaEntrada: '2027-02-03', fechaSalida: '2027-02-10', precioPorNoche: 38000, habitacionesDisponibles: 5 },
  // Valparaíso
  { id: 209, destinoId: 4, nombre: 'Casa Cerro Alegre', estrellas: 4, zona: 'Cerro Alegre', fechaEntrada: '2026-12-28', fechaSalida: '2027-01-02', precioPorNoche: 115000, habitacionesDisponibles: 1 },
  { id: 210, destinoId: 4, nombre: 'Hostal El Ascensor', estrellas: 2, zona: 'Cerro Concepción', fechaEntrada: '2026-12-28', fechaSalida: '2027-01-02', precioPorNoche: 45000, habitacionesDisponibles: 6 },
  // Cusco
  { id: 211, destinoId: 5, nombre: 'Hotel Piedra Inca', estrellas: 4, zona: 'Centro Histórico', fechaEntrada: '2027-02-12', fechaSalida: '2027-02-19', precioPorNoche: 92000, habitacionesDisponibles: 5 },
  { id: 212, destinoId: 5, nombre: 'Casona San Blas', estrellas: 3, zona: 'San Blas', fechaEntrada: '2027-03-05', fechaSalida: '2027-03-12', precioPorNoche: 64000, habitacionesDisponibles: 0 },
  { id: 213, destinoId: 5, nombre: 'Posada Valle Sagrado', estrellas: 5, zona: 'Urubamba', fechaEntrada: '2027-03-05', fechaSalida: '2027-03-12', precioPorNoche: 198000, habitacionesDisponibles: 2 },
  // Buenos Aires
  { id: 214, destinoId: 6, nombre: 'Hotel Jardines de Palermo', estrellas: 4, zona: 'Palermo', fechaEntrada: '2026-12-03', fechaSalida: '2026-12-07', precioPorNoche: 120000, habitacionesDisponibles: 4 },
  { id: 215, destinoId: 6, nombre: 'Hostal del Tango', estrellas: 3, zona: 'San Telmo', fechaEntrada: '2027-01-28', fechaSalida: '2027-02-02', precioPorNoche: 58000, habitacionesDisponibles: 7 },
  // Cancún
  { id: 216, destinoId: 7, nombre: 'Resort Arena Blanca', estrellas: 5, zona: 'Zona Hotelera', fechaEntrada: '2027-02-20', fechaSalida: '2027-02-28', precioPorNoche: 260000, habitacionesDisponibles: 0 },
  { id: 217, destinoId: 7, nombre: 'Hotel Laguna Nichupté', estrellas: 4, zona: 'Zona Hotelera', fechaEntrada: '2027-02-20', fechaSalida: '2027-02-28', precioPorNoche: 165000, habitacionesDisponibles: 3 },
  { id: 218, destinoId: 7, nombre: 'Hostal Centro Cancún', estrellas: 2, zona: 'Centro', fechaEntrada: '2027-02-20', fechaSalida: '2027-02-28', precioPorNoche: 49000, habitacionesDisponibles: 8 },
]
