import { describe, it, expect } from 'vitest'
import { WP_OWNED_TREES, wpOwnedTreesGuard, optOutSelector, pseudoElementIndex } from '../../vite/wpOwnedTrees'
import { splitTopLevelSelectors } from '../../vite/rescopeSelectors'

/**
 * `V3RCore-Code#51` — o reset da camada `base`, ancorado na raiz do
 * consumidor para vencer o CSS sem-camada do wp-admin, passa a vencer também
 * o CSS do PRÓPRIO WordPress para componentes que ele desenha DENTRO dessa
 * raiz (o editor de texto). A correção exclui essas árvores do reset.
 *
 * Casos portados de `V3REvent-Code` (`tests/js/wp-owned-trees.test.js`, que
 * resolveu o mesmo problema localmente antes desta peça subir para a
 * família): especificidade zero dentro de `:where()`, pseudo-elemento no fim
 * do composto, vírgula dentro de `:is()`/`:where()` não separa seletor, e o
 * controle negativo de que a guarda NÃO se aplica fora da camada `base`
 * (coberto em `unwrapCssLayers.test.ts`, que é quem decide a camada).
 */
describe('wpOwnedTreesGuard', () => {
  it('tem especificidade zero (mora dentro de :where)', () => {
    const guard = wpOwnedTreesGuard()
    expect(guard).toMatch(/^:not\(:where\(/)
    for (const tree of WP_OWNED_TREES) {
      expect(guard.includes(`${tree},`) || guard.includes(`${tree}))`)).toBe(true)
      expect(guard).toContain(`${tree} *`)
    }
  })

  it('lista padrão é a do V3REvent — editor, tinymce, botões de mídia e modal', () => {
    expect(WP_OWNED_TREES).toEqual(['.wp-editor-wrap', '.mce-container', '.wp-media-buttons', '.media-modal'])
  })

  it('aceita lista de árvores customizada', () => {
    const guard = wpOwnedTreesGuard(['.minha-arvore'])
    expect(guard).toBe(':not(:where(.minha-arvore, .minha-arvore *))')
  })
})

describe('optOutSelector', () => {
  const g = ':not(:where(.x))'

  it('seletor simples recebe a guarda no fim', () => {
    expect(optOutSelector('button', g)).toBe('button:not(:where(.x))')
    expect(optOutSelector('*', g)).toBe('*:not(:where(.x))')
  })

  it('pseudo-elemento continua no FIM do composto (senão o seletor é inválido)', () => {
    expect(optOutSelector('*::after', g)).toBe('*:not(:where(.x))::after')
    expect(optOutSelector('::backdrop', g)).toBe(':not(:where(.x))::backdrop')
    // Minificado, o WordPress/Vite escreve `:after` com UM dois-pontos.
    expect(optOutSelector(':after', g)).toBe(':not(:where(.x)):after')
    expect(optOutSelector('input::placeholder', g)).toBe('input:not(:where(.x))::placeholder')
    // Pseudo-CLASSE não é pseudo-elemento: a guarda vai depois dela.
    expect(optOutSelector('a:hover', g)).toBe('a:hover:not(:where(.x))')
  })

  it('vírgula dentro de :is()/:where() não é separador de seletor', () => {
    expect(optOutSelector('input:where([type=button],[type=submit])', g)).toBe(
      'input:where([type=button],[type=submit]):not(:where(.x))',
    )
    expect(splitTopLevelSelectors('a, b:is(c, d), e')).toEqual(['a', 'b:is(c, d)', 'e'])
  })

  it(':root e :host passam intactos', () => {
    expect(optOutSelector(':root, :host, html', g)).toBe(`:root, :host, html${g}`)
  })

  it('composto com combinador (#raiz *, #raiz button) recebe a guarda depois do último simples', () => {
    expect(optOutSelector('#raiz *', g)).toBe('#raiz *:not(:where(.x))')
    expect(optOutSelector('#raiz button', g)).toBe('#raiz button:not(:where(.x))')
    expect(optOutSelector('#raiz ::placeholder', g)).toBe('#raiz :not(:where(.x))::placeholder')
  })
})

describe('pseudoElementIndex', () => {
  it('não encontra pseudo-elemento em seletor sem ele', () => {
    expect(pseudoElementIndex('button')).toBe(-1)
    expect(pseudoElementIndex('a:hover')).toBe(-1)
  })

  it('encontra pseudo-elemento moderno (::) e legado (:before/:after)', () => {
    expect(pseudoElementIndex('a::before')).toBe(1)
    expect(pseudoElementIndex(':before')).toBe(0)
  })
})
