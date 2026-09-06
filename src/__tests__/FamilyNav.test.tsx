import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FamilyNav } from '../components/FamilyNav'
import type { NavTree } from '../types'

const flatTree: NavTree = [
  { type: 'screen', slug: 'dashboard', label: 'Painel' },
  { type: 'screen', slug: 'settings', label: 'Configurações' },
]

const groupedTree: NavTree = [
  {
    type: 'group',
    key: 'financeiro',
    label: 'Financeiro',
    screens: [
      { type: 'screen', slug: 'faturas', label: 'Faturas' },
      { type: 'screen', slug: 'recibos', label: 'Recibos' },
    ],
  },
  {
    type: 'group',
    key: 'cadastros',
    label: 'Cadastros',
    screens: [
      { type: 'screen', slug: 'unidades', label: 'Unidades' },
      { type: 'screen', slug: 'moradores', label: 'Moradores' },
    ],
  },
  { type: 'screen', slug: 'ajuda', label: 'Ajuda' },
]

describe('FamilyNav — árvore só de telas (contrato §6)', () => {
  it('desenha uma barra só, sem barra de grupos', () => {
    const { container } = render(
      <FamilyNav tree={flatTree} activeSlug="dashboard" onNavigate={vi.fn()} />,
    )

    expect(container.querySelector('.v3r-nav-flat')).not.toBeNull()
    expect(container.querySelector('.v3r-nav-groups')).toBeNull()
    expect(container.querySelector('.v3r-nav-tabs')).toBeNull()
    expect(screen.getByText('Painel')).toBeInTheDocument()
    expect(screen.getByText('Configurações')).toBeInTheDocument()
  })
})

describe('FamilyNav — árvore com grupos (contrato §7)', () => {
  it('desenha duas barras, e a de baixo mostra as telas do grupo ativo', () => {
    const { container } = render(
      <FamilyNav tree={groupedTree} activeSlug="faturas" onNavigate={vi.fn()} />,
    )

    // Controle negativo do teste acima: com grupos, a barra de grupos existe.
    expect(container.querySelector('.v3r-nav-groups')).not.toBeNull()

    const tabs = container.querySelector('.v3r-nav-tabs')
    expect(tabs).not.toBeNull()
    expect(tabs).toHaveTextContent('Faturas')
    expect(tabs).toHaveTextContent('Recibos')
    // Só as telas do grupo ATIVO — não as do outro grupo.
    expect(tabs).not.toHaveTextContent('Unidades')
    expect(tabs).not.toHaveTextContent('Moradores')
  })

  it('sem grupo ativo (tela solta de primeiro nível), não desenha barra de abas', () => {
    const { container } = render(
      <FamilyNav tree={groupedTree} activeSlug="ajuda" onNavigate={vi.fn()} />,
    )

    expect(container.querySelector('.v3r-nav-groups')).not.toBeNull()
    expect(container.querySelector('.v3r-nav-tabs')).toBeNull()
  })

  it('clicar num grupo navega para a primeira tela dele', () => {
    const onNavigate = vi.fn()
    const { container } = render(
      <FamilyNav tree={groupedTree} activeSlug="ajuda" onNavigate={onNavigate} />,
    )

    const groupButton = container
      .querySelector('.v3r-nav-groups')
      ?.querySelector('button:nth-child(2)') as HTMLElement
    expect(groupButton).toHaveTextContent('Cadastros')
    groupButton.click()

    expect(onNavigate).toHaveBeenCalledWith('unidades')
  })

  it('clicar numa tela do grupo ativo navega para o slug exato dela', () => {
    const onNavigate = vi.fn()
    render(<FamilyNav tree={groupedTree} activeSlug="faturas" onNavigate={onNavigate} />)

    screen.getByText('Recibos').click()

    expect(onNavigate).toHaveBeenCalledWith('recibos')
  })
})

describe('FamilyNav — quebra de linha (contrato §7)', () => {
  it('nunca deixa item de fora do DOM, qualquer que seja a largura disponível', () => {
    const manyScreens: NavTree = Array.from({ length: 20 }, (_, i) => ({
      type: 'screen' as const,
      slug: `tela-${i}`,
      label: `Tela ${i}`,
    }))

    render(<FamilyNav tree={manyScreens} activeSlug="tela-0" onNavigate={vi.fn()} />)

    // Nada de botão "mais": todo item aparece sempre, sem esconder atrás de clique
    // (contrato §7 descarta esse caminho explicitamente).
    for (const screenNode of manyScreens) {
      expect(screen.getByText(screenNode.label)).toBeInTheDocument()
    }
    expect(screen.queryByText(/mais/i)).not.toBeInTheDocument()
  })
})
