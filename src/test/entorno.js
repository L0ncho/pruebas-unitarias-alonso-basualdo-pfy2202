// Versión de src/config/entorno.js para Jest (la reemplaza moduleNameMapper en jest.config.cjs).
// Los mismos valores que Vite entrega en desarrollo: la base del sitio es la raíz, así las
// rutas de la API ("/api/...", "/graphql") se resuelven contra el location de jsdom
export const BASE_URL = '/'

// Fuera del servidor de desarrollo: MSW no anuncia en la consola cada petición atendida
export const ES_DESARROLLO = false
