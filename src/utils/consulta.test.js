import { NetworkStatus } from '@apollo/client'
import { VIGENCIA_CACHE_MS } from '../config/api.js'
import { derivarEstadoConsulta, derivarEstadoOpcionesViaje, politicaCacheApollo } from './consulta.js'
import { TIPOS_ERROR } from './errores.js'

const DATOS = [{ id: 1 }]
const ERROR = { tipo: TIPOS_ERROR.servidor, estado: 500, mensaje: 'Falla' }

function estado(cambios = {}) {
  return derivarEstadoConsulta({
    hayRuta: true,
    enCache: undefined,
    vigente: false,
    terminada: false,
    forzada: false,
    ultimo: { datos: undefined, error: null },
    ...cambios,
  })
}

describe('derivarEstadoConsulta (REST)', () => {
  it('sin ruta no hay datos, carga ni error', () => {
    expect(estado({ hayRuta: false, enCache: DATOS })).toEqual({ datos: undefined, cargando: false, error: null })
  })

  it('dato vigente: se muestra sin indicador de carga', () => {
    expect(estado({ enCache: DATOS, vigente: true })).toEqual({ datos: DATOS, cargando: false, error: null })
  })

  it('dato vencido: se muestra al instante con cargando true (no se reemplaza por la carga)', () => {
    expect(estado({ enCache: DATOS, vigente: false })).toEqual({ datos: DATOS, cargando: true, error: null })
  })

  it('dato vencido actualizado: se muestran los datos nuevos sin carga', () => {
    const nuevos = [{ id: 2 }]
    expect(
      estado({ enCache: nuevos, vigente: false, terminada: true, ultimo: { datos: nuevos, error: null } }),
    ).toEqual({ datos: nuevos, cargando: false, error: null })
  })

  it('actualización fallida: el dato vencido sigue visible junto al error, como un reintento fallido', () => {
    const vencida = estado({ enCache: DATOS, vigente: false, terminada: true, ultimo: { datos: undefined, error: ERROR } })
    const reintento = estado({
      enCache: DATOS,
      vigente: true,
      forzada: true,
      terminada: true,
      ultimo: { datos: undefined, error: ERROR },
    })
    expect(vencida).toEqual({ datos: DATOS, cargando: false, error: ERROR })
    expect(vencida).toEqual(reintento)
  })

  it('reintento con dato vigente: cargando true y los datos siguen visibles', () => {
    expect(estado({ enCache: DATOS, vigente: true, forzada: true })).toEqual({
      datos: DATOS,
      cargando: true,
      error: null,
    })
  })

  it('sin caché: carga y mantiene los últimos datos obtenidos mientras tanto', () => {
    expect(estado({ ultimo: { datos: DATOS, error: null } })).toEqual({ datos: DATOS, cargando: true, error: null })
  })
})

describe('derivarEstadoOpcionesViaje (GraphQL)', () => {
  const destino = { id: 3, nombre: 'Puerto Natales', vuelos: [], hoteles: [] }

  it.each([
    ['dato vencido (cache-and-network)', NetworkStatus.loading],
    ['reintento (refetch)', NetworkStatus.refetch],
  ])('%s: mantiene los datos y marca cargando', (_caso, networkStatus) => {
    expect(derivarEstadoOpcionesViaje({ data: { destino }, loading: true, networkStatus })).toEqual({
      datos: destino,
      cargando: true,
      error: null,
    })
  })

  it('error con datos anteriores: entrega ambos', () => {
    const error = Object.assign(new Error('x'), { red: true })
    expect(derivarEstadoOpcionesViaje({ data: { destino }, loading: false, error })).toEqual({
      datos: destino,
      cargando: false,
      error: expect.objectContaining({ tipo: TIPOS_ERROR.red }),
    })
  })

  it('una cancelación no es un error', () => {
    const error = new DOMException('Abortado', 'AbortError')
    expect(derivarEstadoOpcionesViaje({ data: undefined, loading: false, error }).error).toBeNull()
  })

  it('sin destino, datos undefined', () => {
    expect(derivarEstadoOpcionesViaje({ data: { destino: null }, loading: false }).datos).toBeUndefined()
  })
})

describe('politicaCacheApollo', () => {
  const RECIBIDO = 5_000_000

  it('sin dato recibido: cache-first', () => {
    expect(politicaCacheApollo(undefined, RECIBIDO)).toEqual({ fetchPolicy: 'cache-first' })
  })

  it('dato vigente: cache-first', () => {
    expect(politicaCacheApollo(RECIBIDO, RECIBIDO + VIGENCIA_CACHE_MS - 1)).toEqual({ fetchPolicy: 'cache-first' })
  })

  it('dato vencido: cache-and-network y después cache-first', () => {
    expect(politicaCacheApollo(RECIBIDO, RECIBIDO + VIGENCIA_CACHE_MS)).toEqual({
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
    })
  })
})
