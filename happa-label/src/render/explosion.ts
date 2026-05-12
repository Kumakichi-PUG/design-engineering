/**
 * Phase: explosion（progress > 0、happa-label v0.1）。
 *
 * spec §4.2 / §4.4 / §9 に従い、Unified Path2D で全 cell を結合して
 * `state.surfaceColor` で 1 回 fill する。AA シームを排除する D-15 の実装
 * （spec §4.4）。
 *
 * **描画順**（spec §4.2 progress>0 case）:
 *
 * 1. innerPoly を `state.innerColor` でベタ塗り（背後の Inner 色）。
 * 2. innerPoly で clip を張る。
 * 3. `p = easeOutExpo(progress)` を計算。
 * 4. 各 cell の vertices を以下で displaced polygon に変換:
 *    a. `cell.centroid` 基準で `cell.rot × p` rad 回転
 *    b. `(cell.vx × p, cell.vy × p)` 平行移動
 * 5. 全 displaced polygon を 1 本の Path2D に moveTo/lineTo/closePath で結合し、
 *    `state.surfaceColor` で 1 回 fill（Unified Path2D / D-15）。
 *
 * **parent v1.1 / Phase 0 コピー版からの差分**:
 * - silhouette / composite 引数を削除（warped silhouette / overlay PNG 合成は
 *   happa-label に持ち込まない、禁忌 §3 / §5）
 * - clip 対象を silhouette ではなく innerPoly に変更（spec §4.2）
 * - per-fragment composite 描画パスを削除（overlay は別レイヤーで静止描画、
 *   spec §4.6）
 * - 回転倍率 `cell.rot × p × 0.25` の 0.25 抑制係数を撤去（spec §4.4 の
 *   そのままの式 `cell.rot × p`）
 * - Inner 色のベタ塗りを本関数内に取り込む（spec §4.2 progress>0 case の
 *   step 1）。parent では `renderer.ts` が担当していたが、happa-label では
 *   `render/index.ts` の dispatcher は薄く保ち本関数が一括で塗る
 *
 * 設計参照: `docs/happa-label-spec.md` §4.2 / §4.4 / §9。
 */

import { easeOutExpo } from '../core/easing';
import type { Cell, Layout, Scene, Vec2 } from '../core/types';
import type { AppState } from '../state';

/**
 * `cell.points` の各頂点を `cell.centroid` 周りで `angle` rad 回転する helper。
 *
 * `transformPoly` 内で displacement を加える前段の回転に使う。pure。
 */
function rotateAround(point: Vec2, center: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point[0] - center[0];
  const dy = point[1] - center[1];
  return [center[0] + dx * cos - dy * sin, center[1] + dx * sin + dy * cos];
}

/**
 * `cell.points` を progress で変換する（spec §4.4 + §4.5）。
 *
 * 変換:
 * - `p = easeOutExpo(progress)`
 * - 各頂点を `cell.centroid` 基準で `cell.rot × p` rad 回転
 * - 続いて `[cell.vx × p, cell.vy × p]` で平行移動
 *
 * pure。同一 (cell, progress) で常に同じ出力。
 */
function transformPoly(cell: Cell, progress: number): Vec2[] {
  const p = easeOutExpo(progress);
  const angle = cell.rot * p;
  const ox = cell.vx * p;
  const oy = cell.vy * p;
  return cell.points.map((v) => {
    const [rx, ry] = rotateAround(v, cell.centroid, angle);
    return [rx + ox, ry + oy] as Vec2;
  });
}

/**
 * polygon の頂点列を `Path2D` に moveTo/lineTo/closePath で積む（pure helper）。
 *
 * 頂点が 3 未満の場合は追加しない（退化入力の安全側）。`closePath` を自動で呼ぶ。
 */
function addPolyToPath(path: Path2D, poly: Vec2[]): void {
  if (poly.length < 3) return;
  const first = poly[0];
  if (!first) return;
  path.moveTo(first[0], first[1]);
  for (let i = 1; i < poly.length; i++) {
    const p = poly[i];
    if (!p) continue;
    path.lineTo(p[0], p[1]);
  }
  path.closePath();
}

/**
 * `ctx` 側に polygon を経路として積む（moveTo → lineTo → closePath）。
 *
 * `ctx.beginPath()` は呼び出し側の責任。頂点不足（< 3）は無視。
 */
function tracePolyOnCtx(ctx: CanvasRenderingContext2D, poly: Vec2[]): void {
  if (poly.length < 3) return;
  const first = poly[0];
  if (!first) return;
  ctx.moveTo(first[0], first[1]);
  for (let i = 1; i < poly.length; i++) {
    const p = poly[i];
    if (!p) continue;
    ctx.lineTo(p[0], p[1]);
  }
  ctx.closePath();
}

/**
 * 爆発進行中シーン（progress > 0）を 1 フレーム描画する（spec §4.2 progress>0 case）。
 *
 * 呼び出し条件: `state.progress > 0`。0 の場合は `renderPreExplosion` を呼ぶ。
 * `ctx` のサイズは呼び出し側で `Layout.outerW/H` に同期済みである前提。
 *
 * @param ctx   描画先の 2D コンテキスト。
 * @param _L    現在の Layout（本関数では未参照、API 一貫性のため受ける）。
 * @param scene `buildScene` の結果（`innerPoly` + `cells`）。
 * @param state 現在の AppState（`progress` / `innerColor` / `surfaceColor`）。
 */
export function renderExplosion(
  ctx: CanvasRenderingContext2D,
  _L: Layout,
  scene: Scene,
  state: AppState,
): void {
  if (scene.innerPoly.length < 3) return;

  // ── 1. innerPoly を innerColor でベタ塗り（spec §4.2 step 1）──
  ctx.fillStyle = state.innerColor;
  ctx.beginPath();
  tracePolyOnCtx(ctx, scene.innerPoly);
  ctx.fill();

  // ── 2. innerPoly で clip（spec §4.2 step 2）──────────────
  ctx.save();
  ctx.beginPath();
  tracePolyOnCtx(ctx, scene.innerPoly);
  ctx.clip();

  // ── 3-5. Unified Path2D（spec §4.4 / D-15）─────────────
  // 全 cell を progress で displaced polygon に変換し、1 本の Path2D に
  // 結合してから `ctx.fill(surfacePath)` を 1 回呼ぶ。これにより破片間の
  // 共有エッジで AA の白いシームが発生しない。
  const surfacePath = new Path2D();
  for (const cell of scene.cells) {
    const displaced = transformPoly(cell, state.progress);
    addPolyToPath(surfacePath, displaced);
  }
  ctx.fillStyle = state.surfaceColor;
  ctx.fill(surfacePath);

  ctx.restore();
}
