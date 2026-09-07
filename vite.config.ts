/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rootDir = import.meta.dirname

export default defineConfig({
  plugins: [react()],
  build: {
    // A fonte variável (~55KB) precisa ficar embarcada no CSS como base64
    // (contrato §3) — o limite cobre esse arquivo com folga.
    assetsInlineLimit: 100_000,
    lib: {
      // `src/entry.ts` é a entrada "browser" — embarca `import
      // './styles.css'`, e por isso é a que o `scripts/inject-css-import.mjs`
      // injeta no topo do bundle depois do build (Vite em lib mode não deixa
      // rastro do import de CSS no JS emitido). Produz `dist/index.browser.js`,
      // servido pela condição "browser" do `package.json` — a que os
      // consumidores que constroem para o navegador com Vite resolvem.
      //
      // A entrada Node-safe (`dist/index.js`, sem nenhum import de CSS, servida
      // pelas condições "import"/"default") é produzida por um segundo build,
      // configurado em `vite.config.node.ts` e encadeado no script `build`.
      // As duas entradas não podem viver no mesmo `vite build`: com formato
      // `es` e duas entradas, o Rollup extrai o código comum para um chunk
      // compartilhado e os dois arquivos viram meros ponte de re-export —
      // o que quebra tanto o import externo de `react` (fica só no chunk)
      // quanto o CSS embarcado (só uma das entradas o importa).
      entry: resolve(rootDir, 'src/entry.ts'),
      formats: ['es'],
      fileName: () => 'index.browser.js',
      cssFileName: 'v3r-front',
    },
    rollupOptions: {
      // React nunca embutido no pacote — é peerDependency (contrato de build).
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: true,
  },
})
