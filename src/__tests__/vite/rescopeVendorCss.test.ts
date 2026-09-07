import { describe, it, expect } from 'vitest'
import { rescopeVendorCss } from '../../vite/rescopeVendorCss'

const SAMPLE_PACKAGE_CSS = `
@font-face {
  font-family: "Exo 2";
  src: url(data:font/woff2;base64,AAA) format("woff2-variations");
}
.v3r-header { height: 64px; }
.v3r-nav__item { border-bottom: 2px solid transparent; }
.v3r-nav__item--active { border-bottom-color: var(--v3r-accent, #5b6b7a); }
@media (max-width: 600px) {
  .v3r-header { height: 48px; }
}
`

describe('rescopeVendorCss', () => {
  it('ancora as classes do pacote no id informado, elevando a especificidade', () => {
    const out = rescopeVendorCss(SAMPLE_PACKAGE_CSS, '#meu-plugin-app')
    expect(out).toMatch(/#meu-plugin-app \.v3r-nav__item\b/)
    expect(out).toMatch(/#meu-plugin-app \.v3r-nav__item--active/)
  })

  it('funciona com outro id — o mesmo pacote em dois bundles do mesmo plugin', () => {
    const outPainel = rescopeVendorCss(SAMPLE_PACKAGE_CSS, '#painel')
    const outSite = rescopeVendorCss(SAMPLE_PACKAGE_CSS, '#site-publico')
    expect(outPainel).toMatch(/#painel \.v3r-nav__item\b/)
    expect(outPainel).not.toMatch(/#site-publico/)
    expect(outSite).toMatch(/#site-publico \.v3r-nav__item\b/)
    expect(outSite).not.toMatch(/#painel/)
  })

  it('ancora também dentro de @media (regra geral, não lista de propriedades)', () => {
    const out = rescopeVendorCss(SAMPLE_PACKAGE_CSS, '#meu-plugin-app')
    const media = out.slice(out.indexOf('@media'))
    expect(media).toMatch(/#meu-plugin-app \.v3r-header/)
  })

  it('não toca em @font-face (at-rule sem seletor)', () => {
    const out = rescopeVendorCss(SAMPLE_PACKAGE_CSS, '#meu-plugin-app')
    expect(out).toMatch(/@font-face\s*\{\s*font-family: "Exo 2";/)
  })

  it('eleva a especificidade do pacote acima do reset universal ancorado (`#raiz *`)', () => {
    // #meu-plugin-app * → (1,0,0). Depois do re-escopo, a classe do pacote
    // vira #meu-plugin-app .v3r-nav__item → (1,1,0), que vence.
    const out = rescopeVendorCss(SAMPLE_PACKAGE_CSS, '#meu-plugin-app')
    expect(out).toContain('#meu-plugin-app .v3r-nav__item')
    // (1,0,0) < (1,1,0): id igual, classe do pacote (1) > classe do reset (0).
  })
})
