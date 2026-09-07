/**
 * Plugins de build do Vite, um para cada responsabilidade (ver
 * `docs/contrato-do-pacote.md`). `cascadeFix` (em `index.ts`) compõe os
 * dois, para o consumidor não ter de lembrar de encaixar os dois na mão.
 */

import type { Plugin } from 'vite'
import { unwrapAndRescopeCss } from './unwrapCssLayers'
import { rescopeVendorCss } from './rescopeVendorCss'

/**
 * Responsabilidade 1 — roda em `generateBundle`, sobre TODO CSS que sair do
 * build do consumidor: desembrulha `@layer` e ancora `base`/`utilities` no
 * `scopeId`. Só no build de produção (`apply: 'build'`) — é o bundle final
 * que o WordPress enfileira.
 *
 * ⚠️ Não toca em nenhuma folha do próprio plugin fora do que o Tailwind
 * gerou dentro de `@layer` — CSS de autor escrito à mão pelo plugin,
 * sem `@layer`, passa por este plugin sem qualquer alteração (não há
 * `@layer` para desembrulhar, e fora de `@layer` nada é reescrito aqui).
 */
export function unwrapCssLayersPlugin(scopeId: string): Plugin {
  return {
    name: 'v3r-front-unwrap-css-layers',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (!fileName.endsWith('.css')) continue
        const asset = bundle[fileName]
        if (!asset || asset.type !== 'asset' || typeof asset.source !== 'string') continue
        asset.source = unwrapAndRescopeCss(asset.source, scopeId)
      }
    },
  }
}

/**
 * Responsabilidade 2 — intercepta SÓ o CSS publicado por ESTE pacote
 * (`@v3rtech/v3r-front/styles.css`, resolvido para
 * `node_modules/@v3rtech/v3r-front/dist/v3r-front.css`) e o re-escopa para
 * `scopeId` — ver `rescopeVendorCss.ts` para o racional completo.
 *
 * ⚠️ Filtra por CAMINHO DO MÓDULO (`/@v3rtech/v3r-front/`), nunca por nome de
 * classe ou propriedade: pega o pacote inteiro, hoje e em qualquer versão
 * futura dele, sem listar seletor por seletor — e sem tocar em nenhuma outra
 * folha do bundle do consumidor (seu `index.css`, CSS de terceiro, etc.).
 *
 * `enforce: 'pre'` garante que o CSS ainda está em texto bruto (como saiu do
 * pacote) quando este plugin roda, antes do pipeline padrão de CSS do Vite
 * processar/concatenar o arquivo.
 */
export function rescopeVendorCssPlugin(scopeId: string): Plugin {
  return {
    name: 'v3r-front-rescope-vendor-css',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/@v3rtech/v3r-front/') || !id.endsWith('.css')) return null
      return { code: rescopeVendorCss(code, scopeId), map: null }
    },
  }
}
