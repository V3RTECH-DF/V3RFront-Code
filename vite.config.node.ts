// Segunda passada de build: gera `dist/index.js`, a entrada Node-safe —
// sem nenhum import de CSS —, servida pelas condições "import"/"default" do
// `package.json` (contrato §11-A). Não tem `plugins: [react()]` nem `test`
// porque não roda testes nem precisa transformar JSX de exemplo: `src/index.ts`
// só reexporta.
//
// `emptyOutDir: false` porque este build roda DEPOIS do de `vite.config.ts`
// (ver script `build` em `package.json`) e não pode apagar
// `dist/index.browser.js` nem `dist/v3r-front.css` que o primeiro já
// produziu.
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const rootDir = import.meta.dirname

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(rootDir, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
})
