import { useLayoutEffect, useRef } from 'react'

/**
 * Área dos avisos do wp-admin dentro da casca do plugin (contrato §8).
 *
 * O `wp-admin/js/common.js` realoca todo `div.notice`/`div.updated`/`div.error`
 * para logo depois do marcador `.wp-header-end` e, na ausência dele, para
 * depois do primeiro `h1`/`h2` de `.wrap` — que nas telas da família é o
 * título dentro do cabeçalho React. Resultado sem este componente: aviso
 * espremido entre o título e a versão, inclusive aviso de outros plugins.
 *
 * União das três implementações que já existiam, cada uma cobrindo uma parte
 * do problema:
 * - RIT360 Flow e V3REvent plantam o marcador `wp-header-end` (o encaixe
 *   oficial que o WordPress procura) e reagem a avisos inseridos depois via
 *   `MutationObserver`, mas usam um seletor amplo (`.is-dismissible`,
 *   `.notice-warning`, etc.) que pode capturar elemento "dispensável" de
 *   terceiros que não é aviso do wp-admin.
 * - RIT360 Premiado (`noticeRelocation.ts`) usa o seletor **exato** do
 *   próprio `common.js` (`div.updated, div.error, div.notice`) e documenta
 *   por que a corrida entre o script nativo e a montagem do React não é uma
 *   corrida de verdade: `common.js` roda dentro de um handler de
 *   `DOMContentLoaded`, e um `<script type="module">` (como o bundle de
 *   admin desses plugins) é adiado e sempre executa — e portanto sempre
 *   monta o React — antes desse evento disparar. A adoção síncrona no mount
 *   cobre por isso o caso comum; o `MutationObserver` continua necessário
 *   para avisos injetados depois, de forma assíncrona, por outro plugin.
 *
 * Este componente usa o seletor exato do Premiado (mais preciso) com o
 * marcador de encaixe do Flow/V3REvent (dupla defesa, sem depender de qual
 * mecanismo vence a corrida), e roda a adoção em `useLayoutEffect` para
 * executar o mais cedo possível dentro do próprio ciclo do React.
 */

const NOTICE_SELECTOR = 'div.updated, div.error, div.notice'

/** Mesmo critério de exclusão do `common.js` do WordPress. */
function isRelocatable(el: Element): boolean {
  return !el.classList.contains('inline') && !el.classList.contains('below-h2')
}

/** Move para dentro de `container` os avisos de `scope` que ainda não estão
 * lá. Idempotente: chamar de novo com os mesmos avisos já movidos não muda
 * nada — por isso é seguro rodar a cada mutação observada. */
function adopt(container: Element, scope: ParentNode): void {
  const found = scope.querySelectorAll<HTMLElement>(NOTICE_SELECTOR)
  found.forEach((el) => {
    if (!isRelocatable(el) || container.contains(el)) return
    container.appendChild(el)
  })
}

export interface AdminNoticesProps {
  className?: string
}

export function AdminNotices({ className }: AdminNoticesProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scope = document.body
    adopt(host, scope)

    const observer = new MutationObserver(() => adopt(host, scope))
    observer.observe(scope, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return (
    <div className={['v3r-admin-notices', className].filter(Boolean).join(' ')} ref={hostRef}>
      {/* Encaixe oficial que o wp-admin procura para posicionar avisos. */}
      <hr className="v3r-admin-notices__marker wp-header-end" aria-hidden="true" />
    </div>
  )
}
