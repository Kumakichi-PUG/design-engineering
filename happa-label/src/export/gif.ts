/**
 * GIF 書き出し（happa-label v0.1、spec §5.3 FR-L03 / §A.1 / §11 OQ-L1）。
 *
 * 30fps × 3 秒 = 90 frames、最大辺 900px 以下にダウンサンプル、ループ再生。
 * Overlay は `render()` が静止描画するため、GIF でも位置・スケールが
 * フレーム間で変化しない（AGENTS.md 禁忌 §5）。
 *
 * エンコーダは `gifenc` v1.0.3（純粋 JS の GIF89a エンコーダ）を使う。
 * フレームごとに `quantize(rgba, 256)` でローカルパレットを生成し、
 * `applyPalette` でインデックス化して `writeFrame` する。global palette
 * を共有する手もあるが、爆破の色変化を保つために per-frame で量子化する。
 *
 * **動作の重要な不変条件**: 本関数はグローバルストアの `state.progress` を
 * 書き換えない。フレームごとに `{ ...state, progress }` の一時 `AppState`
 * を生成して `render(ctx, frameState)` に渡す。UI のスライダー位置は
 * エクスポート後もユーザーが最後に置いた値のまま。
 *
 * 二重起動防止: モジュールローカルの `inFlight` フラグで連打を弾く。
 * UI 側でもボタンを disable するが、保険として encoder 側にもガードを置く。
 *
 * ファイル名は kickoff §5.4 の規約 `happa-label_<unix-ms>.gif`。
 *
 * 設計参照: `docs/happa-label-spec.md` §5.3 / §A.1 / §11 OQ-L1 / OQ-L4、
 * `AGENTS.md` §6 禁忌（Overlay 静止）。
 */

import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import { computeLayout, render } from '../render';
import { ensureOverlayImage } from '../render/overlay';
import type { AppState } from '../state';

/** FR-L03: 30fps × 3 秒。 */
const TOTAL_FRAMES = 90;
/** FR-L03: GIF の最大辺。 */
const MAX_EDGE = 900;
/** 1 フレームの遅延（ms）。gifenc が内部で 1/100s に丸める。 */
const FRAME_DELAY_MS = 1000 / 30;

/** 連打防止用のモジュールローカル排他フラグ。 */
let inFlight = false;

/**
 * 現在の AppState を起点に 90 フレームの GIF をエンコードし、ダウンロードを
 * トリガする。
 *
 * - 出力サイズは `min(1, 900 / max(outerW, outerH))` でダウンスケール。
 *   元が 900px 以下なら scale = 1（拡大はしない）。
 * - Overlay 有効時は `ensureOverlayImage` を await して画像を decode 済みに
 *   してから描画ループへ入る（render は同期 `getOverlayImage` を見る）。
 * - 既に別の export が走っている間は早期 return する（UI ボタンの disable
 *   と二重で守る）。
 *
 * @param state 現在の AppState（snapshot）。
 */
export async function exportGIF(state: AppState): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    // Overlay 画像を事前にデコード（render 内の getOverlayImage が同期取得できるようにする）。
    if (state.showOverlay && state.overlayDataUrl) {
      try {
        await ensureOverlayImage(state.overlayDataUrl);
      } catch (err) {
        console.warn('[export/gif] overlay preload failed; exporting without overlay:', err);
      }
    }

    const L = computeLayout(state);
    const maxEdge = Math.max(L.outerW, L.outerH);
    const scale = Math.min(1, MAX_EDGE / maxEdge);
    const renderW = Math.round(L.outerW * scale);
    const renderH = Math.round(L.outerH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = renderW;
    canvas.height = renderH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('[export/gif] failed to acquire 2D context');
    }
    // `ctx.scale` 後の論理座標系で動くため、Layout 座標のまま render できる。
    ctx.scale(scale, scale);

    const gif = GIFEncoder();
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const progress = i / (TOTAL_FRAMES - 1);
      // グローバルストアは触らない — 一時 AppState を生成して渡す（禁忌 §6 / spec §11 OQ-L4）。
      const frameState: AppState = { ...state, progress };
      render(ctx, frameState);
      const { data } = ctx.getImageData(0, 0, renderW, renderH);
      // gifenc は per-frame ローカルパレットで爆破の色変化を保てる。global palette
      // の方が高速だが、Surface/Inner の対比がボヤけるため per-frame を選ぶ。
      const palette = quantize(data, 256);
      const index = applyPalette(data, palette);
      gif.writeFrame(index, renderW, renderH, { palette, delay: FRAME_DELAY_MS });
    }
    gif.finish();

    // `gif.bytes()` returns `Uint8Array<ArrayBufferLike>` per gifenc's runtime,
    // but our DOM lib's `Blob` constructor requires `Uint8Array<ArrayBuffer>`
    // (it rejects `SharedArrayBuffer`-backed buffers). Copy into a fresh
    // `Uint8Array` so the buffer is unambiguously a non-shared `ArrayBuffer`.
    const bytes = new Uint8Array(gif.bytes());
    const blob = new Blob([bytes], { type: 'image/gif' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `happa-label_${Date.now()}.gif`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // PNG export と同様、一部ブラウザは click 直後の revoke でキャンセルされる。
    requestAnimationFrame(() => URL.revokeObjectURL(url));
  } finally {
    inFlight = false;
  }
}
