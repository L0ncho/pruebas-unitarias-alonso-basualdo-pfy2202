// Único lugar de la aplicación que lee la hora actual (en milisegundos). Lo usan las cachés REST
// y GraphQL para saber cuándo llegó un dato y si sigue vigente. Las pruebas lo controlan con
// temporizadores falsos que solo simulan Date (src/test/temporizadores.js) y jest.setSystemTime
export function ahora() {
  return Date.now()
}
