/**
 * Layout 計算（happa-label v0.1、spec §3）。
 *
 * `AppState.aspectRatio` / `gutterPct` / `bleedMult` から物理キャンバスの
 * 入れ子構造（outer / inner）を算出する。spec §3:
 *
 * ```
 * innerShort = min(innerW, innerH)
 * gutter     = innerShort × gutterPct / 100
 * bleed      = gutter × bleedMult
 * pad        = gutter + bleed
 * outerW     = innerW + 2 × pad
 * outerH     = innerH + 2 × pad
 * innerX0/Y0 = pad / pad
 * innerX1/Y1 = pad + innerW / pad + innerH
 * ```
 *
 * Aspect ratio プリセットの基準サイズ（spec §A.1 暗黙ルール、portrait/square は
 * 短辺を 1080、16:9 の long side は 1920 とする）:
 *
 * | aspect | innerW × innerH |
 * | ------ | --------------- |
 * | 1:1    | 1080 × 1080     |
 * | 16:9   | 1920 × 1080     |
 * | 9:16   | 1080 × 1920     |
 * | 4:3    | 1440 × 1080     |
 *
 * 純関数。DOM / Canvas / 状態を参照しない。
 *
 * 設計参照: `docs/happa-label-spec.md` §3 / §A.1。
 */

import type { Layout } from '../core/types';
import type { AppState } from '../state';

/**
 * Aspect ratio プリセット → `[innerW, innerH]` 基準サイズ表。
 *
 * portrait / square は短辺を 1080、16:9 は long side を 1920 で固定する。
 * これは v1.1 の挙動と一致し、`outerW/H` は pad を追加した最終書き出しサイズに
 * 一致するため、`png ×4` でも 4320 を超える程度に収まる（spec OQ-L2）。
 */
function presetInnerSize(aspectRatio: AspectRatio): [number, number] {
  switch (aspectRatio) {
    case '1:1':
      return [1080, 1080];
    case '16:9':
      return [1920, 1080];
    case '9:16':
      return [1080, 1920];
    case '4:3':
      return [1440, 1080];
  }
}

/** `presetInnerSize` の引数型エイリアス（store からの再 import を避ける）。 */
type AspectRatio = AppState['aspectRatio'];

/**
 * `AppState` から `Layout` を算出する。spec §3。
 *
 * - `innerShort = min(innerW, innerH)` を基準長として `gutter` / `bleed` を計算
 * - `pad = gutter + bleed` を四辺均等に外周へ加える
 * - `outerW/H = innerW/H + 2 × pad`（= 書き出し範囲、spec DL-2 / D-11）
 * - `innerX0/Y0 = pad`、`innerX1/Y1 = pad + innerW/H` で inner の矩形位置を返す
 *
 * @param state 現在の AppState（`aspectRatio` / `gutterPct` / `bleedMult` のみ参照）。
 * @returns 上記計算済みの `Layout`。
 */
export function computeLayout(state: AppState): Layout {
  const [innerW, innerH] = presetInnerSize(state.aspectRatio);
  const innerShort = Math.min(innerW, innerH);
  const gutter = (innerShort * state.gutterPct) / 100;
  const bleed = gutter * state.bleedMult;
  const pad = gutter + bleed;
  const outerW = innerW + 2 * pad;
  const outerH = innerH + 2 * pad;
  return {
    innerW,
    innerH,
    innerShort,
    gutter,
    bleed,
    pad,
    outerW,
    outerH,
    innerX0: pad,
    innerY0: pad,
    innerX1: pad + innerW,
    innerY1: pad + innerH,
  };
}
