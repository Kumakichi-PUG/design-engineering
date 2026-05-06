import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // OKLCH 値は CSS 変数で動的に渡す。Tailwind は最小限のニュートラルだけ
        ink: 'rgb(10 6 6)',
        glass: 'rgb(255 255 255 / 0.04)',
      },
      fontFamily: {
        // distinctive な選択。実装時に Track A が確定する
        display: ['"Tenor Sans"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backdropBlur: {
        glass: '12px',
      },
    },
  },
  plugins: [],
}

export default config
