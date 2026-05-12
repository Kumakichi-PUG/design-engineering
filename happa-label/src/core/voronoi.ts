/**
 * Voronoi 下層ユーティリティ（happa v1.1）。
 *
 * spec §5.3 の scene build を以下の pure 関数に分解する:
 *
 * 1. `generatePoissonDiskPointsInPolygon`: innerPoly 内部に **均等分布の
 *    Poisson-disk サンプリング**でシード点を散布する。全候補点に共通の
 *    `minDist = sqrt(area / count / π) × 0.9` を課し、サイズの偏りを
 *    持たせない（Phase E で 3 本構成の weighted sampling から revert）。
 * 2. `lloydInPolygon`: Lloyd 緩和（反復回数 `LLOYD_ITERATIONS = 3`）で
 *    均一化し、polygon 外に出たら midpoint で引き戻す。
 * 3. `generatePhantomRing`: innerPoly 外側に phantom 点リングを並べて
 *    境界 Voronoi セルを安定化（spec §3.4 の adaptive offset 運用と併用）。
 * 4. `computeVoronoiClipRect`: Delaunay.voronoi(clip) 用の厳密 rect を返す。
 *
 * Phase E 修正:
 * - 旧 `generateWeightedPointsInPolygon`（3 峰性 sizeCoeff で破片サイズの
 *   大粒／中粒／小粒を制御する weighted sampling）を削除し、
 *   `generatePoissonDiskPointsInPolygon` に置き換え。
 * - `lloydInPolygon` の `sizeCoeffs` パラメータを削除（weighted Lloyd 廃止）。
 * - 旧 `generatePointsInPolygon`（plain rejection sampling）も未使用のため削除。
 *
 * `Cell` 構築（Inner/Perimeter 分類 + 速度ベクトル + 回転）は本ファイルでは
 * 扱わない。render 層 `scene.ts#buildScene` が本ファイルの関数を組み合わせて
 * `Cell[]` を作る責務（spec §5.3）。
 *
 * 設計参照:
 * - `docs/happa-designtool-v1.1-spec.md` §3.4（Adaptive Phantom Offset）
 * - `docs/happa-designtool-v1.1-spec.md` §5.3（Scene build）
 * - Q10 確定: `LLOYD_ITERATIONS = 3` は本ファイル内の定数
 * - wireframe `wireframes/v0.10/wireframe.html` L450–508
 */

import { Delaunay } from 'd3-delaunay';

import { pointInPolygon, polygonAABB, polygonArea, polygonCentroid } from './polygon';
import { createRng } from './rng';
import type { Vec2 } from './types';

/**
 * Lloyd 緩和の反復回数（Q10 確定、spec §5.3 wireframe L571 と一致）。
 *
 * 3 回で実用的に十分な均一化が得られる（Voronoi セル面積の分散が
 * ほぼ収束する）。増やすと中央密集が強まり、減らすと seed 点の
 * 初期ばらつきが残る。
 */
export const LLOYD_ITERATIONS = 3;

/** phantom ring 構築時の 1 辺あたり補間点数（spec §5.3 / wireframe L578 と一致）。 */
const DEFAULT_PHANTOM_RING_DENSITY = 6;

/** Lloyd 緩和で Voronoi を計算するときの bounding box padding（wireframe L487 と一致）。 */
const LLOYD_BBOX_PAD = 10;

/**
 * `computeVoronoiClipRect` の phantom offset に対する拡張倍率。
 *
 * clip rect は「innerPoly AABB + phantomOffset × 1.2」で作る。1.2 倍にする
 * のは phantom ring が完全に innerPoly の外側に散るため、clip rect が
 * phantom 点をすべて含めるよう若干の安全マージンを確保するため。
 * 1.0 では境界ちょうどに落ちた phantom 点が clip 外と判定されて Voronoi が
 * 開いてしまう恐れがある。
 */
const VORONOI_CLIP_PHANTOM_PAD_MULT = 1.2;

/**
 * `generatePoissonDiskPointsInPolygon` 用の独立 RNG オフセット。
 *
 * polygon 側の `POLYGON_SEED_OFFSET = 54321` と衝突しないよう別系統の整数を
 * 採用。旧 `CLUSTER_SEED_OFFSET = 1000`（granularity 初期実装）と旧
 * `WEIGHTED_SEED_OFFSET = 2000`（Phase C weighted sampling）とも衝突しないよう
 * `2000` を引き継ぐ（機能は違えど RNG 消費順は同一 seed でも実質的に違うので
 * 値自体の選択は連続性より独立性を優先）。
 *
 * `createRng` は `floor(seed × 1e9)` を内部状態とするため、float seed
 * に戻す際は `POISSON_SEED_OFFSET / 1e9` を加算することで最終的に整数加算
 * として作用する（seed + 2000/1e9 を floor(×1e9) すると
 * floor(seed × 1e9) + 2000 と等価）。
 */
const POISSON_SEED_OFFSET = 2000;

/**
 * `generatePoissonDiskPointsInPolygon` の 1 点あたり最大サンプリング試行回数。
 *
 * `count × 60` を採用する。Poisson-disk rejection は通常の rejection sampling
 * より rejected 率が高いが、`fragmentCount = 200` でも 12,000 試行以内に収束する
 * ことを実測で確認（Phase C の weighted 版と同じ上限）。
 */
const POISSON_SAMPLE_MAX_ATTEMPTS_PER_POINT = 60;

/**
 * `generatePoissonDiskPointsInPolygon` の `minDist` 基準倍率。
 *
 * `minDist = sqrt(area / count / π) × 0.9`。ナイーブな `sqrt(area / count / π)`
 * は「全点が等面積円になる理想半径」だが、Poisson-disk は点同士が隣接する
 * ため少し詰まり気味にしたほうが count を満たしやすい。0.9 は実測ベース。
 */
const POISSON_MIN_DIST_MULT = 0.9;

/**
 * Lloyd 緩和で Voronoi セルの中心をシード点に近づける（wireframe L482–508）。
 *
 * 各反復で以下を実行:
 * 1. 現在のシード点から Voronoi 分割を生成（bbox は polygon AABB + padding）
 * 2. 各シード点 i に対し、セル多角形の面積重心（shoelace）を計算
 * 3. 新点が polygon 外なら元点との中点に引き戻す（`innerPoly` を踏み抜かない）
 * 4. 面積が 1e-6 未満のセルはスキップして元点を保持（数値不安定回避）
 *
 * 3 回で実用的に十分均一化される（Q10 確定）。呼び出し側で反復回数を
 * 上書きしたい場合は `iterations` を明示する（テスト・チューニング用途）。
 *
 * **決定論性**: 本関数内で rng を消費しないので、同一入力（points / polygon
 * / iterations）で完全に同一の出力。
 *
 * **Phase E で weighted Lloyd を撤去**: 旧実装は `sizeCoeffs` を受けて
 * `attractFactor = clamp(1 / sizeCoeff, 0.1, 2.0)` を吸引率に乗算していたが、
 * 均等分布の Poisson-disk へ revert したため吸引率は常に 1.0 固定（= 標準 Lloyd）。
 *
 * @param points 初期シード点（`generatePoissonDiskPointsInPolygon` の戻り値）。
 * @param polygon 境界の innerPoly（シード点はここから出ないよう制約）。
 * @param iterations 反復回数（デフォルト `LLOYD_ITERATIONS`）。
 * @returns 緩和後のシード点配列（長さは入力と同じ）。
 */
export function lloydInPolygon(
  points: Vec2[],
  polygon: Vec2[],
  iterations: number = LLOYD_ITERATIONS,
): Vec2[] {
  const [minX, minY, maxX, maxY] = polygonAABB(polygon);
  let current = points.slice();
  for (let iter = 0; iter < iterations; iter++) {
    const d = Delaunay.from(current);
    const v = d.voronoi([
      minX - LLOYD_BBOX_PAD,
      minY - LLOYD_BBOX_PAD,
      maxX + LLOYD_BBOX_PAD,
      maxY + LLOYD_BBOX_PAD,
    ]);
    current = current.map((p, i) => {
      const poly = v.cellPolygon(i) as Vec2[] | null;
      if (!poly) return p;
      const centroid = polygonAreaCentroid(poly);
      if (!centroid) return p;
      // polygon 外に出た場合は元点との中点へ引き戻す（wireframe L503 と一致）。
      if (!pointInPolygon(centroid, polygon))
        return [(centroid[0] + p[0]) * 0.5, (centroid[1] + p[1]) * 0.5];
      return centroid;
    });
  }
  return current;
}

/**
 * Voronoi セル多角形の面積重心を shoelace で算出する（`lloydInPolygon` 内部用）。
 *
 * 面積 |a| < 1e-6 のとき数値不安定を避けるため `null` を返す。呼び出し側は
 * 「元点を保持する」挙動にフォールバックする責務を持つ。入力 polygon は
 * `cellPolygon` の出力（末尾頂点が先頭と一致する閉じた多角形）を想定。
 *
 * 関数分離の動機: `lloydInPolygon.map` コールバックの cognitive complexity を
 * Biome 上限 20 に収めるため。
 */
function polygonAreaCentroid(poly: Vec2[]): Vec2 | null {
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let j = 0; j < poly.length - 1; j++) {
    const v0 = poly[j];
    const v1 = poly[j + 1];
    if (!v0 || !v1) continue;
    const c = v0[0] * v1[1] - v1[0] * v0[1];
    a += c;
    cx += (v0[0] + v1[0]) * c;
    cy += (v0[1] + v1[1]) * c;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-6) return null;
  return [cx / (6 * a), cy / (6 * a)];
}

/**
 * Voronoi 計算用の clip rect を innerPoly AABB から導出する（Phase C Bug-2 対策）。
 *
 * `Delaunay.voronoi(clip)` は clip rect を超えるセル辺を切り落とす。v0 実装では
 * `outerW/outerH` 相当の広い rect を渡しており、極端に離れた phantom 点に
 * 引っ張られたセルが innerPoly AABB を大きくはみ出す問題があった。本関数は
 * `innerPoly AABB + phantomOffset × 1.2` を各方向に pad した厳密な rect を
 * 返すことで、Voronoi セル座標の過剰伸長を抑える。
 *
 * 戻り値は `[x0, y0, x1, y1]` の 4-tuple で、`Delaunay.voronoi(...)` に
 * そのまま渡せる。`phantomOffset` は `scene.ts` で計算済みの adaptive 値
 * （spec §3.4）を想定。
 *
 * @param innerPoly innerPoly（閉じた多角形、3 頂点以上）。
 * @param phantomOffset phantom ring の外側オフセット距離（px、正値）。
 * @returns `[x0, y0, x1, y1]` の clip rect。
 */
export function computeVoronoiClipRect(
  innerPoly: Vec2[],
  phantomOffset: number,
): [number, number, number, number] {
  const [minX, minY, maxX, maxY] = polygonAABB(innerPoly);
  const pad = phantomOffset * VORONOI_CLIP_PHANTOM_PAD_MULT;
  return [minX - pad, minY - pad, maxX + pad, maxY + pad];
}

/** `generatePhantomRing` のパラメータ。 */
export interface GeneratePhantomRingParams {
  /** innerPoly（閉じた多角形）。 */
  polygon: Vec2[];
  /** ring の offset 距離（px、外側方向）。spec §3.4 の `phantomOffset`。 */
  offset: number;
  /**
   * 1 辺あたりの phantom 点数（デフォルト 6、wireframe と一致）。
   * 大きくすると境界がより滑らかに覆われるが Voronoi 計算コストが増える。
   */
  ringDensity?: number;
}

/**
 * innerPoly の外側に phantom 点のリングを生成する（wireframe L450–466）。
 *
 * 各辺を `ringDensity` 等分した補間点を算出し、`polygonCentroid` 基準の
 * 法線方向へ `offset` px だけ外側へ押し出す。これらの phantom 点を実シード
 * 点と合わせて Voronoi に渡すと、境界セルが innerPoly の外側に延びて
 * 覆いの抜け（Inner 色の透け）を抑止できる（spec §3.4 / D-14）。
 *
 * spec §3.4 の adaptive offset は呼び出し側（scene.ts）で計算し、本関数には
 * 既に決定した値を渡す。本関数は pure なリング生成のみを行う。
 *
 * @param params 生成条件。
 * @returns phantom 点配列（長さ `polygon.length × ringDensity`）。
 */
export function generatePhantomRing(params: GeneratePhantomRingParams): Vec2[] {
  const { polygon, offset, ringDensity = DEFAULT_PHANTOM_RING_DENSITY } = params;
  const [cx, cy] = polygonCentroid(polygon);
  const ring: Vec2[] = [];
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    if (!a || !b) continue;
    for (let s = 0; s < ringDensity; s++) {
      const t = s / ringDensity;
      const px = a[0] + (b[0] - a[0]) * t;
      const py = a[1] + (b[1] - a[1]) * t;
      const dx = px - cx;
      const dy = py - cy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      ring.push([px + (dx / len) * offset, py + (dy / len) * offset]);
    }
  }
  return ring;
}

/** `generatePoissonDiskPointsInPolygon` のパラメータ。 */
export interface GeneratePoissonDiskPointsParams {
  /** シード点を配置する範囲（閉じた多角形、3 頂点以上）。 */
  polygon: Vec2[];
  /** 目標点数（整数、`AppState.fragmentCount`）。rejection 上限超過時は下回ることがある。 */
  count: number;
  /**
   * 乱数シード（`AppState.seed`、0..1 の float）。
   * 内部で `createRng(seed + POISSON_SEED_OFFSET / 1e9)` を使い、
   * polygon 側 RNG と独立した系列を確保する。
   */
  seed: number;
}

/**
 * Poisson-disk rejection sampling で「均等分布」のシード点を生成する（Phase E）。
 *
 * Voronoi の性質上、シード点同士の最小距離を制御するとセルサイズが均一化
 * されやすい。本関数は全候補点に共通の `minDist` を課すことで、破片サイズの
 * 意図的なばらつきを排した素朴な Poisson-disk 分布を返す。
 *
 * アルゴリズム:
 * 1. `minDist = sqrt(polygonArea / max(1, count) / π) × POISSON_MIN_DIST_MULT`
 * 2. 候補点 `c` を AABB 内で一様に発生（rng 消費順は x → y）
 * 3. `pointInPolygon` で内部判定、外なら棄却
 * 4. 既存点全てとの距離が `minDist` 以上なら採択、1 つでも近ければ棄却
 * 5. `count` に達するか、`count × POISSON_SAMPLE_MAX_ATTEMPTS_PER_POINT` 回
 *    試行したら打ち切り
 *
 * **決定論性**: 同 `seed` + 同 `polygon` + 同 `count` → 同結果。RNG は
 * `createRng(seed + POISSON_SEED_OFFSET / 1e9)` で独立系列化する。
 *
 * **退化入力**:
 * - `polygon.length < 3` や `count < 1` のときは空配列を返す
 * - `polygonArea` が 0（頂点一直線等）のとき `minDist = 0` となり Poisson-disk
 *   判定が無効化されるので、uniform rejection として機能する
 *
 * **Phase E の変更点**: 旧 `generateWeightedPointsInPolygon` を置換。
 * 破片サイズ比率 / 粒度パラメータに依存する 3 峰性 sizeCoeff のロジックを削除し、
 * 全点に共通の `minDist` を課す純粋な Poisson-disk に変更。sizeCoeff を返さない
 * （戻り値は `Vec2[]` のみ）。
 *
 * @param params サンプリング条件。
 * @returns polygon 内部のシード点配列（長さは `count` 以下）。
 */
export function generatePoissonDiskPointsInPolygon(
  params: GeneratePoissonDiskPointsParams,
): Vec2[] {
  const { polygon, count, seed } = params;
  if (polygon.length < 3 || count < 1) return [];

  const rng = createRng(seed + POISSON_SEED_OFFSET / 1e9);
  const [minX, minY, maxX, maxY] = polygonAABB(polygon);

  // minDist は「全点が等面積円と仮定した理想半径」× 0.9。area=0 や count 巨大時の
  // ゼロ除算を避けるため `Math.max(1, count)` と下限 0 でガード。
  const area = polygonArea(polygon);
  const minDist = Math.sqrt(area / Math.max(1, count) / Math.PI) * POISSON_MIN_DIST_MULT;
  const minDist2 = minDist * minDist;

  const points: Vec2[] = [];
  const maxAttempts = count * POISSON_SAMPLE_MAX_ATTEMPTS_PER_POINT;
  let attempts = 0;

  while (points.length < count && attempts < maxAttempts) {
    attempts++;

    // rng() 消費順: x, y。旧 weighted 実装は sizeR も消費していたが均等分布では
    // 不要なので削除。
    const x = minX + rng() * (maxX - minX);
    const y = minY + rng() * (maxY - minY);

    if (!pointInPolygon([x, y], polygon)) continue;

    // 既存点のいずれかと `minDist` 未満の距離なら棄却。
    let tooClose = false;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!p) continue;
      const dx = p[0] - x;
      const dy = p[1] - y;
      if (dx * dx + dy * dy < minDist2) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    points.push([x, y]);
  }

  return points;
}
