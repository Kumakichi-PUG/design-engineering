/**
 * イージング関数群（happa v1.1）。
 *
 * 進行度 `progress ∈ [0, 1]` を変位量（displacement ∈ [0, 1]）に写像する
 * 単段 easing を提供する。v1.0 の二相モデル（intact → burst）は v1.1 で
 * 単相モデル（easeOutExpo）に置換された（spec §3.3 / §A.3、wireframe v0.10
 * `easeOutExpo` と挙動一致）。
 *
 * 設計参照:
 * - spec §3.3（二相レンダリングモデル・進行度カーブ）
 * - spec §A.3（easeOutExpo 進捗テーブル）
 * - wireframe `wireframes/v0.10/wireframe.html` L365 `easeOutExpo`
 *
 * 本モジュールは pure。DOM / Canvas / 状態を参照しない。
 */

/**
 * easeOutExpo: 指数的減速カーブ。
 *
 * 数式: `t === 1 ? 1 : 1 - 2^(-10 × t)`
 *
 * 開始直後に大きく立ち上がり、終端に向けて漸近的に 1 へ近づく。happa v1.1
 * では `progress` をそのまま本関数に通した値が全セルの変位スカラーとなる
 * （spec §3.3）。爆破演出のスローモーション感はこのカーブの選定に依存。
 *
 * 進捗の基準値（spec §A.3 抜粋）:
 * - t = 0.00 → 0.000
 * - t = 0.15 → 0.646
 * - t = 0.30 → 0.875
 * - t = 0.50 → 0.969
 * - t = 1.00 → 1.000
 *
 * `t === 1` の明示的分岐は `2^(-10)` の丸め誤差（約 9.77e-4）を排して
 * 完全に 1 を返すためで、spec §A.3 の末尾値と一致させる。
 *
 * @param t 正規化進行度（0..1 を想定）。範囲外でも計算は通るが未サポート。
 * @returns イージング後の値（t=0 で 0、t=1 で 1）。
 */
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - 2 ** (-10 * t);
}

/**
 * easeOutQuart: `1 - (1 - t)^4`。
 *
 * v1.0 の burst 変位カーブ（旧設計書 7.5）。v1.1 では `easeOutExpo` に
 * 置換された（spec §3.3）。現時点では v1.0 系の renderer / phase 関数
 * （`@ts-nocheck` 付き）が参照する可能性があるため残置する。Phase A
 * 完了後、v1.0 phase 関数の削除と同時に撤去を検討する。
 *
 * @param t 正規化進行度。0..1 の範囲を想定。
 * @returns イージング後の値（t=0 で 0、t=1 で 1）。
 */
export const easeOutQuart = (t: number): number => 1 - (1 - t) ** 4;
