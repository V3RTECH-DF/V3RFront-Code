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
 * Prefixa cada seletor de uma lista com `${scopeId} ` (combinador
 * descendente), somando (1,0,0) de especificidade — suficiente para vencer
 * qualquer seletor de atributo/classe único que o wp-admin declare (ex.:
 * `input[type="text"]`, especificidade (0,1,1), perde para
 * `${scopeId} .pl-8`, (1,1,0)).
 *
 * Não re-escopa seletores que já começam pelo próprio id (evita duplicar) nem
 * `:root`/`:host` (nunca casariam como descendentes de um id — são só usados
 * pelas variáveis de tema, que devem continuar globais).
 */
export function rescopeSelector(selector: string, scopeId: string): string {
  return splitTopLevelSelectors(selector)
    .map((part) => {
      if (part.startsWith(scopeId) || part.startsWith(':root') || part.startsWith(':host')) {
        return part
      }
      return `${scopeId} ${part}`
    })
    .join(', ')
}
