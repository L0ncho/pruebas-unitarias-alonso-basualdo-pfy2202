// Único lugar de la aplicación que lee la hora actual (en milisegundos). Lo usan las cachés REST
// y GraphQL para saber cuándo llegó un dato y si sigue vigente. Las pruebas lo controlan con
// vi.useFakeTimers({ toFake: ['Date'] }) y vi.setSystemTime
export function ahora() {
  return Date.now()
}
