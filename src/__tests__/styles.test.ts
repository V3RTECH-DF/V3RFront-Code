import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(import.meta.dirname, '../styles.css'), 'utf8')
// O cabeçalho do arquivo explica em prosa por que `@layer` e Tailwind são
// evitados (contrato §5) — e por isso menciona as duas palavras. Os testes
// de ausência precisam olhar só para o CSS de verdade, não para o comentário.
const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')

describe('estilo do pacote (contrato §5)', () => {
  it('não usa @layer', () => {
    expect(cssWithoutComments).not.toMatch(/@layer/)
  })

  it('não depende do Tailwind', () => {
    expect(cssWithoutComments).not.toMatch(/@tailwind/i)
    expect(cssWithoutComments).not.toMatch(/@apply/i)
    expect(cssWithoutComments).not.toMatch(/@import\s+['"]tailwindcss/i)
  })

  it('controle: o arquivo tem conteúdo real (não passa por estar vazio)', () => {
    expect(css).toMatch(/\.v3r-header\s*{/)
    expect(css).toMatch(/\.v3r-nav__item/)
  })
})

describe('cor de destaque (contrato §4)', () => {
  const activeBlockMatch = css.match(/\.v3r-nav__item--active\s*{([^}]*)}/)
  const activeBlock = activeBlockMatch?.[1] ?? ''
  const inactiveBlockMatch = css.match(/\.v3r-nav__item\s*{([^}]*)}/)
  const inactiveBlock = inactiveBlockMatch?.[1] ?? ''

  it('o traço de base do item ativo lê --v3r-accent, com fallback neutro em hex', () => {
    expect(activeBlockMatch).not.toBeNull()

    // Precisa ler a variável (não uma cor fixa) e trazer um fallback, para o
    // componente continuar legível quando o plugin não a declarar.
    const borderMatch = activeBlock.match(/border-bottom-color:\s*([^;]+);/)
    expect(borderMatch).not.toBeNull()
    expect(borderMatch![1]).toMatch(/var\(--v3r-accent,\s*#[0-9a-fA-F]{3,8}\)/)
  })

  it('o texto do item ativo NÃO usa --v3r-accent (controle: mesma cor não pode pintar texto)', () => {
    expect(activeBlockMatch).not.toBeNull()
    const colorMatch = activeBlock.match(/(?:^|\s)color:\s*([^;]+);/)
    expect(colorMatch).not.toBeNull()
    expect(colorMatch![1]).not.toMatch(/--v3r-accent/)
    // e precisa ser uma cor sólida fixa do pacote, não outra variável.
    expect(colorMatch![1]).toMatch(/#[0-9a-fA-F]{3,8}/)
  })

  it('o texto do item ativo é ao menos tão escuro quanto o dos inativos', () => {
    expect(inactiveBlockMatch).not.toBeNull()

    const activeColorMatch = activeBlock.match(/(?:^|\s)color:\s*#([0-9a-fA-F]{6});/)
    const inactiveColorMatch = inactiveBlock.match(/(?:^|\s)color:\s*#([0-9a-fA-F]{6});/)
    expect(activeColorMatch).not.toBeNull()
    expect(inactiveColorMatch).not.toBeNull()

    const luminance = (hex: string) => {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    // "ao menos tão escuro" = luminância <= à dos inativos, nunca mais claro.
    expect(luminance(activeColorMatch![1] ?? '')).toBeLessThanOrEqual(luminance(inactiveColorMatch![1] ?? ''))
  })
})

describe('quebra de linha da navegação (contrato §7)', () => {
  it('as barras de navegação quebram em linha (flex-wrap: wrap)', () => {
    const navBlock = css.match(/\.v3r-nav-groups,\s*\n?\.v3r-nav-tabs,\s*\n?\.v3r-nav-flat\s*{([^}]*)}/)
    expect(navBlock).not.toBeNull()
    expect(navBlock![1]).toMatch(/flex-wrap:\s*wrap/)
  })
})

describe('fonte embarcada (contrato §3)', () => {
  it('declara @font-face para Exo 2 referenciando o arquivo do pacote', () => {
    expect(css).toMatch(/@font-face/)
    expect(css).toMatch(/font-family:\s*'Exo 2'/)
    expect(css).toMatch(/exo2-variable-latin\.woff2/)
  })
})

describe('espaço do logo do cabeçalho (contrato §2/§11)', () => {
  const logoBlockMatch = css.match(/\.v3r-header__logo\s*{([^}]*)}/)
  const logoBlock = logoBlockMatch ? logoBlockMatch[1] : ''

  it('restringe altura (40px), não é uma caixa quadrada', () => {
    expect(logoBlockMatch).not.toBeNull()
    expect(logoBlock).toMatch(/height:\s*40px/)
    // Controle negativo: não pode haver `width` fixo casando a altura —
    // isso reintroduziria a caixa quadrada que é o próprio defeito.
    expect(logoBlock).not.toMatch(/width:\s*40px/)
    expect(logoBlock).not.toMatch(/width:\s*28px/)
  })

  it('tem um teto de largura, para uma marca muito comprida não empurrar o título', () => {
    expect(logoBlock).toMatch(/max-width:\s*\d/)
  })

  it('dimensiona o conteúdo (img/svg) para ocupar a altura mantendo a proporção', () => {
    const contentBlockMatch = css.match(/\.v3r-header__logo img,\s*\n?\.v3r-header__logo svg\s*{([^}]*)}/)
    expect(contentBlockMatch).not.toBeNull()
    const block = contentBlockMatch![1]

    expect(block).toMatch(/height:\s*100%/)
    expect(block).toMatch(/width:\s*auto/)
    // Controle negativo: largura fixa aqui espremeria ou cortaria a marca
    // em vez de manter a proporção natural.
    expect(block).not.toMatch(/width:\s*\d+px/)
  })
})

describe('fonte na tela inteira (contrato §3)', () => {
  it('o chrome do pacote usa Exo 2 sempre, sem depender de classe extra do consumidor', () => {
    const chromeBlockMatch = css.match(
      /\.v3r-header,\s*\n?\.v3r-nav-groups,\s*\n?\.v3r-nav-tabs,\s*\n?\.v3r-nav-flat,\s*\n?\.v3r-admin-notices\s*{([^}]*)}/
    )
    expect(chromeBlockMatch).not.toBeNull()
    expect(chromeBlockMatch![1]).toMatch(/font-family:\s*'Exo 2'/)
  })

  it('existe uma classe que o consumidor põe na raiz para aplicar a fonte à tela inteira', () => {
    const rootBlockMatch = css.match(/\.v3r-typography\s*{([^}]*)}/)
    expect(rootBlockMatch).not.toBeNull()
    expect(rootBlockMatch![1]).toMatch(/font-family:\s*'Exo 2'/)
  })
})

describe('divisor do cabeçalho acompanha o logo (contrato §2)', () => {
  it('tem 40px — a mesma altura do logo', () => {
    const dividerBlockMatch = css.match(/\.v3r-header__divider\s*{([^}]*)}/)
    expect(dividerBlockMatch).not.toBeNull()

    expect(dividerBlockMatch![1]).toMatch(/height:\s*40px\s*;/)
  })
})
