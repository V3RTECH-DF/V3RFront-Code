import { describe, expect, it } from 'vitest'
import { canOpen } from '../access'
import type { AccessMap } from '../access'

describe('canOpen (contrato de guarda de rota)', () => {
  it('slug presente e permitido → permite', () => {
    const map: AccessMap = { financeiro: true }
    expect(canOpen(map, 'financeiro')).toBe(true)
  })

  it('slug presente e negado → nega', () => {
    const map: AccessMap = { financeiro: false }
    expect(canOpen(map, 'financeiro')).toBe(false)
  })

  it('slug ausente do mapa → nega (desconhecido é negado)', () => {
    const map: AccessMap = { financeiro: true }
    expect(canOpen(map, 'nao-declarado')).toBe(false)
  })

  it('mapa undefined → nega, sem lançar', () => {
    expect(() => canOpen(undefined, 'qualquer')).not.toThrow()
    expect(canOpen(undefined, 'qualquer')).toBe(false)
  })

  it('mapa null → nega, sem lançar', () => {
    expect(() => canOpen(null, 'qualquer')).not.toThrow()
    expect(canOpen(null, 'qualquer')).toBe(false)
  })

  it('mapa de tipo inesperado (array, string, número) → nega, sem lançar', () => {
    expect(canOpen([] as unknown as AccessMap, 'qualquer')).toBe(false)
    expect(canOpen('financeiro' as unknown as AccessMap, 'qualquer')).toBe(false)
    expect(canOpen(42 as unknown as AccessMap, 'qualquer')).toBe(false)
  })

  it('tela oculta permitida (fora da árvore de navegação) → permite', () => {
    // Este é o caso que distingue guarda que lê o mapa de guarda que lê a
    // árvore: o mapa pode conter uma tela que jamais apareceria em NavTree
    // (ex.: uma tela de configuração acessível só por link direto), e ela
    // precisa ser permitida do mesmo jeito, porque canOpen nunca consulta
    // a árvore de navegação.
    const map: AccessMap = { 'config-avancada-oculta': true }
    expect(canOpen(map, 'config-avancada-oculta')).toBe(true)
  })

  it('é pura: mesma entrada produz sempre a mesma saída, sem mutar o mapa', () => {
    const map: AccessMap = { a: true, b: false }
    const snapshot = { ...map }

    expect(canOpen(map, 'a')).toBe(true)
    expect(canOpen(map, 'b')).toBe(false)
    expect(canOpen(map, 'a')).toBe(true)

    expect(map).toEqual(snapshot)
  })
})
