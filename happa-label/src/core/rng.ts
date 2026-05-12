/**
 * 決定論的擬似乱数ジェネレータ — mulberry32 実装。
 *
 * 設計書 NFR-06「同 seed + 同設定 → 同結果」を満たすために、
 * `Math.random` ではなく seed 指定可能な決定論的 RNG を採用する。
 * mulberry32 は 32bit 整数状態の軽量 PRNG で、以下の理由から選定:
 *
 * - 実装が極小（1 関数・依存ゼロ）で `core` の「外部依存ゼロ」原則に合う
 * - 統計的品質が十分（本用途は美的揺らぎであり暗号強度は不要）
 * - プロトタイプ `docs/prototype.html` の実装と完全一致（appendix A.6
 *   「挙動・ビジュアル表現は完全に同一」）
 *
 * 設計参照:
 * - 設計書 NFR-06 / セクション 6.1（`AppState.seed: 0..1`）
 * - プロトタイプ: `docs/prototype.html` L479–486 `mulberry32`
 */

/**
 * seed 値から決定論的な 0..1 乱数関数を生成する。
 *
 * `AppState.seed` は 0..1 の float だが、mulberry32 の内部状態は
 * 32bit 整数で扱うため、`seed * 1e9` を `Math.floor` したものを初期値
 * とする（プロトタイプと同じ変換）。`2^32` ではなく `1e9` を採用しているのは
 * プロトタイプ挙動の完全一致を優先するため。
 *
 * @param seed 初期シード（0..1 の float を想定）。
 *             範囲外でも動作はするがプロトタイプとの互換は保証しない。
 * @returns 呼び出すたびに 0（含む）..1（含まない）の float を返す関数。
 */
export function createRng(seed: number): () => number {
  let a = Math.floor(seed * 1e9);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
