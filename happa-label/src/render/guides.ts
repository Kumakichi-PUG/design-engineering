/**
 * 補助ガイド描画（happa-label v0.1）— Phase A render-agent stub。
 *
 * spec §6.1 / 8 の Guides セクションに従い、innerPoly と cell edges を
 * オーバーレイ表示するためのモジュール。Phase A で実装する。
 *
 * parent v1.1 にあった text path guide は持ち込まない（禁忌 §2）。
 */

import type { Scene } from '../core/types';
import type { AppState } from '../state';

/**
 * innerPoly / cell edges のガイドを Canvas に描画する（Phase A 実装予定）。
 *
 * @param _ctx 描画コンテキスト。
 * @param _scene 現フレームの Scene。
 * @param _state UI トグル（showHull / showCells）を含む AppState。
 */
export function drawGuides(_ctx: CanvasRenderingContext2D, _scene: Scene, _state: AppState): void {
  // Phase A render-agent で実装。
}
