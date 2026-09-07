// Confere, depois do build, que o `dist/` produzido bate com o que o
// `package.json` promete e com os critérios de aceite que não fazem sentido
// como teste de unidade (conteúdo do bundle publicado).
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { build } from 'vite'

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

const dtsPath = resolve(dist, 'index.d.ts')
if (existsSync(dtsPath)) {
  const dts = readFileSync(dtsPath, 'utf8')
  if (/\.css/i.test(dts)) {
    fail('dist/index.d.ts referencia arquivo de CSS — os tipos publicados precisam ficar livres disso')
  } else {
    ok('dist/index.d.ts não referencia arquivo de CSS')
  }
}

// Quem importa só os componentes precisa receber o CSS junto no resultado
// construído — sem precisar de um segundo import da folha de estilo. E quem
// importa os componentes E a folha explicitamente não pode ter a regra
// duplicada no resultado. As duas coisas só se provam construindo, com Vite,
// um consumidor fictício que importa o pacote publicado — igual a qualquer
// plugin da família faz.
async function buildFixture(withExplicitStyles) {
  const fixtureDir = mkdtempSync(resolve(tmpdir(), 'v3r-front-verify-dist-'))
  const entryPath = resolve(fixtureDir, 'entry.js')
  const source = withExplicitStyles
    ? "import { FamilyHeader } from '@v3rtech/v3r-front'\n" +
      "import '@v3rtech/v3r-front/styles.css'\n" +
      'export { FamilyHeader }\n'
    : "import { FamilyHeader } from '@v3rtech/v3r-front'\nexport { FamilyHeader }\n"
  writeFileSync(entryPath, source)

  try {
    const result = await build({
      root: fixtureDir,
      logLevel: 'silent',
      configFile: false,
      build: {
        write: false,
        lib: {
          entry: entryPath,
          formats: ['es'],
          fileName: () => 'fixture.js',
          cssFileName: 'fixture',
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime'],
        },
      },
      plugins: [
        {
          // Resolve os specifiers do pacote para o `dist/` que acabou de
          // ser construído — é o mesmo `dist/` que vai ser publicado.
          name: 'v3r-front-verify-fixture-resolve',
          resolveId(id) {
            if (id === '@v3rtech/v3r-front') return resolve(dist, 'index.js')
            if (id === '@v3rtech/v3r-front/styles.css') return resolve(dist, 'v3r-front.css')
            return null
          },
        },
      ],
    })

    const output = Array.isArray(result) ? result[0].output : result.output
    const cssAsset = output.find((asset) => asset.fileName?.endsWith('.css'))
    return cssAsset ? cssAsset.source ?? cssAsset.code ?? '' : ''
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true })
  }
}

if (existsSync(jsPath) && existsSync(cssPath)) {
  try {
    const marker = /\.v3r-header\s*\{/

    const onlyComponentsCss = await buildFixture(false)
    if (marker.test(onlyComponentsCss)) {
      ok('consumidor que importa só os componentes recebe o CSS no resultado construído')
    } else {
      fail('consumidor que importa só os componentes NÃO recebeu o CSS no resultado construído')
    }

    const withExplicitStylesCss = await buildFixture(true)
    const occurrences = (withExplicitStylesCss.match(new RegExp(marker.source, 'g')) || []).length
    if (occurrences === 1) {
      ok('importar componentes e a folha explicitamente não duplica as regras no resultado')
    } else {
      fail(
        `importar componentes e a folha explicitamente produziu ${occurrences} ocorrência(s) de ` +
          '.v3r-header{ no resultado (esperado 1 — duplicação ou ausência)'
      )
    }
  } catch (error) {
    fail(`falha ao construir consumidor fictício para verificar o CSS: ${error.message}`)
  }
}

if (process.exitCode === 1) {
  console.error('[verify-dist] build reprovado — corrija antes de publicar.')
  process.exit(1)
}
