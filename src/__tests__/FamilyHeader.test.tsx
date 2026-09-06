import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FamilyHeader } from '../components/FamilyHeader'

describe('FamilyHeader (contrato §2)', () => {
  it('exibe título e versão', () => {
    render(<FamilyHeader title="Faturas" version="2.4.1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Faturas' })).toBeInTheDocument()
    expect(screen.getByText('v2.4.1')).toBeInTheDocument()
  })

  it('sem logo, não desenha o divisor (controle negativo)', () => {
    const { container } = render(<FamilyHeader title="Faturas" />)
    expect(container.querySelector('.v3r-header__divider')).toBeNull()
  })

  it('com logo, desenha logo e divisor', () => {
    const { container } = render(<FamilyHeader title="Faturas" logo={<span>L</span>} />)
    expect(container.querySelector('.v3r-header__logo')).not.toBeNull()
    expect(container.querySelector('.v3r-header__divider')).not.toBeNull()
  })
})
