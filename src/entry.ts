// Entrada só do bundle de runtime (Vite), separada de `index.ts` — que é o
// que o `tsc` processa para gerar `dist/index.d.ts`. Se o import de CSS
// ficasse em `index.ts`, o `.d.ts` publicado carregaria
// `import './styles.css'`, e quem consumir o pacote quebraria o
// type-check por um módulo que não existe em `dist/` sob esse nome (o CSS
// emitido é `v3r-front.css`, exposto pelo subpath `./styles.css` do
// `package.json`, não um arquivo real).
import './styles.css'

export * from './index'
