import { describe, it, expect } from 'vitest'
import { unwrapAndRescopeCss } from '../../vite/unwrapCssLayers'
import { WP_OWNED_TREES, wpOwnedTreesGuard } from '../../vite/wpOwnedTrees'

/**
 * Teste de regressão do bug estrutural: no bundle publicado, as utilitárias
 * do Tailwind saem em `@layer utilities`, sem camada nenhuma no CSS do
 * wp-admin — e "origem sem camada vence origem em camada antes de a
 * especificidade ser comparada", então qualquer regra de autor do wp-admin
 * venceria `.pl-8`/`.py-2` do plugin. Este teste falharia se a correção fosse
 * removida (bundle voltasse a ter `@layer`, ou as utilitárias deixassem de
 * ser ancoradas no id).
 */
const SAMPLE_BUNDLE_CSS = `
@layer theme, base, components, utilities;
@layer theme {
  :root, :host {
    --color-brand-primary: #0f4855;
  }
}
@layer base {
  h1, h2, h3 {
    margin: 0;
  }
}
@layer utilities {
  .pl-8 {
    padding-left: 2rem;
  }
  .py-2 {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
  :is(input, select, textarea).focus\\:border-brand-primary:focus {
    border-color: #0f4855;
  }
}
@layer properties {
  *, ::before, ::after, ::backdrop {
    --tw-translate-x: 0;
  }
}
`

const SCOPE_ID = '#meu-plugin-app'

describe('unwrapAndRescopeCss', () => {
  it('não sobra nenhum @layer no CSS final', () => {
    const out = unwrapAndRescopeCss(SAMPLE_BUNDLE_CSS, SCOPE_ID)
    expect(out).not.toMatch(/@layer/)
  })

  it('ancora as utilitárias no id informado, elevando a especificidade', () => {
    const out = unwrapAndRescopeCss(SAMPLE_BUNDLE_CSS, SCOPE_ID)
    expect(out).toMatch(/#meu-plugin-app \.pl-8/)
    expect(out).toMatch(/#meu-plugin-app \.py-2/)
  })

  it('ancora as regras de base (ex.: headings) também', () => {
    const out = unwrapAndRescopeCss(SAMPLE_BUNDLE_CSS, SCOPE_ID)
    expect(out).toMatch(/#meu-plugin-app h1/)
  })

  it('re-escopa corretamente seletor com vírgula dentro de :is()', () => {
    const out = unwrapAndRescopeCss(SAMPLE_BUNDLE_CSS, SCOPE_ID)
    expect(out).toMatch(/#meu-plugin-app :is\(input, select, textarea\)\.focus\\:border-brand-primary:focus/)
  })

  it('não re-escopa :root/:host (variáveis de tema continuam globais)', () => {
    const out = unwrapAndRescopeCss(SAMPLE_BUNDLE_CSS, SCOPE_ID)
    expect(out).toMatch(/:root,\s*:host/)
    expect(out).not.toMatch(/#meu-plugin-app :root/)
    expect(out).not.toMatch(/#meu-plugin-app :host/)
  })

  it('não re-escopa a camada properties (custom properties globais, sem valor visual próprio)', () => {
    const out = unwrapAndRescopeCss(SAMPLE_BUNDLE_CSS, SCOPE_ID)
    expect(out).toMatch(/\*, ::before, ::after, ::backdrop/)
    expect(out).not.toMatch(/#meu-plugin-app \*/)
  })

  it('remove declaração de ordem sem corpo (@layer a, b, c;)', () => {
    const out = unwrapAndRescopeCss(SAMPLE_BUNDLE_CSS, SCOPE_ID)
    expect(out).not.toMatch(/@layer theme, base, components, utilities;/)
  })

  it('id diferente ancora em raiz diferente — mesma peça, dois bundles do mesmo plugin', () => {
    const outPainel = unwrapAndRescopeCss(SAMPLE_BUNDLE_CSS, '#painel')
    const outSite = unwrapAndRescopeCss(SAMPLE_BUNDLE_CSS, '#site-publico')
    expect(outPainel).toMatch(/#painel \.pl-8/)
    expect(outPainel).not.toMatch(/#site-publico/)
    expect(outSite).toMatch(/#site-publico \.pl-8/)
    expect(outSite).not.toMatch(/#painel/)
  })

  it('controle: CSS sem @layer nenhum (folha escrita à mão pelo plugin) sai idêntico', () => {
    const handWritten = `.meu-plugin-reset * { box-sizing: border-box; }\nbutton { border: 0; }\n`
    const out = unwrapAndRescopeCss(handWritten, SCOPE_ID)
    // postcss reformata levemente (sem mudar seletor/regra) — a garantia é
    // que nenhum seletor foi reescrito nem ancorado.
    expect(out).not.toMatch(/#meu-plugin-app/)
    expect(out).toMatch(/\.meu-plugin-reset \*/)
    expect(out).toMatch(/^button \{/m)
  })
})

/**
 * `V3RCore-Code#51` — a guarda contra as árvores do WordPress (editor,
 * TinyMCE, botões de mídia, modal) é aplicada SÓ na camada `base`, e ANTES
 * do desembrulho (a informação de camada não sobrevive a ele).
 */
describe('unwrapAndRescopeCss — guarda contra as árvores do WordPress (#51)', () => {
  const CSS_COM_EDITOR = `
@layer base {
  *, ::before, ::after {
    margin: 0;
    padding: 0;
    border: 0 solid;
  }
  button {
    background-color: transparent;
    font-family: inherit;
  }
}
@layer utilities {
  .rounded-md {
    border-radius: 0.375rem;
  }
}
`

  it('toda regra reescrita da base leva a guarda', () => {
    const out = unwrapAndRescopeCss(CSS_COM_EDITOR, SCOPE_ID)
    const guard = wpOwnedTreesGuard()
    expect(out).toContain(`#meu-plugin-app *${guard}`)
    expect(out).toContain(`#meu-plugin-app button${guard}`)
    // Pseudo-elemento continua no fim do composto, depois da guarda.
    expect(out).toContain(`${guard}::before`)
    expect(out).toContain(`${guard}::after`)
  })

  it('controle negativo: nenhuma regra de utilities leva a guarda', () => {
    const out = unwrapAndRescopeCss(CSS_COM_EDITOR, SCOPE_ID)
    expect(out).toMatch(/#meu-plugin-app \.rounded-md \{/)
    expect(out).not.toMatch(/\.rounded-md:not\(/)
  })

  it('a guarda exclui de fato as árvores do WordPress, para cada uma da lista padrão', () => {
    const guard = wpOwnedTreesGuard()
    for (const tree of WP_OWNED_TREES) {
      expect(guard).toContain(tree)
    }
  })

  it('percentuais de @keyframes dentro da base não viram seletor (não recebem a guarda)', () => {
    const cssComKeyframes = '@layer base { @keyframes spin { 0% { opacity: 0; } 100% { opacity: 1; } } }'
    const out = unwrapAndRescopeCss(cssComKeyframes, SCOPE_ID)
    expect(out).not.toContain('0%:not(')
    expect(out).not.toContain('100%:not(')
  })

  it('opção wpOwnedTrees substitui a lista padrão', () => {
    const cssComArvoreCustom = '@layer base { * { margin: 0; } }'
    const out = unwrapAndRescopeCss(cssComArvoreCustom, SCOPE_ID, ['.minha-arvore'])
    expect(out).toContain('#meu-plugin-app *:not(:where(.minha-arvore, .minha-arvore *))')
  })

  it('a especificidade da regra reescrita não muda com a guarda (:where() soma zero)', () => {
    // "*" ancorado (1,0,0) continua (1,0,0) mesmo com a guarda — :where()
    // nunca soma especificidade, então o seletor perde para qualquer
    // classe/atributo único do wp-admin exatamente como perderia sem a
    // guarda: a comparação é feita fora daqui (rescopeSelectors.test.ts),
    // aqui só se garante que a guarda em si não introduz pontuação.
    const guard = wpOwnedTreesGuard()
    // Especificidade de :not(:where(...)) é 0 — :where() sempre é zero, e
    // :not() herda a do argumento MAIS específico, que aqui é zero também.
    expect(guard).toMatch(/^:not\(:where\(/)
    expect(guard).not.toMatch(/:not\([^:]/) // :not() não recebe argumento fora de :where()
  })
})
