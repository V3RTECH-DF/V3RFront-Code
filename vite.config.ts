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
      entry: resolve(rootDir, 'src/entry.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
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
