import { describe, it, expect } from 'vitest'
import { splitTopLevelSelectors, rescopeSelector } from '../../vite/rescopeSelectors'

describe('splitTopLevelSelectors', () => {
  it('separa seletores simples por vírgula', () => {
    expect(splitTopLevelSelectors('.pl-8, .pl-9')).toEqual(['.pl-8', '.pl-9'])
  })

  it('não separa vírgula dentro de :is()/:where()', () => {
    expect(splitTopLevelSelectors(':is(input, select, textarea).pl-8')).toEqual([
      ':is(input, select, textarea).pl-8',
    ])
  })

  it('não separa vírgula dentro de atributo entre colchetes', () => {
    expect(splitTopLevelSelectors('input[type="text"], input[type="date"]')).toEqual([
      'input[type="text"]',
      'input[type="date"]',
    ])
  })

  it('lida com parênteses e colchetes combinados', () => {
    expect(
      splitTopLevelSelectors(':where(:not([type="checkbox"], [type="radio"])), .foo'),
    ).toEqual([':where(:not([type="checkbox"], [type="radio"]))', '.foo'])
  })
})

describe('rescopeSelector', () => {
  it('prefixa seletor de classe simples com o id da raiz', () => {
    expect(rescopeSelector('.pl-8', '#meu-plugin-app')).toBe('#meu-plugin-app .pl-8')
  })

  it('prefixa cada seletor de uma lista independentemente', () => {
    expect(rescopeSelector('.py-2, .px-3', '#meu-plugin-app')).toBe(
      '#meu-plugin-app .py-2, #meu-plugin-app .px-3',
    )
  })

  it('não duplica o prefixo quando o seletor já começa pelo id', () => {
    expect(rescopeSelector('#meu-plugin-app h1', '#meu-plugin-app')).toBe('#meu-plugin-app h1')
  })

  it('não re-escopa :root nem :host (variáveis de tema continuam globais)', () => {
    expect(rescopeSelector(':root,:host', '#meu-plugin-app')).toBe(':root, :host')
  })

  it('respeita vírgula dentro de :is()/:where() ao re-escopar seletor composto', () => {
    expect(rescopeSelector(':is(input, select, textarea).pl-8', '#meu-plugin-app')).toBe(
      '#meu-plugin-app :is(input, select, textarea).pl-8',
    )
  })

  it('eleva a especificidade o suficiente para vencer input[type="text"] do wp-admin', () => {
    // (0,1,1): 1 atributo + 1 tipo — regra real do forms.css do WordPress.
    const hostSelectorSpecificity = { id: 0, classOrAttr: 1, type: 1 }
    // (1,1,0) depois do re-escopo: 1 id + 1 classe.
    const scoped = rescopeSelector('.pl-8', '#meu-plugin-app')
    expect(scoped).toBe('#meu-plugin-app .pl-8')
    const scopedSpecificity = { id: 1, classOrAttr: 1, type: 0 }
    // Comparação coluna a coluna (regra de especificidade CSS): id decide.
    expect(scopedSpecificity.id).toBeGreaterThan(hostSelectorSpecificity.id)
  })

  it('id diferente produz âncora diferente — mesma peça, dois bundles', () => {
    expect(rescopeSelector('.pl-8', '#painel')).toBe('#painel .pl-8')
    expect(rescopeSelector('.pl-8', '#site-publico')).toBe('#site-publico .pl-8')
  })
})
