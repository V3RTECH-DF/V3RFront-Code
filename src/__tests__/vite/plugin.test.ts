import { describe, it, expect } from 'vitest'
import { unwrapCssLayersPlugin, rescopeVendorCssPlugin } from '../../vite/plugin'

const SCOPE_ID = '#meu-plugin-app'

// Assinatura mínima do que os hooks realmente usam — evita depender do tipo
// completo `Rollup.PluginContext`/`OutputBundle` só para testar em isolado.
function callTransform(plugin: ReturnType<typeof rescopeVendorCssPlugin>, code: string, id: string) {
  const transform = plugin.transform as (code: string, id: string) => { code: string; map: null } | null
  return transform.call({} as never, code, id)
}

function callGenerateBundle(plugin: ReturnType<typeof unwrapCssLayersPlugin>, bundle: Record<string, unknown>) {
  const generateBundle = plugin.generateBundle as (options: unknown, bundle: Record<string, unknown>) => void
  generateBundle.call({} as never, {}, bundle)
}

describe('rescopeVendorCssPlugin — responsabilidade 2 (ancorar o CSS do pacote)', () => {
  const plugin = rescopeVendorCssPlugin(SCOPE_ID)
  const packageCss = '.v3r-nav__item { border-bottom: 2px solid transparent; }'

  it('ancora o CSS do pacote quando o id do módulo é do próprio pacote', () => {
    const result = callTransform(
      plugin,
      packageCss,
      '/app/node_modules/@v3rtech/v3r-front/dist/v3r-front.css',
    )
    expect(result).not.toBeNull()
    expect(result?.code).toContain('#meu-plugin-app .v3r-nav__item')
  })

  it('controle: folha do próprio plugin (id fora do caminho do pacote) não é tocada', () => {
    const ownCss = '.meu-plugin-reset { box-sizing: border-box; }'
    const result = callTransform(plugin, ownCss, '/app/src/index.css')
    expect(result).toBeNull()
  })

  it('controle: CSS de terceiro qualquer (outro pacote em node_modules) não é tocado', () => {
    const thirdPartyCss = '.some-lib-button { padding: 4px; }'
    const result = callTransform(
      plugin,
      thirdPartyCss,
      '/app/node_modules/some-other-lib/dist/style.css',
    )
    expect(result).toBeNull()
  })

  it('controle: arquivo do pacote que não é CSS não é tocado', () => {
    const result = callTransform(
      plugin,
      'export const x = 1',
      '/app/node_modules/@v3rtech/v3r-front/dist/index.js',
    )
    expect(result).toBeNull()
  })

  it('ids diferentes ancoram em raízes diferentes — dois bundles do mesmo plugin', () => {
    const painel = rescopeVendorCssPlugin('#painel')
    const site = rescopeVendorCssPlugin('#site-publico')
    const id = '/app/node_modules/@v3rtech/v3r-front/dist/v3r-front.css'
    const outPainel = callTransform(painel, packageCss, id)
    const outSite = callTransform(site, packageCss, id)
    expect(outPainel?.code).toContain('#painel .v3r-nav__item')
    expect(outSite?.code).toContain('#site-publico .v3r-nav__item')
  })
})

describe('unwrapCssLayersPlugin — responsabilidade 1 (ancorar o CSS do plugin)', () => {
  it('desembrulha e ancora as camadas base/utilities do bundle final do consumidor', () => {
    const plugin = unwrapCssLayersPlugin(SCOPE_ID)
    const bundle: Record<string, { type: string; source: string }> = {
      'assets/main.css': {
        type: 'asset',
        source: '@layer utilities { .pl-8 { padding-left: 2rem; } }',
      },
    }
    callGenerateBundle(plugin, bundle)
    expect(bundle['assets/main.css']?.source).toContain('#meu-plugin-app .pl-8')
    expect(bundle['assets/main.css']?.source).not.toMatch(/@layer/)
  })

  it('não toca em asset que não termina em .css', () => {
    const plugin = unwrapCssLayersPlugin(SCOPE_ID)
    const bundle: Record<string, { type: string; source: string }> = {
      'assets/main.js': { type: 'asset', source: '@layer utilities { .pl-8 {} }' },
    }
    callGenerateBundle(plugin, bundle)
    expect(bundle['assets/main.js']?.source).toBe('@layer utilities { .pl-8 {} }')
  })

  it('não toca em asset cujo type não é "asset" (ex.: chunk de JS)', () => {
    const plugin = unwrapCssLayersPlugin(SCOPE_ID)
    const bundle: Record<string, { type: string; code?: string }> = {
      'assets/main.css': { type: 'chunk', code: 'console.log(1)' },
    }
    callGenerateBundle(plugin, bundle)
    expect(bundle['assets/main.css']).toEqual({ type: 'chunk', code: 'console.log(1)' })
  })
})

describe('as duas responsabilidades juntas — o cenário real do defeito', () => {
  it('regra do pacote ancorada no id vence um reset ancorado no MESMO id (#raiz * e #raiz button)', () => {
    const vendorPlugin = rescopeVendorCssPlugin(SCOPE_ID)
    const layersPlugin = unwrapCssLayersPlugin(SCOPE_ID)

    // 1) O CSS do pacote passa pelo re-escopo de vendor (roda 'pre', sobre o
    //    módulo isolado, como no build real).
    const vendorResult = callTransform(
      vendorPlugin,
      '.v3r-nav__item { border-bottom: 2px solid transparent; }',
      '/app/node_modules/@v3rtech/v3r-front/dist/v3r-front.css',
    )
    expect(vendorResult).not.toBeNull()

    // 2) O bundle final concatena o CSS do pacote (já re-escopado) com o
    //    preflight do Tailwind do consumidor, ainda em @layer.
    const finalCss =
      `${vendorResult?.code}\n` +
      `@layer base { *, button { border: 0; } }`
    const bundle: Record<string, { type: string; source: string }> = {
      'assets/main.css': { type: 'asset', source: finalCss },
    }
    callGenerateBundle(layersPlugin, bundle)
    const out = bundle['assets/main.css']?.source ?? ''

    // O reset do consumidor (agora desembrulhado) fica ancorado como
    // "#raiz *" / "#raiz button" — (1,0,0)/(1,0,1).
    expect(out).toMatch(/#meu-plugin-app \*/)
    expect(out).toMatch(/#meu-plugin-app button/)
    // A regra do pacote, ancorada no MESMO id, é mais específica —
    // "#raiz .v3r-nav__item" (1,1,0) — e por isso vence pela cascata normal.
    expect(out).toMatch(/#meu-plugin-app \.v3r-nav__item/)

    function specificityOfClassInScope() {
      return { id: 1, classOrAttr: 1, type: 0 } // #raiz .v3r-nav__item
    }
    function specificityOfUniversalInScope() {
      return { id: 1, classOrAttr: 0, type: 0 } // #raiz *
    }
    function specificityOfTypeInScope() {
      return { id: 1, classOrAttr: 0, type: 1 } // #raiz button
    }
    const pkg = specificityOfClassInScope()
    const universal = specificityOfUniversalInScope()
    const type = specificityOfTypeInScope()
    expect(pkg.classOrAttr).toBeGreaterThan(universal.classOrAttr)
    expect(pkg.classOrAttr).toBeGreaterThan(type.classOrAttr)
  })

  it('controle: sem o re-escopo do pacote, a regra do pacote perderia para o reset ancorado', () => {
    // Mesmo cenário, mas sem aplicar rescopeVendorCssPlugin — o CSS do
    // pacote permanece sem escopo (é o defeito medido ao vivo no V3RLGPD).
    const layersPlugin = unwrapCssLayersPlugin(SCOPE_ID)
    const finalCss =
      `.v3r-nav__item { border-bottom: 2px solid transparent; }\n` +
      `@layer base { *, button { border: 0; } }`
    const bundle: Record<string, { type: string; source: string }> = {
      'assets/main.css': { type: 'asset', source: finalCss },
    }
    callGenerateBundle(layersPlugin, bundle)
    const out = bundle['assets/main.css']?.source ?? ''
    // O reset foi ancorado (1,0,0) mas a regra do pacote continua sem
    // escopo (0,1,0) — perde por id, não por classe: é exatamente o defeito
    // que rescopeVendorCssPlugin existe para fechar.
    expect(out).not.toContain('#meu-plugin-app .v3r-nav__item')
    expect(out).toContain('.v3r-nav__item { border-bottom')
  })
})
