/**
 * Núcleo testável da responsabilidade 1: desembrulha os `@layer` que o
 * Tailwind v4 emite no CSS do PLUGIN CONSUMIDOR e ancora
 * `base`/`components`/`utilities` no id da raiz da aplicação dele.
 *
 * Motivo: o Tailwind v4 emite suas utilitárias dentro de `@layer`, e o CSS
 * do wp-admin é *unlayered*. Na cascata, origem sem camada vence origem em
 * camada **antes** de a especificidade ser comparada — então elevar
 * especificidade sozinha não resolve nada enquanto o CSS ficar em camada.
 * Desembrulhar tira essa vantagem estrutural do host; ancorar no id garante
 * que, já sem camada, a regra do plugin ainda vence por especificidade.
 *
 * `theme` (variáveis `:root,:host`) e `properties` (reset de `--tw-*` em
 * `*,:before,:after,::backdrop`) só são desembrulhados, sem re-escopo: são
 * inofensivos fora do id (custom properties não têm valor visual próprio) e
 * re-escopá-los quebraria a herança (`:root` nunca casa como descendente de
 * um id).
 *
 * Extraída sem reescrita de GE Associados/V3RLGPD — só o `scopeId` deixou de
 * ser constante do módulo, virou parâmetro.
 */

import postcss from 'postcss'
import type { AtRule, Rule } from 'postcss'
import { rescopeSelector } from './rescopeSelectors'

const RESCOPE_LAYERS = new Set(['base', 'components', 'utilities'])

export function unwrapAndRescopeCss(css: string, scopeId: string): string {
  const root = postcss.parse(css)

  root.walkAtRules('layer', (layer: AtRule) => {
    // Declaração muda de ordem sem corpo (`@layer a, b, c;`) — some junto com
    // as camadas, já que não sobra nenhum `@layer` para ordenar.
    if (!layer.nodes || layer.nodes.length === 0) {
      layer.remove()
      return
    }
    if (RESCOPE_LAYERS.has(layer.params.trim())) {
      layer.walkRules((rule: Rule) => {
        rule.selector = rescopeSelector(rule.selector, scopeId)
      })
    }
    layer.replaceWith(layer.nodes)
  })

  return root.toString()
}
