/**
 * Núcleo testável da responsabilidade 2: re-escopa o CSS DESTE PACOTE
 * (`@v3rtech/v3r-front`) para a mesma raiz em que o consumidor ancorou o
 * próprio CSS — mesma técnica de `rescopeSelectors.ts` (usada para ancorar o
 * Tailwind do consumidor e vencer o CSS de autor do wp-admin), aplicada na
 * direção inversa: aqui o adversário não é o host, é o PRÓPRIO reset de
 * elemento do consumidor.
 *
 * Defeito medido ao vivo (V3RLGPD, item ativo da navegação sem traço): este
 * pacote publica CSS simples, sem `@layer` e sem escopo — `.v3r-nav__item`
 * tem especificidade (0,1,0). O preflight do Tailwind do consumidor, uma vez
 * ancorado no id da raiz para vencer o wp-admin, zera `border` com
 * `${scopeId} *` — (1,0,0), que já vence qualquer seletor de classe única
 * sozinho. Este pacote nunca teria chance, com ou sem `!important` do lado
 * do consumidor.
 *
 * A resposta não é listar propriedade por propriedade (isso descola do
 * pacote na primeira versão nova dele) nem soltar `!important` aqui (dívida
 * que valeria para toda a família). É dar ao CSS do pacote a MESMA
 * especificidade de raiz que o consumidor dá ao próprio CSS: uma vez
 * ancorado no mesmo id, `${scopeId} .v3r-nav__item` (1,1,0) volta a vencer
 * `${scopeId} *`/`${scopeId} button` (1,0,0)/(1,0,1) pela regra normal da
 * cascata — mais específico ganha —, sem precisar saber qual propriedade o
 * pacote desenha. Continua perdendo, como deve, para qualquer override do
 * consumidor mais específico.
 */

import postcss from 'postcss'
import type { Rule } from 'postcss'
import { rescopeSelector } from './rescopeSelectors'

export function rescopeVendorCss(css: string, scopeId: string): string {
  const root = postcss.parse(css)
  root.walkRules((rule: Rule) => {
    rule.selector = rescopeSelector(rule.selector, scopeId)
  })
  return root.toString()
}
