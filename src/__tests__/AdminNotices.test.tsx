import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AdminNotices } from '../components/AdminNotices'

function appendNotice(className: string, text: string): HTMLElement {
  const el = document.createElement('div')
  el.className = className
  el.textContent = text
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AdminNotices (contrato §8)', () => {
  it('adota aviso que já estava na página antes da montagem', () => {
    const pre = appendNotice('notice notice-error', 'Erro pré-existente')

    const { container } = render(<AdminNotices />)
    const host = container.querySelector('.v3r-admin-notices')

    expect(host).not.toBeNull()
    expect(host?.contains(pre)).toBe(true)
  })

  it('adota aviso inserido depois da montagem', async () => {
    const { container } = render(<AdminNotices />)
    const host = container.querySelector('.v3r-admin-notices') as HTMLElement

    const late = appendNotice('notice notice-success', 'Aviso tardio')

    await waitFor(() => {
      expect(host.contains(late)).toBe(true)
    })
  })

  it('NÃO move aviso marcado como .inline (controle negativo)', async () => {
    const { container } = render(<AdminNotices />)
    const host = container.querySelector('.v3r-admin-notices') as HTMLElement

    const inline = appendNotice('notice inline', 'Aviso inline de formulário')

    // Dá tempo ao MutationObserver rodar, para não confirmar um falso
    // negativo por o teste ter checado cedo demais.
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(host.contains(inline)).toBe(false)
    expect(document.body.contains(inline)).toBe(true)
  })

  it('planta o marcador wp-header-end dentro da área de avisos', () => {
    const { container } = render(<AdminNotices />)
    expect(container.querySelector('.wp-header-end')).not.toBeNull()
  })
})
