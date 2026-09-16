/**
 * Árvores de DOM que pertencem ao WORDPRESS dentro da raiz de um consumidor
 * (`V3RCore-Code#51`), e a cirurgia de seletor que as devolve para ele.
 *
 * O problema: `unwrapAndRescopeCss` ancora a camada `base` do Tailwind (o
 * *preflight*) no id da raiz do consumidor, para vencer o CSS sem-camada do
 * wp-admin — é exatamente o que essa camada existe para fazer. O efeito
 * colateral: o mesmo reset passa a vencer também o CSS do PRÓPRIO WordPress
 * para componentes que o WordPress desenha DENTRO dessa raiz — o editor de
 * texto (`wp.editor`/TinyMCE), medido ao vivo no V3REvent
 * (`V3REvent-Code#185`, corrigido localmente na v1.89.0 antes de esta peça
 * subir para a família): as abas "Visual"/"Código" ficavam sem fundo nem
 * borda, o botão "Adicionar mídia" virava texto solto com ícone quebrado, e
 * os botões da barra saíam espremidos e sem separador. O campo funcionava —
 * era só aparência —, mas parecia defeito para quem usa.
 *
 * Regras que venciam, medidas no navegador:
 * `${scopeId} *` → `border: 0 solid; margin: 0; padding: 0` derrota
 * `.wp-switch-editor` e `.mce-toolbar .mce-btn button`; `${scopeId} button` →
 * `background-color: transparent; font-family: inherit` derrota o fundo e a
 * fonte dos mesmos controles.
 *
 * A correção NÃO é reestilizar controle a controle (seria copiar o CSS do
 * WordPress para dentro do nosso, e envelheceria junto com ele): é EXCLUIR
 * essas árvores do reset, para que o CSS do WordPress volte a ser o único a
 * decidir ali.
 *
 * Como a exclusão não pode mexer na especificidade — mudar a especificidade
 * das regras da `base` derrubaria a conta que `rescopeSelector` já faz para
 * vencer o wp-admin —, ela usa `:not(:where(…))`: `:where()` tem
 * especificidade ZERO, e `:not()` herda a do argumento mais específico. O
 * seletor continua com a MESMA especificidade de antes da guarda.
 */

import { splitTopLevelSelectors } from './rescopeSelectors'

/**
 * Opção de `cascadeFix`/`unwrapCssLayersPlugin` (`V3RCore-Code#51`).
 * `wpOwnedTrees`, quando informada, SUBSTITUI `WP_OWNED_TREES` inteira — para
 * acrescentar sem perder o padrão, espalhe-o: `{ wpOwnedTrees: [...WP_OWNED_TREES, '.minha-arvore'] }`.
 */
export interface CascadeFixOptions {
  wpOwnedTrees?: readonly string[]
}

/**
 * Raízes das árvores que o WordPress desenha dentro da raiz de um consumidor
 * (e estiliza com CSS próprio). `.media-modal` costuma ser anexado ao
 * `<body>`, fora da raiz do consumidor — entra na lista assim mesmo, porque
 * o custo é zero (especificidade inalterada) e o dia em que o WordPress
 * mudar de lugar já estará coberto.
 *
 * Padrão razoável para a família; cada consumidor pode acrescentar árvores
 * próprias (outro widget do WordPress dentro da mesma raiz) sem perder estas.
 */
export const WP_OWNED_TREES = [
  '.wp-editor-wrap',
  '.mce-container',
  '.wp-media-buttons',
  '.media-modal',
] as const

/** Pseudo-elementos que o CSS minificado ainda escreve com UM dois-pontos. */
const LEGACY_PSEUDO_ELEMENTS = ['after', 'before', 'first-line', 'first-letter']

/** `.a, .a *, .b, .b *` — a árvore e tudo o que está dentro dela. */
export function wpOwnedTreesSelectorList(trees: readonly string[] = WP_OWNED_TREES): string {
  return trees.flatMap((tree) => [tree, `${tree} *`]).join(', ')
}

/** `:not(:where(…))` — a guarda de especificidade ZERO. */
export function wpOwnedTreesGuard(trees: readonly string[] = WP_OWNED_TREES): string {
  return `:not(:where(${wpOwnedTreesSelectorList(trees)}))`
}

/**
 * Posição do primeiro pseudo-ELEMENTO de nível superior, ou `-1`. A guarda
 * precisa entrar ANTES dele: pseudo-elemento só é válido no fim do composto
 * (`*:not(…)::after`, nunca `*::after:not(…)`).
 */
export function pseudoElementIndex(part: string): number {
  let depth = 0
  for (let i = 0; i < part.length; i += 1) {
    const ch = part[i]
    if (ch === '(' || ch === '[') depth += 1
    else if (ch === ')' || ch === ']') depth -= 1
    else if (ch === ':' && depth === 0) {
      if (part[i + 1] === ':') return i
      const name = /^[a-z-]+/.exec(part.slice(i + 1))?.[0] ?? ''
      if (LEGACY_PSEUDO_ELEMENTS.includes(name)) return i
      i += name.length
    }
  }
  return -1
}

/**
 * Aplica a guarda a uma lista de seletores. `:root`/`:host` passam intactos
 * — na camada `base` eles só carregam variáveis/reset de custom properties
 * (a mesma exceção que `rescopeSelector` já faz), e não é conteúdo que o
 * WordPress desenhe dentro de uma árvore própria.
 */
export function optOutSelector(selector: string, guard: string = wpOwnedTreesGuard()): string {
  return splitTopLevelSelectors(selector)
    .map((part) => {
      if (part.startsWith(':root') || part.startsWith(':host')) return part
      const at = pseudoElementIndex(part)
      return at < 0 ? part + guard : part.slice(0, at) + guard + part.slice(at)
    })
    .join(', ')
}
