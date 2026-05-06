/**
 * Vitest 専用設定。
 *
 * vite.config.ts は vite-plugin-glsl を含むが、test 実行時には不要かつ
 * モジュール解析を狂わせて "No test suite found" を出すケースがあるため、
 * テストでは plugin を切り、環境を jsdom にしておく（DOM API を使う UI コンポーネントの
 * smoke test を将来書ける状態にする）。
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // store の純粋ロジックだけテスト中。DOM が必要になったら jsdom を後で導入
    environment: 'node',
    globals: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
})
