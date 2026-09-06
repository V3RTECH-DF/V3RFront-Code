import type { ReactNode } from 'react'

export interface FamilyHeaderProps {
  /**
   * Título da tela corrente. Quem governa o valor é o roteador do plugin
   * (contrato §10) — este componente só exibe.
   */
  title: string
  /** Versão do plugin, sem o prefixo "v" (o componente antepõe). */
  version?: string
  /** Marca do produto (ícone/imagem), exibida antes do divisor vertical. */
  logo?: ReactNode
  /** Ações do lado direito do cabeçalho (link de manual, feedback, etc). */
  actions?: ReactNode
  className?: string
}

/**
 * Cabeçalho de 64px da família (contrato §2): logo + divisor + título/versão
 * à esquerda, ações à direita. A cor de destaque não aparece aqui — o
 * cabeçalho não tem estado ativo a colorir.
 */
export function FamilyHeader({ title, version, logo, actions, className }: FamilyHeaderProps) {
  const classes = ['v3r-header', className].filter(Boolean).join(' ')

  return (
    <header className={classes}>
      <div className="v3r-header__brand">
        {logo ? (
          <>
            <span className="v3r-header__logo">{logo}</span>
            <span className="v3r-header__divider" aria-hidden="true" />
          </>
        ) : null}
        <div className="v3r-header__titles">
          <h1 className="v3r-header__title">{title}</h1>
          {version ? <span className="v3r-header__version">v{version}</span> : null}
        </div>
      </div>
      {actions ? <div className="v3r-header__actions">{actions}</div> : null}
    </header>
  )
}
