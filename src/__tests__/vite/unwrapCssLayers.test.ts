import { describe, it, expect } from 'vitest'
import { unwrapAndRescopeCss } from '../../vite/unwrapCssLayers'

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
