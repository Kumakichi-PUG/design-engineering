import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: './',

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@state': resolve(__dirname, 'src/state'),
      '@core': resolve(__dirname, 'src/core'),
      '@render': resolve(__dirname, 'src/render'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@export': resolve(__dirname, 'src/export'),
    },
  },

  server: {
    port: 5173,
    open: true,
    host: true,
  },

  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    cssCodeSplit: false,
    // Phase K2 後片付け: 旧 `rollupOptions.output.manualChunks` を撤去。
    // 新しい Rollup（Rolldown）では `manualChunks` のオブジェクト形式が
    // 非互換となり Cloudflare Pages ビルドが失敗していた。happa は
    // モジュール数が少なく Vite の自動 chunking で十分なパフォーマンスが
    // 出るため、手動分割を諦めて default に戻す。
  },

  preview: {
    port: 4173,
    open: true,
  },
});
