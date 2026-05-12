/**
 * happa-label v0.1 — 変更伝播分類（spec §7.1）。
 *
 * 連続するフレームの `AppState` を受け取り、再計算が必要な範囲を
 * `Invalidation` として返す。render パイプラインや（将来の）scene
 * キャッシュが、必要最小限の再計算で済むようにするためのヒント。
 *
 * フィールド → バケットの割当（spec §7.1）:
 * - `layout`: `aspectRatio`, `gutterPct`, `bleedMult`
 * - `scene`:  `vertexCount`, `shapeRandomness`, `seed`,
 *            `fragmentCount`, `randomness`, `innerDispPct`,
 *            `perimMult`, `speedVariance`, `directionNoise`,
 *            `rotation`
 * - render のみ: `progress`, `surfaceColor`, `innerColor`,
 *              `showOverlay`, `overlayDataUrl`, `showHull`,
 *              `showCells`
 * - 出力時のみ（render を起こさない）: `pngScale`
 *
 * 上位 bucket が立ったときは下位 bucket も自動的に立つ
 * （layout → scene → render の包含関係）。
 */

import type { AppState } from './store';

/** 再計算が必要な範囲を示すフラグの組。 */
export interface Invalidation {
  /** layout（innerW/H, gutter, bleed, pad, outer*）の再計算が必要。 */
  layout: boolean;
  /** scene 再構築（innerPoly + Voronoi cells）が必要。 */
  scene: boolean;
  /** 少なくとも再描画が必要。何か変わっていれば true。 */
  render: boolean;
}

/** layout バケットに属するフィールド。 */
const LAYOUT_FIELDS = ['aspectRatio', 'gutterPct', 'bleedMult'] as const satisfies ReadonlyArray<
  keyof AppState
>;

/** scene バケットに属するフィールド。 */
const SCENE_FIELDS = [
  'vertexCount',
  'shapeRandomness',
  'seed',
  'fragmentCount',
  'randomness',
  'innerDispPct',
  'perimMult',
  'speedVariance',
  'directionNoise',
  'rotation',
] as const satisfies ReadonlyArray<keyof AppState>;

/** render のみ起こすフィールド。 */
const RENDER_ONLY_FIELDS = [
  'progress',
  'surfaceColor',
  'innerColor',
  'showOverlay',
  'overlayDataUrl',
  'showHull',
  'showCells',
] as const satisfies ReadonlyArray<keyof AppState>;

function anyChanged(
  prev: AppState,
  next: AppState,
  fields: ReadonlyArray<keyof AppState>,
): boolean {
  for (const f of fields) {
    if (prev[f] !== next[f]) return true;
  }
  return false;
}

/**
 * `prev` → `next` の差分を bucket に分類する。
 *
 * `pngScale` のような出力メタデータの変更は render を誘発しない
 * （`Invalidation.render = false`）。
 */
export function computeInvalidation(prev: AppState, next: AppState): Invalidation {
  const layout = anyChanged(prev, next, LAYOUT_FIELDS);
  const sceneOnly = anyChanged(prev, next, SCENE_FIELDS);
  const renderOnly = anyChanged(prev, next, RENDER_ONLY_FIELDS);

  // layout 変化は scene → render を巻き込む。scene 変化は render を巻き込む。
  const scene = layout || sceneOnly;
  const render = layout || sceneOnly || renderOnly;

  return { layout, scene, render };
}
