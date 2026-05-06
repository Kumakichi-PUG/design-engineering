/**
 * Design tokens — Hands of Flame
 *
 * 暗背景・タイポグラフィ・レイアウト寸法など、UI の足回り値を集約。
 * シェーダ側の OKLCH 配色とは別レイヤーで、UI クロムだけが参照する値を置く。
 *
 * 原則：「アートを邪魔しない最小限のクロム」(CLAUDE.md §絶対に守る原則)
 */

/**
 * 暗背景。OKLCH(0.08, 0.025, 25) ≒ 焦げた赤の極暗値を sRGB に変換した値。
 * 余白部分やローディング背景に使う。シェーダの背景はここを使わず別計算。
 */
export const ink = {
  /** 余白の最暗値 — `bg-ink` でも参照 */
  void: '#0a0606',
  /** UI 線・分割線 */
  hairline: 'rgba(255, 255, 255, 0.06)',
  /** GUI パネル背景（半透明ガラス） */
  glass: 'rgba(255, 255, 255, 0.04)',
} as const

/**
 * タイポグラフィ。distinctive な選択：
 * - Display: Tenor Sans（細身のセリフ寄りサンセリフ。炎に合う繊細さ）
 * - Mono:    JetBrains Mono（GUI の数値、技術的でクール）
 * フォント自体は外部CDNではなくシステム搭載 fallback。
 * 将来 Google Fonts を入れる場合も Track A の責務はここの定数のみ。
 */
export const typography = {
  display: '"Tenor Sans", "Hiragino Mincho ProN", serif',
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
} as const

/**
 * レイアウト定数。AspectFrame 含む UI で参照。
 */
export const layout = {
  /** 16:9 = 1.7777... */
  aspectRatio: 16 / 9,
  /** AspectFrame の最小幅（推奨）。これを下回ると視認性が落ちる */
  minWidth: 1024,
  /** AspectFrame の余白割合（ウィンドウに対する内側比率の上限） */
  insetRatio: 1.0,
  /** GUI パネル左マージン */
  guiMargin: 16,
} as const

/**
 * モーション系の UI トランジション定数（シェーダの動きとは別）。
 */
export const motion = {
  /** GUI フェード */
  guiFadeMs: 180,
  /** カーソル auto-hide 時間 */
  cursorIdleMs: 3000,
} as const

/**
 * Z-index ヒエラルキー。
 * Canvas が一番下、Overlay 系が上。
 */
export const zIndex = {
  canvas: 0,
  ghost: 1,
  ember: 2,
  flame: 3,
  postprocess: 4,
  overlay: 10,
  gui: 20,
  modal: 30,
} as const
