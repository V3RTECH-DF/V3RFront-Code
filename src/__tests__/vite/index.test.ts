import { describe, it, expect } from 'vitest'
import { cascadeFix } from '../../vite/index'

describe('cascadeFix — as duas responsabilidades numa peça só', () => {
  it('devolve os dois plugins, na ordem que o build real precisa', () => {
    const plugins = cascadeFix('#meu-plugin-app')
    expect(plugins).toHaveLength(2)
    // rescopeVendorCssPlugin roda 'pre' (sobre o módulo isolado do pacote)
    // antes de unwrapCssLayersPlugin rodar em generateBundle (bundle final).
    expect(plugins[0]?.name).toBe('v3r-front-rescope-vendor-css')
    expect(plugins[1]?.name).toBe('v3r-front-unwrap-css-layers')
  })

  it('cada chamada usa o id passado — chamadas com ids diferentes não compartilham estado', () => {
    const painel = cascadeFix('#painel')
    const site = cascadeFix('#site-publico')
    expect(painel[0]?.name).toBe(site[0]?.name)
    expect(painel).not.toBe(site)
  })
})
