/**
 * Correção da cascata do wp-admin, empacotada como ferramenta de build —
 * `@v3rtech/v3r-front/vite`, subcaminho separado da entrada dos componentes
 * (`@v3rtech/v3r-front`) para o artefato React não ganhar peso com Vite/
 * PostCSS (ver `docs/contrato-do-pacote.md`, seção "Ferramenta de build",
 * para o racional completo).
 *
 * Uma chamada resolve as duas responsabilidades:
 *
 * ```ts
 * import { cascadeFix } from '@v3rtech/v3r-front/vite'
 *
 * export default defineConfig({
 *   plugins: [react(), tailwindcss(), ...cascadeFix('#meu-plugin-app')],
 * })
 * ```
 *
 * `scopeId` é o id da raiz da aplicação do plugin — o mesmo elemento em que
 * `--v3r-accent` é declarada (contrato §4). Cada plugin passa o próprio; o
 * mesmo plugin de build, chamado com ids diferentes, serve dois bundles do
 * mesmo plugin (ex.: painel e área pública) sem eles se confundirem.
 *
 * A ordem dos dois plugins na lista retornada importa e é interna: o
 * re-escopo do CSS deste pacote roda `enforce: 'pre'`, sobre o módulo de CSS
 * ainda isolado; o desembrulho de `@layer` do consumidor roda depois, em
 * `generateBundle`, sobre o CSS final já concatenado.
 */

import type { Plugin } from 'vite'
import { rescopeVendorCssPlugin, unwrapCssLayersPlugin } from './plugin'

export function cascadeFix(scopeId: string): Plugin[] {
  return [rescopeVendorCssPlugin(scopeId), unwrapCssLayersPlugin(scopeId)]
}

// Peças individuais, para quem precisar compor de outro jeito (ex.: um
// bundle que não deve re-escopar o CSS do pacote, por não importá-lo).
export { unwrapCssLayersPlugin, rescopeVendorCssPlugin }
export { unwrapAndRescopeCss } from './unwrapCssLayers'
export { rescopeVendorCss } from './rescopeVendorCss'
export { rescopeSelector, splitTopLevelSelectors } from './rescopeSelectors'
