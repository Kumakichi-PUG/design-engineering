/**
 * Scene 構築（happa-label v0.1、spec §6.3）。
 *
 * `buildScene(L, state)` は `Layout + AppState` から描画に必要な幾何
 * （innerPoly + Cell 配列）を一括生成する pure 関数。spec §4.2 の二相
 * レンダリングモデルに従い、progress には依存しない。変位は描画時に
 * `cell.v{x,y} × easeOutExpo(progress)` として適用される。
 *
 * 主な処理（spec §6.3 と完全に一致する 8 ステップ）:
 *
 * 1. 主 RNG: `createRng(state.seed)`。polygon 用は `generateInitialPolygon`
 *    内部で seed + 54321 のオフセット RNG を別途生成（衝突回避、spec §4.1）。
 * 2. `generateInitialPolygon(L, state)` で正多角形 + shape jitter。
 *    `innerW` / `innerH` は L から直接渡す（spec §4.1 の aspect-aware 内接楕円）。
 * 3. Adaptive phantom offset（spec §4.3）。
 * 4. `shrunkPoly = offsetPolygonRadial(innerPoly, -shrinkDist)` を生成し、
 *    `isInner` の binary 分類に使う（spec §4.5）。
 * 5. Poisson-disk → Lloyd → Cell Jitter（`state.randomness`）。
 * 6. Phantom ring + d3-delaunay Voronoi。clip rect は `computeVoronoiClipRect`。
 * 7. **realPoints のみ** に対して `Cell` を構築（phantom 含めない）。各 cell に
 *    radial direction + `state.directionNoise` の角度ジッタ、speed variance、
 *    `isInner` ベースの maxDisp、`state.rotation` 振幅の rot を計算。
 * 8. `{ innerPoly, cells }` を返す。
 *
 * **parent v1.1 / Phase 0 コピー版からの差分**:
 * - `state.shapeScale` を廃止（store に存在しない）
 * - Cell に `isPhantom` を持たせず、`isInner: boolean` の binary 分類に戻す
 *   （spec §6.2 Cell 型 / §4.5）
 * - 旧 `FRAGMENT_JITTER_PCT` ハードコードを撤去し `state.randomness` を使う
 *   （spec §6.3 / §7）
 * - 旧 radial 線形カーブを撤去し binary 分類による displacement に戻す
 *   （spec §4.5）
 * - direction noise（`state.directionNoise` の角度ジッタ）を再有効化（spec §6.3）
 * - rotation 振幅（`state.rotation`）を再有効化（spec §4.5）
 * - phantom 由来の cell は **Scene.cells に含めない**（描画も計算もしない）
 *
 * 設計参照:
 * - `docs/happa-label-spec.md` §4.1–4.5 / §6.2 / §6.3 / §7
 */

import { Delaunay } from 'd3-delaunay';

import {
  clampVec2,
  generateInitialPolygon,
  offsetPolygonRadial,
  pointInPolygon,
  polygonAABB,
  polygonArea,
} from '../core/polygon';
import { createRng } from '../core/rng';
import type { Cell, Layout, Scene, Vec2 } from '../core/types';
import {
  computeVoronoiClipRect,
  generatePhantomRing,
  generatePoissonDiskPointsInPolygon,
  LLOYD_ITERATIONS,
  lloydInPolygon,
} from '../core/voronoi';
import type { AppState } from '../state';

/**
 * `Layout + AppState` から 1 フレーム分の Scene を構築する（spec §6.3）。
 *
 * @param L     現在の Layout（`computeLayout(state)` の結果）。
 * @param state 現在の AppState（shape / fragmentation / motion を参照）。
 * @returns `{ innerPoly, cells }` からなる Scene。
 */
export function buildScene(L: Layout, state: AppState): Scene {
  // ── 1. 主 RNG（spec §6.3 step 1） ─────────────────────────
  const rng = createRng(state.seed);

  // ── 2. 正多角形 + shape jitter（spec §4.1, §6.3 step 2） ──
  // innerW / innerH を直接渡す（aspect-aware 内接楕円）。
  const innerCX = (L.innerX0 + L.innerX1) / 2;
  const innerCY = (L.innerY0 + L.innerY1) / 2;
  const innerPoly = generateInitialPolygon({
    vertexCount: state.vertexCount,
    shapeRandomness: state.shapeRandomness,
    seed: state.seed,
    centerX: innerCX,
    centerY: innerCY,
    innerW: L.innerW,
    innerH: L.innerH,
  });

  // ── 3. Adaptive phantom offset（spec §4.3, §6.3 step 3） ──
  const area = polygonArea(innerPoly);
  const avgCellRadius = Math.sqrt(area / Math.max(1, state.fragmentCount) / Math.PI);
  const phantomOffset = Math.min(
    L.innerShort * 0.25,
    Math.max(L.innerShort * 0.04, avgCellRadius * 1.4),
  );

  // ── 4. shrunkPoly（Inner/Perimeter binary 分類用、spec §4.5, §6.3 step 4） ──
  const shrinkDist = Math.min(L.gutter * 0.6, L.innerShort * 0.08);
  const shrunkPoly = offsetPolygonRadial(innerPoly, -shrinkDist);

  // ── 5. Seed 点: Poisson-disk → Lloyd → Cell Jitter（spec §6.3 step 5） ──
  let realPoints = generatePoissonDiskPointsInPolygon({
    polygon: innerPoly,
    count: state.fragmentCount,
    seed: state.seed,
  });
  realPoints = lloydInPolygon(realPoints, innerPoly, LLOYD_ITERATIONS);
  // spec §6.3: jAmp = (randomness / 100) × innerShort × 0.02
  const jAmp = (state.randomness / 100) * L.innerShort * 0.02;
  realPoints = realPoints.map(
    ([x, y]: Vec2): Vec2 => [x + (rng() - 0.5) * jAmp, y + (rng() - 0.5) * jAmp],
  );

  // ── 6. Phantom ring + Voronoi（spec §6.3 step 6） ─────────
  const phantoms = generatePhantomRing({
    polygon: innerPoly,
    offset: phantomOffset,
    ringDensity: 6,
  });
  const allPoints: Vec2[] = [...realPoints, ...phantoms];
  const delaunay = Delaunay.from(allPoints);
  const voronoi = delaunay.voronoi(computeVoronoiClipRect(innerPoly, phantomOffset));

  // ── 7. Cell 構築（realPoints のみ、spec §6.3 step 7） ─────
  const innerAABB = polygonAABB(innerPoly);
  const cells = buildCells(realPoints, voronoi, shrunkPoly, innerAABB, L, state, rng, {
    innerCX,
    innerCY,
  });

  // ── 8. 戻り値（spec §6.3 step 8） ─────────────────────────
  return { innerPoly, cells };
}

/** `buildCells` の数値パラメータ集約（cognitive complexity 抑制用）。 */
interface BuildCellsContext {
  innerCX: number;
  innerCY: number;
}

/**
 * realPoints の各 index に対し Voronoi セルを取り出して Cell を構築する。
 * phantom 由来の cell は **作らない**（spec §6.3 step 7 の明示要求）。
 *
 * cell 頂点は `innerAABB` で clamp する（数値安定性、parent から継承）。
 *
 * 関数分離の動機: `buildScene` 本体の認知的複雑度を Biome 制限（20）以下に
 * 抑えるため、Cell 1 個分の畳み込みロジックを別関数に切り出す。
 */
function buildCells(
  realPoints: Vec2[],
  voronoi: ReturnType<Delaunay<Delaunay.Point>['voronoi']>,
  shrunkPoly: Vec2[],
  innerAABB: [number, number, number, number],
  L: Layout,
  state: AppState,
  rng: () => number,
  ctx: BuildCellsContext,
): Cell[] {
  const noiseRad = (state.directionNoise * Math.PI) / 180;
  const V = state.speedVariance / 100;
  const rotAmp = state.rotation / 100;
  const innerMax = L.innerShort * (state.innerDispPct / 100);

  const cells: Cell[] = [];
  for (let i = 0; i < realPoints.length; i++) {
    const polyRaw = voronoi.cellPolygon(i);
    if (!polyRaw) continue;
    const seed = realPoints[i];
    if (!seed) continue;
    const clampedPoly = (polyRaw as Vec2[]).map((v) => clampVec2(v, innerAABB));
    const cell = buildOneCell(seed, clampedPoly, shrunkPoly, {
      innerMax,
      perimMult: state.perimMult,
      noiseRad,
      V,
      rotAmp,
      rng,
      innerCX: ctx.innerCX,
      innerCY: ctx.innerCY,
    });
    cells.push(cell);
  }
  return cells;
}

/** `buildOneCell` の数値パラメータ集約（cognitive complexity 抑制用）。 */
interface BuildOneCellParams {
  innerMax: number;
  perimMult: number;
  noiseRad: number;
  V: number;
  rotAmp: number;
  rng: () => number;
  innerCX: number;
  innerCY: number;
}

/**
 * 1 つの seed 点 → 1 Cell（速度ベクトル + 回転）を生成する（spec §6.3 step 7）。
 *
 * 計算順（spec §6.3 と RNG 消費順を完全一致させる）:
 * 1. radial 単位ベクトル `(ux, uy)`（中心 → seed）
 * 2. `aJ = (rng - 0.5) × 2 × noiseRad` で direction noise 角度を引く
 * 3. `(ux, uy)` を `aJ` rad 回転して `(vxDir, vyDir)`
 * 4. `spd = 1 − V + rng × 2V` で speed variance
 * 5. `isInner = pointInPolygon(seed, shrunkPoly)`
 * 6. `maxDisp = isInner ? innerMax : innerMax × perimMult`
 * 7. `vx = vxDir × maxDisp × spd`、`vy = vyDir × maxDisp × spd`
 * 8. `rot = (rng - 0.5) × (isInner ? 1.2 : 4.8) × rotAmp`
 *
 * `rng` 消費順は 3 回（noise → speed → rot）。同 seed + 同入力で同結果。
 */
function buildOneCell(
  seed: Vec2,
  poly: Vec2[],
  shrunkPoly: Vec2[],
  params: BuildOneCellParams,
): Cell {
  const [px, py] = seed;
  const { innerMax, perimMult, noiseRad, V, rotAmp, rng, innerCX, innerCY } = params;

  // radial 方向（中心 → seed）。dist=0 のときはゼロ除算回避で 1 を代入。
  const dx = px - innerCX;
  const dy = py - innerCY;
  const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const ux = dx / dist;
  const uy = dy / dist;

  // direction noise: radial 単位ベクトルを ±noiseRad の範囲で回転。
  const aJ = (rng() - 0.5) * 2 * noiseRad;
  const cosJ = Math.cos(aJ);
  const sinJ = Math.sin(aJ);
  const vxDir = ux * cosJ - uy * sinJ;
  const vyDir = ux * sinJ + uy * cosJ;

  // speed variance: 1 ± V の範囲でスケール。
  const spd = 1 - V + rng() * 2 * V;

  // Inner/Perimeter binary 分類（spec §4.5）。
  const isInner = pointInPolygon([px, py], shrunkPoly);
  const maxDisp = isInner ? innerMax : innerMax * perimMult;

  // rotation: Inner は ×1.2、Perimeter は ×4.8 振幅（spec §4.5）。
  const rot = (rng() - 0.5) * (isInner ? 1.2 : 4.8) * rotAmp;

  return {
    points: poly,
    centroid: [px, py],
    isInner,
    vx: vxDir * maxDisp * spd,
    vy: vyDir * maxDisp * spd,
    rot,
  };
}
