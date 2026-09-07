// Confere, depois do build, que o `dist/` produzido bate com o que o
// `package.json` promete e com os critérios de aceite que não fazem sentido
// como teste de unidade (conteúdo do bundle publicado).
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync, mkdirSync, symlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
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

const requiredFiles = ['index.js', 'index.browser.js', 'index.d.ts', 'v3r-front.css']
for (const file of requiredFiles) {
  const path = resolve(dist, file)
  if (!existsSync(path)) {
    fail(`${file} não existe em dist/`)
  } else {
    ok(`${file} existe`)
  }
}

// Subcaminho `@v3rtech/v3r-front/vite` (ferramenta de build) — artefato
// completamente separado do dos componentes.
const viteToolingFiles = ['vite/index.js', 'vite/index.d.ts']
for (const file of viteToolingFiles) {
  const path = resolve(dist, file)
  if (!existsSync(path)) {
    fail(`${file} não existe em dist/`)
  } else {
    ok(`${file} existe`)
  }
}

const jsPath = resolve(dist, 'index.js')
const browserJsPath = resolve(dist, 'index.browser.js')

function checkReactExternal(path, label) {
  if (!existsSync(path)) return
  const js = readFileSync(path, 'utf8')

  // React não pode estar embutido: procura marcadores internos do runtime
  // do React (não a palavra "react", que aparece legitimamente nos imports
  // externos) — símbolos que só existem se o código-fonte do React tiver
  // sido de fato incluído no bundle.
  const reactInternals = ['ReactCurrentDispatcher', 'react.element', 'react.fragment', 'ReactSharedInternals']
  const found = reactInternals.filter((marker) => js.includes(marker))
  if (found.length > 0) {
    fail(`${label} parece conter React embutido (marcadores: ${found.join(', ')})`)
  } else {
    ok(`${label} não contém marcadores internos do React`)
  }

  const hasExternalImport = /from\s*['"]react['"]/.test(js) || /require\(['"]react['"]\)/.test(js)
  if (!hasExternalImport) {
    fail(`${label} não importa "react" como módulo externo — build pode ter embutido o runtime`)
  } else {
    ok(`${label} importa "react" como módulo externo`)
  }
}

checkReactExternal(jsPath, 'dist/index.js')
checkReactExternal(browserJsPath, 'dist/index.browser.js')

// A entrada Node-safe não pode ter rastro de import de CSS — é exatamente o
// que a distingue da entrada "browser" (contrato: quem resolve como Node não
// pode ser obrigado a processar CSS).
if (existsSync(jsPath)) {
  const js = readFileSync(jsPath, 'utf8')
  if (/\.css/i.test(js)) {
    fail('dist/index.js referencia arquivo de CSS — a entrada Node-safe precisa ficar livre disso')
  } else {
    ok('dist/index.js não referencia arquivo de CSS')
  }
}

if (existsSync(browserJsPath)) {
  const js = readFileSync(browserJsPath, 'utf8')
  if (!js.includes('v3r-front.css')) {
    fail('dist/index.browser.js não referencia v3r-front.css — a entrada "browser" precisa embarcar o CSS')
  } else {
    ok('dist/index.browser.js referencia v3r-front.css')
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

// A ferramenta de build (`@v3rtech/v3r-front/vite`, PostCSS incluso) não
// pode vazar para o artefato dos componentes — é o próprio critério de
// aceite que justifica os dois serem entradas de build separadas.
function checkNoBuildToolingLeak(path, label) {
  if (!existsSync(path)) return
  const js = readFileSync(path, 'utf8')
  const markers = ['postcss', 'v3r-front-unwrap-css-layers', 'v3r-front-rescope-vendor-css']
  const found = markers.filter((marker) => js.toLowerCase().includes(marker.toLowerCase()))
  if (found.length > 0) {
    fail(`${label} contém rastro da ferramenta de build (marcadores: ${found.join(', ')})`)
  } else {
    ok(`${label} não contém rastro da ferramenta de build (postcss/plugins de cascata)`)
  }
}

checkNoBuildToolingLeak(jsPath, 'dist/index.js')
checkNoBuildToolingLeak(browserJsPath, 'dist/index.browser.js')

const dtsPath = resolve(dist, 'index.d.ts')
if (existsSync(dtsPath)) {
  const dts = readFileSync(dtsPath, 'utf8')
  if (/\.css/i.test(dts)) {
    fail('dist/index.d.ts referencia arquivo de CSS — os tipos publicados precisam ficar livres disso')
  } else {
    ok('dist/index.d.ts não referencia arquivo de CSS')
  }
}

// A partir daqui, os fixtures resolvem `@v3rtech/v3r-front` pela resolução
// REAL de pacote — um `node_modules/@v3rtech/v3r-front` simbólico apontando
// para a raiz do próprio pacote (que tem `package.json` com o `exports` que
// acabou de ser escrito, e o `dist/` que acabou de ser construído). Assim
// tanto o Vite (que aplica a condição "browser" por padrão em build de
// cliente) quanto o Node puro (que NUNCA aplica "browser") escolhem a
// variante que o `package.json` de fato serve para cada um — em vez de um
// `resolveId` nosso decidir por eles, o que testaria uma resolução que
// nenhum consumidor real usa.
const workspaceDir = mkdtempSync(resolve(tmpdir(), 'v3r-front-verify-dist-'))
const workspaceModulesDir = resolve(workspaceDir, 'node_modules')
const scopedModulesDir = resolve(workspaceModulesDir, '@v3rtech')
mkdirSync(scopedModulesDir, { recursive: true })
symlinkSync(root, resolve(scopedModulesDir, 'v3r-front'), 'dir')
// `react` é peerDependency (nunca embutida) — o runner Node puro do teste
// abaixo precisa achá-la, do mesmo jeito que qualquer consumidor real teria
// `react` instalada. Aponta para a mesma cópia já usada por este pacote.
for (const dep of ['react', 'react-dom']) {
  symlinkSync(resolve(root, 'node_modules', dep), resolve(workspaceModulesDir, dep), 'dir')
}

// Quem importa só os componentes precisa receber o CSS junto no resultado
// construído — sem precisar de um segundo import da folha de estilo. E quem
// importa os componentes E a folha explicitamente não pode ter a regra
// duplicada no resultado. As duas coisas só se provam construindo, com Vite,
// um consumidor fictício que importa o pacote publicado — igual a qualquer
// plugin da família faz.
async function buildFixture(withExplicitStyles) {
  // Precisa viver DENTRO do workspace (não num tmpdir irmão): a resolução
  // de `node_modules` do Node/Vite sobe a árvore de diretórios a partir do
  // arquivo que importa — só encontra o `node_modules` simbólico do
  // workspace se o entry estiver debaixo dele.
  const fixtureDir = mkdtempSync(resolve(workspaceDir, 'fixture-'))
  const entryPath = resolve(fixtureDir, 'entry.js')
  const source = withExplicitStyles
    ? "import { FamilyHeader } from '@v3rtech/v3r-front'\n" +
      "import '@v3rtech/v3r-front/styles.css'\n" +
      'export { FamilyHeader }\n'
    : "import { FamilyHeader } from '@v3rtech/v3r-front'\nexport { FamilyHeader }\n"
  writeFileSync(entryPath, source)

  try {
    const result = await build({
      // A raiz do build é o workspace com o `node_modules` simbólico — é
      // dali que a resolução de `@v3rtech/v3r-front` precisa enxergar o
      // pacote, para o algoritmo padrão do Node/Vite entrar em ação.
      root: workspaceDir,
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
    })

    const output = Array.isArray(result) ? result[0].output : result.output
    const cssAsset = output.find((asset) => asset.fileName?.endsWith('.css'))
    const jsAsset = output.find((asset) => asset.fileName?.endsWith('.js'))
    return {
      css: cssAsset ? cssAsset.source ?? cssAsset.code ?? '' : '',
      js: jsAsset ? jsAsset.code ?? '' : '',
    }
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true })
  }
}

if (existsSync(jsPath) && existsSync(browserJsPath) && existsSync(cssPath)) {
  try {
    const marker = /\.v3r-header\s*\{/

    const onlyComponents = await buildFixture(false)
    if (marker.test(onlyComponents.css)) {
      ok('consumidor construído para o navegador, importando só os componentes, recebe o CSS no resultado')
    } else {
      fail('consumidor construído para o navegador, importando só os componentes, NÃO recebeu o CSS no resultado')
    }

    const withExplicitStyles = await buildFixture(true)
    const occurrences = (withExplicitStyles.css.match(new RegExp(marker.source, 'g')) || []).length
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

  // Um arquivo que importe SÓ os componentes, executado por um runner Node
  // sem processar CSS, não pode estourar. `node script.mjs`, sem Vite/Vitest
  // no meio, é o runner mais hostil que existe para isso: Node nunca aplica
  // a condição "browser" por padrão, então a resolução cai exatamente onde
  // sete plugins caíram (contrato do prompt) — em `dist/index.js`, sem CSS.
  try {
    const nodeScriptPath = resolve(workspaceDir, 'run-in-plain-node.mjs')
    writeFileSync(
      nodeScriptPath,
      "import { FamilyHeader } from '@v3rtech/v3r-front'\n" +
        "if (typeof FamilyHeader !== 'function') {\n" +
        "  throw new Error('FamilyHeader não foi resolvido como função')\n" +
        '}\n' +
        "console.log('OK')\n"
    )
    const stdout = execFileSync(process.execPath, [nodeScriptPath], {
      cwd: workspaceDir,
      encoding: 'utf8',
    })
    if (stdout.trim() === 'OK') {
      ok('runner Node puro (sem processar CSS) importa só os componentes sem estourar')
    } else {
      fail(`runner Node puro produziu saída inesperada: ${stdout}`)
    }
  } catch (error) {
    fail(`runner Node puro estourou ao importar só os componentes: ${error.message}`)
  }
}

rmSync(workspaceDir, { recursive: true, force: true })

if (process.exitCode === 1) {
  console.error('[verify-dist] build reprovado — corrija antes de publicar.')
  process.exit(1)
}
