import type { GroupNode, NavTree, ScreenNode } from '../types'

export interface FamilyNavProps {
  /** A árvore de navegação, exatamente como a v3r-core a entrega (contrato §6). */
  tree: NavTree
  /** Slug da tela corrente — decide qual item, grupo e aba ficam marcados como ativos. */
  activeSlug: string
  /** Chamado com o slug de destino quando o usuário clica num item. */
  onNavigate: (slug: string) => void
  className?: string
}

function isGroup(node: NavTree[number]): node is GroupNode {
  return node.type === 'group'
}

function findActiveGroup(tree: NavTree, activeSlug: string): GroupNode | undefined {
  return tree.find(
    (node): node is GroupNode => isGroup(node) && node.screens.some((screen) => screen.slug === activeSlug),
  )
}

function itemClass(isActive: boolean): string {
  return ['v3r-nav__item', isActive ? 'v3r-nav__item--active' : ''].filter(Boolean).join(' ')
}

function NavButton({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className={itemClass(isActive)} onClick={onClick} aria-current={isActive ? 'page' : undefined}>
      {label}
    </button>
  )
}

/**
 * Navegação da família (contrato §6-7).
 *
 * Árvore só com nós de tela (nenhum `GroupNode`): uma barra só
 * (`.v3r-nav-flat`), sem barra de grupos — caso de primeira classe, não um
 * caso especial.
 *
 * Árvore com grupos: duas barras. A de cima (`.v3r-nav-groups`) lista os nós
 * de primeiro nível — grupo ou tela solta, a árvore pode misturar os dois.
 * Clicar num grupo navega para a primeira tela dele (mesma escolha do
 * `Layout.tsx` do GE Associados). A de baixo (`.v3r-nav-tabs`) só aparece
 * quando a tela ativa pertence a um grupo, e lista as telas desse grupo.
 *
 * As duas barras quebram em várias linhas via `flex-wrap` no CSS do pacote —
 * nada fica escondido atrás de um botão "mais" (contrato §7).
 */
export function FamilyNav({ tree, activeSlug, onNavigate, className }: FamilyNavProps) {
  const hasGroups = tree.some(isGroup)

  if (!hasGroups) {
    const screens = tree as ScreenNode[]
    return (
      <nav className={['v3r-nav-flat', className].filter(Boolean).join(' ')} aria-label="Navegação">
        {screens.map((screen) => (
          <NavButton
            key={screen.slug}
            label={screen.label}
            isActive={screen.slug === activeSlug}
            onClick={() => onNavigate(screen.slug)}
          />
        ))}
      </nav>
    )
  }

  const activeGroup = findActiveGroup(tree, activeSlug)

  return (
    <>
      <nav className={['v3r-nav-groups', className].filter(Boolean).join(' ')} aria-label="Navegação principal">
        {tree.map((node) => {
          if (isGroup(node)) {
            const firstScreen = node.screens[0]
            return (
              <NavButton
                key={node.key}
                label={node.label}
                isActive={activeGroup?.key === node.key}
                onClick={() => firstScreen && onNavigate(firstScreen.slug)}
              />
            )
          }
          return (
            <NavButton
              key={node.slug}
              label={node.label}
              isActive={!activeGroup && node.slug === activeSlug}
              onClick={() => onNavigate(node.slug)}
            />
          )
        })}
      </nav>
      {activeGroup ? (
        <nav className="v3r-nav-tabs" aria-label={`Telas de ${activeGroup.label}`}>
          {activeGroup.screens.map((screen) => (
            <NavButton
              key={screen.slug}
              label={screen.label}
              isActive={screen.slug === activeSlug}
              onClick={() => onNavigate(screen.slug)}
            />
          ))}
        </nav>
      ) : null}
    </>
  )
}
