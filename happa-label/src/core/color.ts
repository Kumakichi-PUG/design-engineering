/**
 * OKLCH ⇔ HEX 変換と補色ペア生成ユーティリティ。
 *
 * 知覚均等色空間である OKLCH 上で補色（色相 +180 度）を計算することで、
 * RGB / HSL ベースの素朴な補色計算で生じる「明度の知覚ズレ」を避ける。
 * そのため本モジュールでは `culori` の OKLCH 実装を採用する。
 *
 * 設計参照:
 * - 設計書 §5.6「カラーシステム / 補色ペア生成ロジック」
 * - Phase B（色システム拡張）で追加
 */

import { clampChroma, converter, formatHex } from 'culori';

/** sRGB ガマット外などで HEX 化できなかった場合のフォールバック（純黒）。 */
const HEX_FALLBACK = '#000000';

/** 明度ラウンド用の高い方のレンジ（`0.75..0.92`）。 */
const L_HIGH_MIN = 0.75;
const L_HIGH_MAX = 0.92;

/** 明度ラウンド用の低い方のレンジ（`0.18..0.40`）。 */
const L_LOW_MIN = 0.18;
const L_LOW_MAX = 0.4;

/** 彩度レンジ（両色共通、`0.08..0.20`）。控えめな彩度でブランド調を維持。 */
const C_MIN = 0.08;
const C_MAX = 0.2;

/** 補色側色相に与える ±15 度の揺らぎ幅。 */
const HUE_JITTER_DEG = 30;

/** OKLCH → Rgb/Oklch 変換用コンバータ（`culori` 推奨のインスタンス化パターン）。 */
const toOklch = converter('oklch');

/**
 * 与えた範囲 `[min, max)` 内の一様乱数を `rng` から引く小ヘルパ。
 *
 * @param rng 0..1 を返す乱数関数。
 * @param min 下限（含む）。
 * @param max 上限（含まない）。
 * @returns `[min, max)` の float。
 */
function sample(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/**
 * OKLCH 値から sRGB ガマット内に収まる HEX 文字列を生成する内部ヘルパ。
 *
 * OKLCH は P3 以上の広色域を表現できるため、`formatHex` を直接呼ぶと
 * ガマット外で `undefined` が返りうる。`clampChroma` で chroma を詰めて
 * sRGB に収めることで HEX 化の成功率を高める。それでも失敗した場合は
 * `HEX_FALLBACK`（純黒）にフォールバックする。
 *
 * @param l 明度 0..1。
 * @param c 彩度 0..∞（OKLCH では 0.4 程度で十分鮮やか）。
 * @param h 色相 0..360 度。
 * @returns `#rrggbb` 形式の HEX 文字列。
 */
function oklchToHexSafe(l: number, c: number, h: number): string {
  const clamped = clampChroma({ mode: 'oklch', l, c, h }, 'oklch');
  const hex = formatHex(clamped);
  return hex ?? HEX_FALLBACK;
}

/**
 * HEX カラー文字列（`#ff3300` 等）を OKLCH に変換する。
 *
 * 彩度 0 のグレー色では OKLCH の色相が定義できないため `culori` は
 * `h` を `undefined` で返す。本関数は下流の扱いを単純化するため
 * その場合 `h = 0` を返す（spec §5.6 で色相を引き継ぐ必要はない前提）。
 *
 * @param hex `#rgb` / `#rrggbb` / `#rrggbbaa` 等、`culori` が解釈できる HEX 表記。
 * @returns `{ l: 0..1, c: 0..~0.4, h: 0..360 }` 形式の OKLCH 値。
 */
export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const oklch = toOklch(hex);
  if (oklch === undefined) {
    // `culori` は未知の文字列に対して `undefined` を返す。呼び出し側のバグなので明示的に失敗させる。
    throw new Error(`hexToOklch: invalid color string: ${hex}`);
  }
  return {
    l: oklch.l,
    c: oklch.c,
    h: oklch.h ?? 0,
  };
}

/**
 * OKLCH 値から HEX カラー文字列を生成する。
 *
 * sRGB ガマット外の OKLCH は `clampChroma` により彩度を詰めて sRGB に射影する。
 * それでも HEX 化できない異常系では `#000000` にフォールバックする。
 *
 * @param l 明度 0..1。
 * @param c 彩度（OKLCH）。負値や過大値はクランプされる。
 * @param h 色相（度、0..360）。範囲外でも `culori` 側で正規化される。
 * @returns `#rrggbb` 形式の HEX 文字列。
 */
export function oklchToHex(l: number, c: number, h: number): string {
  return oklchToHexSafe(l, c, h);
}

/**
 * 補色ペア（Surface / Inner の 2 色）をランダム生成する。spec §5.6 準拠。
 *
 * アルゴリズム:
 * 1. 色相 H1 を 0..360 から一様ランダム選択、補色 H2 = H1 + 180 ± 15 度のジッタ
 * 2. 明度は一方を高（0.75..0.92）、もう一方を低（0.18..0.40）からランダム。
 *    どちらが Surface / Inner かは 50/50 でランダム決定
 * 3. 彩度は両色とも 0.08..0.20 から独立にランダム
 *
 * Text 色は含めない（ユーザ指示どおり）。
 *
 * @param rng 0..1 の乱数関数。省略時は `Math.random`。
 *            渡せば決定論的に動作するため、シード再現テスト・エクスポート再現に利用可。
 * @returns `{ surface, inner }` の HEX ペア（`#rrggbb`）。
 */
export function randomComplementaryPair(rng: () => number = Math.random): {
  surface: string;
  inner: string;
} {
  // 1. 色相ペア
  const h1 = rng() * 360;
  const hueJitter = (rng() - 0.5) * HUE_JITTER_DEG;
  const h2 = h1 + 180 + hueJitter;

  // 2. 明度ペア（高/低）と Surface/Inner の割り当て
  const lHigh = sample(rng, L_HIGH_MIN, L_HIGH_MAX);
  const lLow = sample(rng, L_LOW_MIN, L_LOW_MAX);
  const surfaceIsHigh = rng() < 0.5;

  // 3. 彩度（両色独立）
  const cA = sample(rng, C_MIN, C_MAX);
  const cB = sample(rng, C_MIN, C_MAX);

  // 明度を Surface / Inner に割り当てたうえで、色相ペア (h1, h2) を対応づける。
  // どちら側に h1 を振っても補色関係は保たれるため、シンプルに surface = h1 側で固定する。
  const surfaceL = surfaceIsHigh ? lHigh : lLow;
  const innerL = surfaceIsHigh ? lLow : lHigh;

  return {
    surface: oklchToHexSafe(surfaceL, cA, h1),
    inner: oklchToHexSafe(innerL, cB, h2),
  };
}
