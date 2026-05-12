/**
 * Overlay レイヤー描画 + 画像キャッシュ（happa-label v0.1、spec §4.6 / §6.4）。
 *
 * `drawOverlay` は innerPoly で clip した領域内に画像（PNG / 透過 PNG）を
 * **静止**描画する。爆破に追従しない（cell 単位 clip 廃止、AGENTS.md 禁忌 §5）。
 * 二相のいずれでも `state.showOverlay && state.overlayDataUrl` のときに
 * 最後に重ねる（spec §4.6, §9 パイプライン）。
 *
 * 画像キャッシュ（`ensureOverlayImage` / `getOverlayImage`）は dataUrl を
 * key に `HTMLImageElement` を保持し、フレーム間で同一インスタンスを返す。
 * 同じ Image 参照を `ctx.drawImage` に渡すことでブラウザのデコード結果を
 * 再利用し、毎フレームの decode を回避する（spec §9 / OQ-L3）。
 *
 * 設計参照: `docs/happa-label-spec.md` §4.6 / §6.4、`AGENTS.md` §6.5。
 */

import { polygonAABB } from '../core/polygon';
import type { Layout, Vec2 } from '../core/types';

/**
 * innerPoly クリップ内に画像を aspect 維持（contain）でフィット描画する。
 *
 * spec §6.4 の手順を忠実に実装:
 * 1. `ctx.save()` → innerPoly を `clip()` で領域指定
 * 2. innerPoly の AABB に対し、画像 aspect を保ったまま長辺を合わせる
 *    （`imgAspect > boxAspect` なら幅基準、それ以外は高さ基準）
 * 3. AABB 中央に centering して `drawImage`
 * 4. `ctx.restore()`
 *
 * **静止描画の不変条件** (spec §4.6, AGENTS.md 禁忌 §5):
 * 本関数は `state.progress` を参照しない。pre-explosion / explosion の
 * どちらの相でも同じ位置に描画され、爆破フレーム間で位置・スケールは
 * 変化しない。cell 単位 clip による Overlay 追従は明確に禁止。
 *
 * @param ctx       描画コンテキスト。
 * @param _L        現フレームのレイアウト（本関数では未使用だが、spec §6.4
 *                  の API シグネチャに合わせ、将来の outer 座標系拡張に備え受ける）。
 * @param innerPoly innerPoly の頂点列（pre-displacement、spec §6.0.2）。
 * @param image     描画する画像。`naturalWidth`/`naturalHeight` が必要。
 */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  _L: Layout,
  innerPoly: Vec2[],
  image: HTMLImageElement,
): void {
  if (innerPoly.length < 3) return;
  const first = innerPoly[0];
  if (!first) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(first[0], first[1]);
  for (let i = 1; i < innerPoly.length; i++) {
    const p = innerPoly[i];
    if (!p) continue;
    ctx.lineTo(p[0], p[1]);
  }
  ctx.closePath();
  ctx.clip();

  const [minX, minY, maxX, maxY] = polygonAABB(innerPoly);
  const w = maxX - minX;
  const h = maxY - minY;
  const imgAspect = image.naturalWidth / image.naturalHeight;
  const boxAspect = w / h;
  let dw: number;
  let dh: number;
  if (imgAspect > boxAspect) {
    dw = w;
    dh = w / imgAspect;
  } else {
    dh = h;
    dw = h * imgAspect;
  }
  const dx = minX + (w - dw) / 2;
  const dy = minY + (h - dh) / 2;
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.restore();
}

/**
 * Overlay 画像キャッシュ本体（dataUrl → 復号済み `HTMLImageElement`）。
 *
 * モジュールローカルに保持し、render dispatcher と UI で共有する。
 * localStorage への永続化は行わない（spec OQ-L3）。
 */
const cache = new Map<string, HTMLImageElement>();

/**
 * dataUrl から `HTMLImageElement` を生成し、デコード完了を待ってキャッシュする。
 *
 * 既に同 dataUrl がキャッシュ済みなら、その既存インスタンスを返す。
 * UI 側（`src/ui/overlayPicker.ts`）が画像選択時に await して
 * `state.overlayDataUrl` をセットする想定。
 *
 * @param dataUrl 画像の data URL（PNG / 透過 PNG）。
 * @returns デコード完了済みの `HTMLImageElement`。
 * @throws デコード失敗時（壊れた dataUrl 等）。
 */
export async function ensureOverlayImage(dataUrl: string): Promise<HTMLImageElement> {
  const cached = cache.get(dataUrl);
  if (cached) return cached;
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('overlay image failed to decode'));
  });
  cache.set(dataUrl, img);
  return img;
}

/**
 * dataUrl に対応するキャッシュ済み `HTMLImageElement` を同期取得する。
 *
 * render dispatcher（`src/render/index.ts`）が毎フレーム呼ぶ。未キャッシュ
 * なら `null`（UI が `ensureOverlayImage` を未呼び出し、または読み込み中）。
 *
 * @param dataUrl 画像の data URL。
 * @returns キャッシュ済みなら `HTMLImageElement`、未登録なら `null`。
 */
export function getOverlayImage(dataUrl: string): HTMLImageElement | null {
  return cache.get(dataUrl) ?? null;
}

/**
 * Overlay 画像キャッシュを全消去する（任意ユーティリティ）。
 *
 * 通常の "Clear" 操作は `state.overlayDataUrl = null` で十分（render は
 * `state.overlayDataUrl` を参照しないと描画しない）。本関数はメモリ解放
 * を明示したい場合の補助。
 */
export function clearOverlayImageCache(): void {
  cache.clear();
}
