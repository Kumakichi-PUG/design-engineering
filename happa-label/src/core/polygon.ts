/**
 * ポリゴン基本演算 + 正多角形生成（happa-label v0.1、parent v1.1 から継承）。
 *
 * happa-label では warped silhouette を持たないため、parent v1.1 の
 * `subdividePolygon` と `warpPolygonByCells` を削除した形で継承する
 * （spec §6.0.3 / 禁忌 §3）。
 *
 * 主な役割:
 * - `generateInitialPolygon`: seed + jitter から正多角形を生成
 * - `offsetPolygonRadial`: 重心基準の法線方向へ offset（phantom ring 等）
 * - `pointInPolygon` / `polygonCentroid` / `polygonAABB` / `polygonArea`:
 *   基本演算ユーティリティ
 * - `polygonMaxRadius` / `clampVec2`: scene 構築で使う補助関数
 *
 * 全関数 pure。DOM / Canvas / 状態を参照しない。
 *
 * 設計参照:
 * - `happa-label/docs/happa-label-spec.md` §4.1 / §6.2 / §6.3
 * - parent: `happa/src/core/polygon.ts`
 */

import type { Vec2 } from './types';

/**
 * polygon 用 RNG の seed オフセット（spec §4.1 / Q9 確定）。
 *
 * `AppState.seed`（0..1）を `Math.floor(seed × 1e9)` した整数値へ固定値
 * `54321` を加算して mulberry32 の初期状態とする。voronoi 用 RNG
 * （オフセットなし）と衝突しないよう分離する暗黙ルール。
 */
const POLYGON_SEED_OFFSET = 54321;

/**
 * wireframe v0.10 L355–364 と同じ mulberry32 を整数 seed で駆動する。
 *
 * `rng.ts#createRng` は float seed（0..1）を受ける API のため、整数 seed
 * を直接渡す経路として本関数をローカルに持つ。挙動は `createRng` と
 * **完全に同一**で、初期状態の投入経路のみが異なる。
 *
 * @param state 32bit 整数の初期状態（`Math.floor(seed × 1e9) + offset`）。
 */
function mulberry32FromInt(state: number): () => number {
  let a = state | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `generateInitialPolygon` のパラメータ。 */
export interface GenerateInitialPolygonParams {
  /** 頂点数（整数、3..24 の範囲を想定。spec §4.1 では離散 10 段階だが core は任意整数を受ける）。 */
  vertexCount: number;
  /** Shape Jitter 強度（0..100%）。0 = 正多角形、100 = 角度・半径最大ランダム。 */
  shapeRandomness: number;
  /** `AppState.seed`（0..1 の float）。内部で `Math.floor(seed × 1e9) + 54321` に変換。 */
  seed: number;
  /** 内接楕円の中心 X（outer 座標系、px）。 */
  centerX: number;
  /** 内接楕円の中心 Y（outer 座標系、px）。 */
  centerY: number;
  /** innerCanvas の幅（px）。`rx = innerW / 2` として内接楕円の X 半径に変換される。 */
  innerW: number;
  /** innerCanvas の高さ（px）。`ry = innerH / 2` として内接楕円の Y 半径に変換される。 */
  innerH: number;
}

/**
 * 正多角形 + shape jitter を生成する（spec §4.1）。
 *
 * 偶数面は頂点を半ステップ斜めに回転（四角形が軸平行になるのを避ける）、
 * 奇数面は上向きから開始する。各頂点は `(rng - 0.5) × (2π/N) × 0.4 × rAmp`
 * の角度ジッタと `1 - rng × rAmp × 0.45` の半径倍率で揺らす。
 * `rAmp = shapeRandomness / 100`。
 *
 * RNG は `mulberry32(floor(seed × 1e9) + 54321)` を内部生成（Q9 確定）。
 * 呼び出し側の RNG と衝突せず、同 `seed` + 同パラメータで同結果を返す。
 *
 * @param params 生成パラメータ。
 * @returns `vertexCount` 個の頂点列。
 */
export function generateInitialPolygon(params: GenerateInitialPolygonParams): Vec2[] {
  const { vertexCount, shapeRandomness, seed, centerX, centerY, innerW, innerH } = params;
  const rng = mulberry32FromInt(Math.floor(seed * 1e9) + POLYGON_SEED_OFFSET);
  const rAmp = shapeRandomness / 100;
  const rx = innerW / 2;
  const ry = innerH / 2;
  const startAngle = vertexCount % 2 === 0 ? -Math.PI / 2 - Math.PI / vertexCount : -Math.PI / 2;

  const poly: Vec2[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const baseAngle = startAngle + (i / vertexCount) * Math.PI * 2;
    const angleJit = (rng() - 0.5) * ((Math.PI * 2) / vertexCount) * 0.4 * rAmp;
    const angle = baseAngle + angleJit;
    const radiusMult = 1 - rng() * rAmp * 0.45;
    poly.push([
      centerX + Math.cos(angle) * rx * radiusMult,
      centerY + Math.sin(angle) * ry * radiusMult,
    ]);
  }
  return poly;
}

/**
 * 重心基準の法線方向に `distance` px オフセットする。
 *
 * 各頂点と重心（幾何平均）を結ぶ単位ベクトル方向に `distance` を加える。
 * `distance > 0` で外側に膨らみ、`distance < 0` で内側に縮む。
 * phantom ring 構築に使う（spec §4.3 の `phantomOffset`）。
 *
 * 頂点数が 3 未満の場合は入力のコピーを返す（退化入力の安全側）。
 *
 * @param polygon 元の多角形。
 * @param distance オフセット距離（px、符号付き）。
 * @returns オフセット後の頂点列（長さは入力と同じ）。
 */
export function offsetPolygonRadial(polygon: Vec2[], distance: number): Vec2[] {
  if (polygon.length < 3) return polygon.slice();
  const [cx, cy] = polygonCentroid(polygon);
  return polygon.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return [x + (dx / len) * distance, y + (dy / len) * distance];
  });
}

/**
 * 点が polygon 内部か判定する（ray casting）。
 *
 * @param point 判定対象の点。
 * @param polygon 閉じた多角形（自動で閉じる）。
 * @returns 内部なら `true`、外部 or 境界上なら `false`（偶奇に依存）。
 */
export function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    if (!pi || !pj) continue;
    const [xi, yi] = pi;
    const [xj, yj] = pj;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * polygon の**単純平均**による重心。
 *
 * `offsetPolygonRadial` と `generatePhantomRing` が参照する重心と一致
 * させるため面積重み付きではなく算術平均を採用。
 *
 * 頂点数 0 の場合は `[NaN, NaN]` を返す。
 *
 * @param polygon 多角形（頂点 1 個以上）。
 * @returns 重心座標 `[x, y]`。
 */
export function polygonCentroid(polygon: Vec2[]): Vec2 {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of polygon) {
    cx += x;
    cy += y;
  }
  const n = polygon.length;
  return [cx / n, cy / n];
}

/**
 * 指定の基準点から polygon 頂点までの**最大距離**を返す。
 *
 * 用途: 破片配置の radial 正規化（`t = r / rMax` で中心からの正規化距離を
 * 計算、`0..1` クランプ）。`scene.ts#buildOneCell` が cell の radial
 * 位置を求めるのに使う。
 *
 * `reference` 省略時は `polygonCentroid(polygon)`（算術平均）を基準とする。
 *
 * @param polygon 多角形（頂点 1 個以上）。
 * @param reference 基準点。省略時は `polygonCentroid(polygon)`。
 * @returns `max_i |polygon[i] - reference|`（px、非負）。
 */
export function polygonMaxRadius(polygon: Vec2[], reference?: Vec2): number {
  const n = polygon.length;
  if (n === 0) return 0;
  const [cx, cy] = reference ?? polygonCentroid(polygon);
  let maxR2 = 0;
  for (const [x, y] of polygon) {
    const dx = x - cx;
    const dy = y - cy;
    const r2 = dx * dx + dy * dy;
    if (r2 > maxR2) maxR2 = r2;
  }
  return Math.sqrt(maxR2);
}

/**
 * Axis-aligned bounding box を返す。
 *
 * @param polygon 多角形（頂点 1 個以上）。
 * @returns `[minX, minY, maxX, maxY]`。空入力では `[+∞, +∞, -∞, -∞]`。
 */
export function polygonAABB(polygon: Vec2[]): [number, number, number, number] {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/**
 * 点を AABB でクランプした新しい `Vec2` を返す（数値安定化用）。
 *
 * Voronoi `cellPolygon(i)` が返すセル頂点は、phantom リングの広がりに応じて
 * innerPoly の AABB を大きくはみ出した座標を含むことがある。レンダ段で扱う
 * 座標値を有界化しておくと、下流の計算で `Infinity` 混入や桁落ちを回避できる。
 *
 * @param point クランプしたい点。
 * @param aabb `[minX, minY, maxX, maxY]`。
 * @returns 各成分を AABB にクランプした新しい `Vec2`。
 */
export function clampVec2(point: Vec2, aabb: [number, number, number, number]): Vec2 {
  const [minX, minY, maxX, maxY] = aabb;
  const [x, y] = point;
  return [Math.max(minX, Math.min(maxX, x)), Math.max(minY, Math.min(maxY, y))];
}

/**
 * 符号なし面積（shoelace）。
 *
 * Spec §4.3 の `avgCellRad = sqrt(polygonArea / fragmentCount / π)` に用いる。
 * 頂点数 3 未満では 0 を返す（退化入力）。
 *
 * @param polygon 多角形（頂点 3 個以上）。
 * @returns 符号なし面積（px²）。
 */
export function polygonArea(polygon: Vec2[]): number {
  const n = polygon.length;
  if (n < 3) return 0;
  let a = 0;
  for (let i = 0; i < n; i++) {
    const pi = polygon[i];
    const pj = polygon[(i + 1) % n];
    if (!pi || !pj) continue;
    a += pi[0] * pj[1] - pj[0] * pi[1];
  }
  return Math.abs(a) / 2;
}
