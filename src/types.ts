/**
 * A árvore de navegação, exatamente como a v3r-core a entrega
 * (`V3R\Core\Admin\Nav\Navigation::tree()`, contrato §6). `FamilyNav` desenha
 * o que recebe, sem reimplementar regras que o PHP já garante (grupo vazio
 * não vem na árvore, grupo com uma tela só continua sendo grupo, sem grupos
 * declarados a árvore vem plana).
 */

export interface ScreenNode {
  type: 'screen'
  slug: string
  label: string
}

export interface GroupNode {
  type: 'group'
  key: string
  label: string
  screens: ScreenNode[]
}

export type NavNode = ScreenNode | GroupNode
export type NavTree = NavNode[]
