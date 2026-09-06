// Confere, depois do build, que o `dist/` produzido bate com o que o
// `package.json` promete e com os critérios de aceite que não fazem sentido
// como teste de unidade (conteúdo do bundle publicado).
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = resolve(root, 'dist')

function fail(message) {
  console.error(`[verify-dist] FALHOU: ${message}`)
  process.exitCode = 1
}

function ok(message) {
  console.log(`[verify-dist] ok: ${message}`)
}

const requiredFiles = ['index.js', 'index.d.ts', 'v3r-front.css']
for (const file of requiredFiles) {
  const path = resolve(dist, file)
  if (!existsSync(path)) {
    fail(`${file} não existe em dist/`)
  } else {
    ok(`${file} existe`)
  }
}

const jsPath = resolve(dist, 'index.js')
if (existsSync(jsPath)) {
  const js = readFileSync(jsPath, 'utf8')

  // React não pode estar embutido: procura marcadores internos do runtime
  // do React (não a palavra "react", que aparece legitimamente nos imports
  // externos) — símbolos que só existem se o código-fonte do React tiver
  // sido de fato incluído no bundle.
  const reactInternals = ['ReactCurrentDispatcher', 'react.element', 'react.fragment', 'ReactSharedInternals']
  const found = reactInternals.filter((marker) => js.includes(marker))
  if (found.length > 0) {
    fail(`dist/index.js parece conter React embutido (marcadores: ${found.join(', ')})`)
  } else {
    ok('dist/index.js não contém marcadores internos do React')
  }

  const hasExternalImport = /from\s*['"]react['"]/.test(js) || /require\(['"]react['"]\)/.test(js)
  if (!hasExternalImport) {
    fail('dist/index.js não importa "react" como módulo externo — build pode ter embutido o runtime')
  } else {
    ok('dist/index.js importa "react" como módulo externo')
  }
}

const cssPath = resolve(dist, 'v3r-front.css')
if (existsSync(cssPath)) {
  const css = readFileSync(cssPath, 'utf8')

  if (css.includes('@layer')) {
    fail('dist/v3r-front.css usa @layer (contrato §5 proíbe)')
  } else {
    ok('dist/v3r-front.css não usa @layer')
  }

  if (/tailwind/i.test(css)) {
    fail('dist/v3r-front.css referencia Tailwind (contrato §5 proíbe depender dele)')
  } else {
    ok('dist/v3r-front.css não referencia Tailwind')
  }

  if (!css.includes('data:font/woff2;base64,')) {
    fail('dist/v3r-front.css não embarca a fonte como base64 (contrato §3)')
  } else {
    ok('dist/v3r-front.css embarca a fonte como base64')
  }
}

if (process.exitCode === 1) {
  console.error('[verify-dist] build reprovado — corrija antes de publicar.')
  process.exit(1)
}
