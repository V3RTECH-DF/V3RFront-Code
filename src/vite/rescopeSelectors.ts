/**
 * Lógica pura de re-escopo de seletores CSS. Base das duas responsabilidades
 * do subcaminho `@v3rtech/v3r-front/vite` (ver `docs/contrato-do-pacote.md`,
 * seção "Ferramenta de build"):
 *
 * 1. Ancorar o CSS do PRÓPRIO plugin consumidor (`base`/`utilities` do
 *    Tailwind, depois de desembrulhados de `@layer`) no id da raiz da
 *    aplicação — para vencer o CSS sem camada do wp-admin.
 * 2. Ancorar o CSS DESTE pacote (`@v3rtech/v3r-front/styles.css`) na MESMA
 *    raiz — consequência da primeira: uma vez ancorado, o reset do plugin
 *    passa a vencer também o CSS do pacote compartilhado, que não usa
 *    camada nem escopo.
 *
 * Extraída sem reescrita das duas implementações reais (GE Associados e
 * V3RLGPD, que já a tinham idêntica) — só o `scopeId` deixou de ter valor
 * default, porque aqui não existe um id fixo: cada plugin passa o seu.
 */

/**
 * Divide uma lista de seletores separada por vírgula respeitando parênteses
 * (`:is(...)`, `:where(...)`) e colchetes (`[type="text"]`) — não conta uma
 * vírgula "," dentro deles como separador de seletor.
 */
export function splitTopLevelSelectors(selector: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of selector) {
    if (char === '(' || char === '[') depth++
    if (char === ')' || char === ']') depth--
    if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

/**
 * Marcador de autoria (contrato §13, V3RCore-Code#49): prefixo que o pacote
 * usa em `styles.css` para condicionar uma regra a "a raiz está dentro do
 * wp-admin" — SEM contribuir especificidade (`:where()` sempre soma 0).
 *
 * Ele precisa sobreviver ao re-escopo de um jeito que o prefixo comum não
 * dá: `${scopeId}` tem de ficar como descendente de `body.wp-admin`, nunca
 * como ancestral dele (a raiz do consumidor mora DENTRO do `body`, nunca ao
 * redor). O re-escopo padrão (prepend na frente) inverteria essa relação —
 * por isso `rescopeSelector` trata este marcador à parte, inserindo o id
 * logo depois dele em vez de na frente de tudo.
 */
export const WP_ADMIN_ANCESTOR = ':where(body.wp-admin)'

/**
 * Prefixa cada seletor de uma lista com `${scopeId} ` (combinador
 * descendente), somando (1,0,0) de especificidade — suficiente para vencer
 * qualquer seletor de atributo/classe único que o wp-admin declare (ex.:
 * `input[type="text"]`, especificidade (0,1,1), perde para
 * `${scopeId} .pl-8`, (1,1,0)).
 *
 * Não re-escopa seletores que já começam pelo próprio id (evita duplicar) nem
 * `:root`/`:host` (nunca casariam como descendentes de um id — são só usados
 * pelas variáveis de tema, que devem continuar globais).
 *
 * Seletor que começa por `WP_ADMIN_ANCESTOR` é o único caso em que o id NÃO
 * vai para a frente: vai logo depois do marcador, porque `body` é ancestral
 * da raiz do consumidor, nunca descendente dela.
 */
export function rescopeSelector(selector: string, scopeId: string): string {
  return splitTopLevelSelectors(selector)
    .map((part) => {
      if (part.startsWith(scopeId) || part.startsWith(':root') || part.startsWith(':host')) {
        return part
      }
      if (part.startsWith(WP_ADMIN_ANCESTOR)) {
        const rest = part.slice(WP_ADMIN_ANCESTOR.length).trim()
        return `${WP_ADMIN_ANCESTOR} ${scopeId} ${rest}`
      }
      return `${scopeId} ${part}`
    })
    .join(', ')
}
