/**
 * Phase: pre-explosion（progress === 0、happa-label v0.1）。
 *
 * spec §4.2 / §9 に従い、無傷の innerPoly を `state.surfaceColor` でベタ塗りする。
 * Voronoi 分割は一切描かない（spec §4.2 progress=0 case の明示要求 / DL 系
 * 二相モデル）。
 *
 * **parent v1.1 / Phase 0 コピー版からの差分**:
 * - silhouette / composite 引数を削除（happa-label には warped silhouette /
 *   composite なし、禁忌 §3）
 * - 直接 innerPoly を引数で受ける（render/index.ts の dispatcher が
 *   scene.innerPoly を渡す）
 * - Overlay 描画は本関数の責務外。dispatcher（render/index.ts）が描画後に
 *   `drawOverlay` を呼ぶ（spec §9）
 *
 * 設計参照: `docs/happa-label-spec.md` §4.2 / §9。
 */

import type { Layout, Vec2 } from '../core/types';
import type { AppState } from '../state';

/**
 * 無傷シーン（progress = 0）を 1 フレーム描画する（spec §4.2）。
 *
 * `ctx` のサイズは呼び出し側が `Layout.outerW/H` に同期済みである前提。
 *
 * @param ctx        描画先の 2D コンテキスト。
 * @param _L         現在の Layout（本関数では未参照だが API 一貫性のため受ける）。
 * @param innerPoly  `buildScene` の結果 `scene.innerPoly`。
 * @param state      現在の AppState（`surfaceColor` のみ参照）。
 */
export function renderPreExplosion(
  ctx: CanvasRenderingContext2D,
  _L: Layout,
  innerPoly: Vec2[],
  state: AppState,
): void {
  if (innerPoly.length < 3) return;
  const first = innerPoly[0];
  if (!first) return;

  ctx.fillStyle = state.surfaceColor;
  ctx.beginPath();
  ctx.moveTo(first[0], first[1]);
  for (let i = 1; i < innerPoly.length; i++) {
    const p = innerPoly[i];
    if (!p) continue;
    ctx.lineTo(p[0], p[1]);
  }
  ctx.closePath();
  ctx.fill();
}
