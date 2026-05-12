/**
 * happa-label v0.1 — アプリケーション状態（spec §7 / §A.1）。
 *
 * Phase A: `AppState` interface / `DEFAULTS` 定数に加え、シングルトンの
 * pub/sub（`getState` / `setState` / `subscribe`）を提供する。状態は
 * メモリ上のみで保持し、localStorage / IndexedDB へは保存しない
 * （禁忌 §6）。
 *
 * テキスト・フォント関連フィールドは持ち込まない（禁忌 §2）。
 * 3 色目（Text 色）は再導入しない（禁忌 §4）。
 */

/** Aspect ratio プリセット（spec §A.1）。 */
export type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16';

/** PNG 出力倍率（spec §A.1 / FR-L01）。 */
export type PngScale = 1 | 2 | 4;

/**
 * happa-label アプリケーションの全状態。spec §7。
 *
 * - 色は `surfaceColor` / `innerColor` の 2 色のみ（DL-1）。
 * - Overlay は `showOverlay` トグル + `overlayDataUrl` で制御（DL-6）。
 *   localStorage / IndexedDB に保存しない（禁忌 §6）。
 */
export interface AppState {
  // layout
  /** Aspect ratio プリセット。 */
  aspectRatio: AspectRatio;
  /** Edge Band 比率 (%)。`gutter = innerShort × gutterPct / 100`。 */
  gutterPct: number;
  /** Bleed 倍率。`bleed = gutter × bleedMult`。 */
  bleedMult: number;

  // shape
  /** 正多角形の頂点数（3, 4, 5, 6, 7, 8, 10, 12, 16, 24）。 */
  vertexCount: number;
  /** Shape Jitter 強度 (%)。0 = 正多角形、100 = 最大ランダム。 */
  shapeRandomness: number;

  // animation
  /** アニメーション進行度 0..1（spec §3.3 二相モデル）。 */
  progress: number;
  /** 決定論的 RNG の seed（0..1 の float）。 */
  seed: number;

  // fragmentation
  /** Voronoi 破片数。 */
  fragmentCount: number;
  /** Cell Jitter (%)。seed 点を Lloyd 緩和後に乱す振幅。 */
  randomness: number;

  // explosion motion
  /** Inner Cell の最大変位 (%)（`innerShort × pct / 100`）。 */
  innerDispPct: number;
  /** Perimeter Cell の倍率（`innerMax × mult`）。 */
  perimMult: number;
  /** Speed Variance (%)。1±V の範囲で速度をスケール。 */
  speedVariance: number;
  /** Direction Noise (°)。radial 方向に対する角度ジッタ最大値。 */
  directionNoise: number;
  /** Rotation 振幅 (%)。cell の回転角の倍率。 */
  rotation: number;

  // color (2 colors)
  /** Surface 色（破片の表面、HEX 文字列）。 */
  surfaceColor: string;
  /** Inner 色（破片の隙間から透ける内側、HEX 文字列）。 */
  innerColor: string;

  // overlay
  /** Overlay の表示 ON/OFF。 */
  showOverlay: boolean;
  /** Overlay 画像の data URL（読み込み済みなら non-null）。 */
  overlayDataUrl: string | null;

  // export
  /** PNG 出力倍率（×1 / ×2 / ×4）。 */
  pngScale: PngScale;

  // guides
  /** innerPoly オーバーレイガイドの ON/OFF。 */
  showHull: boolean;
  /** cell edges オーバーレイガイドの ON/OFF。 */
  showCells: boolean;
}

/** spec §A.1 のデフォルト値一覧。 */
export const DEFAULTS: AppState = {
  aspectRatio: '1:1',
  gutterPct: 12,
  bleedMult: 1.0,
  vertexCount: 6,
  shapeRandomness: 0,
  progress: 0,
  seed: 0.5,
  fragmentCount: 80,
  randomness: 50,
  innerDispPct: 10,
  perimMult: 2.5,
  speedVariance: 40,
  directionNoise: 13,
  rotation: 50,
  surfaceColor: '#0a0a0a',
  innerColor: '#ff3300',
  showOverlay: false,
  overlayDataUrl: null,
  pngScale: 1,
  showHull: false,
  showCells: false,
};

/** 状態購読リスナー。 */
export type StateListener = (state: AppState) => void;

let current: AppState = { ...DEFAULTS };
const listeners = new Set<StateListener>();

/** 現在の状態のスナップショットを返す。 */
export function getState(): AppState {
  return current;
}

/**
 * 部分更新を適用し、購読中の全リスナーに新状態を通知する。
 *
 * 不変性を保つため、内部では新オブジェクトに差し替える。
 */
export function setState(patch: Partial<AppState>): void {
  current = { ...current, ...patch };
  for (const listener of listeners) {
    listener(current);
  }
}

/**
 * 状態変更を購読する。返却された関数を呼ぶと購読解除される。
 */
export function subscribe(listener: StateListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
