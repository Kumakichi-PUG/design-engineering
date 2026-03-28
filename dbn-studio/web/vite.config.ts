import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      '@dbn': resolve(__dirname, 'src/dbn'),
      '@editor': resolve(__dirname, 'src/editor'),
      '@canvas': resolve(__dirname, 'src/canvas'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
