/**
 * happa-label v0.1 — コア型定義（spec §6.2）。
 *
 * `TextPathData` / `SilhouettePoint` / `FontSpec` 等の v1.1 テキスト経路
 * 関連型は **持ち込まない**（spec §6.2 / 禁忌 §2-3）。
 */

/** 2 次元座標。`[x, y]` の固定長タプル。 */
export type Vec2 = [number, number];

/**
 * 物理キャンバスのレイアウト（spec §3）。
 *
 * 物理キャンバスは 2 層の入れ子: 外周 outer (= 書き出し範囲) と
 * 内側 inner (= 正多角形 innerPoly の内接範囲)。`pad = gutter + bleed`。
 */
export interface Layout {
  /** innerCanvas の幅（px）。 */
  innerW: number;
  /** innerCanvas の高さ（px）。 */
  innerH: number;
  /** `min(innerW, innerH)`。Aspect 比に依存しない基準長（jitter / disp 振幅に使う）。 */
  innerShort: number;
  /** 破片の飛び出し余白（`innerShort × gutterPct%`）。 */
  gutter: number;
  /** Perimeter 破片の到達余白（`gutter × bleedMult`）。 */
  bleed: number;
  /** 外周合計余白 `pad = gutter + bleed`。 */
  pad: number;
  /** 物理キャンバス幅 `outerW = innerW + 2 × pad`（= 書き出しサイズ）。 */
  outerW: number;
  /** 物理キャンバス高 `outerH = innerH + 2 × pad`（= 書き出しサイズ）。 */
  outerH: number;
  /** innerCanvas 左端 X（outer 座標系）。 */
  innerX0: number;
  /** innerCanvas 上端 Y（outer 座標系）。 */
  innerY0: number;
  /** innerCanvas 右端 X（outer 座標系）。 */
  innerX1: number;
  /** innerCanvas 下端 Y（outer 座標系）。 */
  innerY1: number;
}

/**
 * Voronoi 由来の 1 セル（破片）。spec §6.2。
 *
 * Phase A render-agent が `buildScene` で構築し、描画時に
 * `easeOutExpo(progress)` で `vx` / `vy` を線形に掛けて変位させる。
 */
export interface Cell {
  /** Voronoi セルの頂点列（閉じた多角形）。 */
  points: Vec2[];
  /** seed 点（生成元 = 変位前の centroid）。 */
  centroid: Vec2;
  /** Inner Cell かどうか（centroid ∈ shrunkPoly）。spec §4.5。 */
  isInner: boolean;
  /** 変位ベクトル X 成分（progress=1 時の最大変位、px）。 */
  vx: number;
  /** 変位ベクトル Y 成分（progress=1 時の最大変位、px）。 */
  vy: number;
  /** 回転（rad、progress=1 時の最大回転）。 */
  rot: number;
}

/**
 * Scene = 1 フレーム分の幾何（progress 非依存）。
 *
 * 描画時に `progress` を掛け合わせて変位を適用する。`AppState.sceneCache`
 * にキャッシュして progress 変更のたびに再構築しない（spec §7.1）。
 */
export interface Scene {
  /** 正多角形（未分割、subdivide しない）。 */
  innerPoly: Vec2[];
  /** 破片セル群（順序は seed 点の生成順）。 */
  cells: Cell[];
}
