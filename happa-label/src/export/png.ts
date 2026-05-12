/**
 * PNG 書き出し（happa-label v0.1、spec §5.3 FR-L01 / §6.6 / §A.1）。
 *
 * オフスクリーン `<canvas>` を `L.outerW × scale` で生成し、`ctx.scale(scale, scale)`
 * を掛けた状態で通常の `render(ctx, state)` を再実行する。これにより、画面表示用
 * canvas の clip / save / restore 状態に干渉せず、所望の倍率で 1 フレームを
 * ベクター品質に近い解像度で書き出す（spec §6.6）。
 *
 * Overlay が ON のときは `ensureOverlayImage` を await して画像のデコードを
 * 完了させてから render する。これにより「PNG にだけ Overlay が抜ける」事故を
 * 避ける。
 *
 * ファイル名は kickoff §5.4 の規約 `happa-label_<unix-ms>_x<scale>.png`。
 *
 * 設計参照: `docs/happa-label-spec.md` §5.3 / §6.6 / §A.1。
 */

import { computeLayout, render } from '../render';
import { ensureOverlayImage } from '../render/overlay';
import type { AppState, PngScale } from '../state';

/**
 * 現フレームをオフスクリーン canvas に再描画して PNG としてダウンロードさせる。
 *
 * `state.showOverlay && state.overlayDataUrl` のときは `ensureOverlayImage` を
 * 先に await し、Overlay 画像が PNG に確実に含まれるようにする（spec §6.4）。
 *
 * `toBlob` を `Promise` でラップしているため `await` 可能。失敗系（CORS 汚染等）は
 * happa-label の用途では発生しないが、保険として reject させる。
 *
 * @param state 現在の AppState。
 * @param scale 出力倍率（×1 / ×2 / ×4、spec §A.1 のデフォルトは ×1）。
 */
export async function exportPNG(state: AppState, scale: PngScale): Promise<void> {
  // Overlay 画像を事前にデコード（render 内の getOverlayImage が同期取得できるようにする）。
  if (state.showOverlay && state.overlayDataUrl) {
    try {
      await ensureOverlayImage(state.overlayDataUrl);
    } catch (err) {
      // 壊れた dataUrl の場合はログだけ残し、Overlay 抜きで書き出しを続行する。
      console.warn('[export/png] overlay preload failed; exporting without overlay:', err);
    }
  }

  const L = computeLayout(state);
  const canvas = document.createElement('canvas');
  canvas.width = L.outerW * scale;
  canvas.height = L.outerH * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('[export/png] failed to acquire 2D context');
  }
  ctx.scale(scale, scale);

  // `render` は内部で `clearRect(0, 0, L.outerW, L.outerH)` を呼ぶ。
  // `ctx.scale` 後の論理座標系で動くため、そのまま Layout 座標で描画される。
  render(ctx, state);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });
  if (!blob) {
    throw new Error('[export/png] canvas.toBlob returned null');
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `happa-label_${Date.now()}_x${scale}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 一部ブラウザは click 直後の revoke でダウンロードがキャンセルされるので、
  // 次フレームまで待ってから解放する。
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}
