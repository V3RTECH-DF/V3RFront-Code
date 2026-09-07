// O build em modo lib do Vite extrai o CSS importado em `src/entry.ts` para
// `dist/v3r-front.css`, mas NÃO deixa nenhum rastro desse import em
// `dist/index.js` — é assim que o Vite trata CSS em lib mode. Resultado: quem
// importa só os componentes não recebe o CSS, porque o próprio bundle
// publicado não pede por ele.
//
// Este passo roda depois do `vite build` e insere manualmente, no topo de
// `dist/index.js`, o import relativo ao CSS já emitido. Bundlers Vite/Rollup
// dos consumidores enxergam esse import como qualquer outro e resolvem o
// arquivo — que é o mesmo arquivo físico do subpath `./styles.css`, então
// importar os dois não duplica regra nenhuma no resultado (mesmo id de
// módulo resolvido).
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const jsPath = resolve(root, 'dist/index.js')
const cssImport = "import './v3r-front.css';\n"

if (!existsSync(jsPath)) {
  console.error('[inject-css-import] dist/index.js não existe — rode `vite build` antes.')
  process.exit(1)
}

const js = readFileSync(jsPath, 'utf8')
if (js.includes('v3r-front.css')) {
  console.log('[inject-css-import] dist/index.js já referencia v3r-front.css — nada a fazer.')
} else {
  writeFileSync(jsPath, cssImport + js)
  console.log('[inject-css-import] import de ./v3r-front.css inserido em dist/index.js')
}
