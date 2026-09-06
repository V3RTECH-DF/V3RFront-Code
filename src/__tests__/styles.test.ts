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
  it('o estado ativo da navegação lê --v3r-accent, com fallback neutro em hex', () => {
    const activeBlockMatch = css.match(/\.v3r-nav__item--active\s*{([^}]*)}/)
    expect(activeBlockMatch).not.toBeNull()
    const block = activeBlockMatch![1]

    // Precisa ler a variável (não uma cor fixa) e trazer um fallback, para o
    // componente continuar legível quando o plugin não a declarar.
    expect(block).toMatch(/var\(--v3r-accent,\s*#[0-9a-fA-F]{3,8}\)/)
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
