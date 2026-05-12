/**
 * Render パイプラインのバレル + 最上位 dispatcher（happa-label v0.1、spec §9）。
 *
 * `render(ctx, state)` は呼び出し側（`main.ts`）から 1 フレーム描画の
 * エントリポイントとして使う。`computeLayout` は canvas サイズ計算で
 * `main.ts` も直接利用する。
 *
 * **責務範囲**:
 * - `computeLayout(state)` で `Layout` を算出
 * - `ctx.clearRect(0, 0, outerW, outerH)` で前フレームをクリア
 * - `buildScene(L, state)` で幾何を構築
 * - `progress === 0` で `renderPreExplosion`、`> 0` で `renderExplosion` に分岐
 * - `state.showOverlay && state.overlayDataUrl` のとき `drawOverlay` を呼ぶ
 *   （二相とも静止描画、spec §4.6 / §6.4）
 * - `drawGuides` は Phase 0 stub のまま no-op
 *
 * **本関数は canvas サイズを変更しない**: `main.ts` 側で
 * `canvas.width/height = L.outerW/H` を同期する責務がある（spec §9 の
 * `fitCanvas` 相当は `main.ts` が担当）。
 *
 * 設計参照: `docs/happa-label-spec.md` §9。
 */

import type { AppState } from '../state';
import { renderExplosion } from './explosion';
import { drawGuides } from './guides';
import { computeLayout } from './layout';
import { drawOverlay, getOverlayImage } from './overlay';
import { renderPreExplosion } from './preExplosion';
import { buildScene } from './scene';

export { computeLayout } from './layout';
export { buildScene } from './scene';

/**
 * 1 フレーム描画する最上位 dispatcher（spec §9）。
 *
 * - `state.progress === 0` → `renderPreExplosion`（innerPoly をソリッド塗り）
 * - `state.progress > 0`   → `renderExplosion`（Inner 色 → clip → Unified Path2D）
 * - その後、`state.showOverlay && state.overlayDataUrl` なら `drawOverlay`
 *   で画像を innerPoly clip 内に静止描画（spec §4.6 / §6.4）
 * - 最後に `drawGuides` を重ねる（guides は最前面）
 *
 * Overlay 画像は `getOverlayImage(dataUrl)` で同期取得する。未キャッシュ
 * （UI が `ensureOverlayImage` 未完了）なら描画をスキップする。
 *
 * @param ctx   描画先の 2D コンテキスト。サイズは呼び出し側で同期済み前提。
 * @param state 現在の AppState。
 */
export function render(ctx: CanvasRenderingContext2D, state: AppState): void {
  const L = computeLayout(state);
  ctx.clearRect(0, 0, L.outerW, L.outerH);
  const scene = buildScene(L, state);

  if (state.progress === 0) {
    renderPreExplosion(ctx, L, scene.innerPoly, state);
  } else {
    renderExplosion(ctx, L, scene, state);
  }

  // Overlay は二相のどちらでも、guides の手前に最後に重ねる（spec §4.6 静止描画）。
  if (state.showOverlay && state.overlayDataUrl) {
    const img = getOverlayImage(state.overlayDataUrl);
    if (img) drawOverlay(ctx, L, scene.innerPoly, img);
  }

  drawGuides(ctx, scene, state);
}
