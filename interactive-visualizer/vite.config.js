import { defineConfig } from 'vite';

export default defineConfig({
  base: '/design-engineering/interactive-visualizer/',
  build: {
    outDir: '../docs/interactive-visualizer',
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
});
