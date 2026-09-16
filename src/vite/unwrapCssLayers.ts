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
 *
 * `V3RCore-Code#51`: a camada `base` (o *preflight*) recebe, além do
 * re-escopo, a guarda `:not(:where(…))` contra as árvores que o WordPress
 * desenha DENTRO da raiz do consumidor (editor de texto, TinyMCE, botões de
 * mídia). A cirurgia acontece AQUI, dentro do `walkRules` da própria camada
 * `base`, porque é o único ponto do pipeline em que a informação "esta regra
 * é da base" ainda existe — `layer.replaceWith(layer.nodes)`, na mesma
 * passada, desembrulha o `@layer` e apaga essa informação para sempre. Só a
 * `base`: `components`/`utilities` são classes NOSSAS (Tailwind/autor do
 * consumidor), não existe `.rounded-md` dentro do editor do WordPress, e
 * restringi-las só engordaria a folha sem proteger nada.
 */

import postcss from 'postcss'
import type { AtRule, ChildNode, Rule } from 'postcss'
import { rescopeSelector } from './rescopeSelectors'
import { optOutSelector, wpOwnedTreesGuard, WP_OWNED_TREES } from './wpOwnedTrees'

const RESCOPE_LAYERS = new Set(['base', 'components', 'utilities'])

function isKeyframesRule(rule: Rule): boolean {
  const parent = rule.parent as ChildNode | undefined
  return parent?.type === 'atrule' && /keyframes$/.test((parent as AtRule).name ?? '')
}

export function unwrapAndRescopeCss(
  css: string,
  scopeId: string,
  wpOwnedTrees: readonly string[] = WP_OWNED_TREES,
): string {
  const root = postcss.parse(css)
  const guard = wpOwnedTreesGuard(wpOwnedTrees)

  root.walkAtRules('layer', (layer: AtRule) => {
    // Declaração muda de ordem sem corpo (`@layer a, b, c;`) — some junto com
    // as camadas, já que não sobra nenhum `@layer` para ordenar.
    if (!layer.nodes || layer.nodes.length === 0) {
      layer.remove()
      return
    }
    const isBase = layer.params.trim() === 'base'
    if (RESCOPE_LAYERS.has(layer.params.trim())) {
      layer.walkRules((rule: Rule) => {
        // `@keyframes` dentro da camada tem "seletor" de percentual (`0%`),
        // que não é seletor nenhum — a guarda não se aplica a ele.
        if (isBase && !isKeyframesRule(rule)) {
          rule.selector = optOutSelector(rule.selector, guard)
        }
        rule.selector = rescopeSelector(rule.selector, scopeId)
      })
    }
    layer.replaceWith(layer.nodes)
  })

  return root.toString()
}
