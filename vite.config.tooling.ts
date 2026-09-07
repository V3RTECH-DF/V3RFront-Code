// Terceira passada de build: gera `dist/vite/index.js`, o subcaminho
// `@v3rtech/v3r-front/vite` — a ferramenta de build (contrato, seção
// "Ferramenta de build"). Entrada e artefato completamente separados de
// `vite.config.ts`/`vite.config.node.ts` (a entrada dos componentes): é o
// que garante que Vite/PostCSS, usados só aqui, não vazam para o pacote de
// componentes (critério de aceite verificado em `scripts/verify-dist.mjs`).
//
// `vite` e `postcss` ficam externos — é código para rodar dentro do
// `vite.config.ts` do consumidor, que já tem os dois no próprio
// `node_modules` (`vite` direto, `postcss` como dependência transitiva dele;
// aqui é dependência direta e declarada, ver `package.json`).
//
// `emptyOutDir: false` pelo mesmo motivo do `vite.config.node.ts`: roda
// depois da primeira passada e não pode apagar o que ela já produziu.
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const rootDir = import.meta.dirname

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(rootDir, 'src/vite/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    outDir: 'dist/vite',
    rollupOptions: {
      external: ['vite', 'postcss'],
    },
  },
})
