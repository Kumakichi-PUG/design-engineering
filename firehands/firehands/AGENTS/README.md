# AGENTS — 並列開発ガイド

> このディレクトリは、Claude Code Agent Teams が並列に開発を進めるための指示書集です。

## 全エージェント共通の前提

1. **必ず最初に読むもの**：
   - `../REQUIREMENTS.md` — 全機能要件 (v0.3)
   - `../CLAUDE.md` — プロジェクトコンテキストと絶対原則
   - 自分の `TRACK_*.md`

2. **判断基準の優先順位**：
   1. 安全性・著作権など基本ルール
   2. アートディレクター（大川）の意図 → REQUIREMENTS.md に明記された意図
   3. パフォーマンス（60fps）
   4. 美しさ
   5. コード品質・保守性

3. **不明点の処理**：
   - REQUIREMENTS.md を再読
   - それでも不明なら、**コミットメッセージ or PR説明に「判断ポイント」として明記**して進める
   - ブロッカー級の不明点のみ、人間に確認

4. **コミット規約**：
   - Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`, `style:`)
   - 例：`feat(flame): implement SDF morphing in fragment shader`

5. **TypeScript規約**：
   - strict mode 必須
   - `any` 禁止（やむを得ない場合は `unknown` + type guard）
   - export は named export を基本に

6. **コミットの粒度**：
   - 小さく、頻繁に
   - 各コミットがビルド可能な状態を保つ

---

## トラック一覧と担当範囲

| Track | ファイル | 担当 |
|-------|---------|------|
| A | `TRACK_A_foundation.md` | プロジェクト初期化、Zustand骨格、レイアウト |
| B | `TRACK_B_flame_core.md` | InstancedMesh炎、Curl Noise、1/fゆらぎ、SDF補間モーフィング |
| C | `TRACK_C_hand_sdf.md` | MediaPipe、SDF生成（EDT）、アトラス、永続化、Ghost |
| D | `TRACK_D_color_gui.md` | OKLCH配色、leva統合 |
| E | `TRACK_E_export_display.md` | 録画、スクショ、フルスクリーン |
| F | `TRACK_F_polish.md` | Bloom、grain、最終チューニング、デモ動画 |

---

## トラック間依存

```
A (Foundation)
    ├── B (Flame Core)
    │       └── F (Polish)
    ├── C (Hand & SDF) ──→ B (Flame Core) [SDFアトラスを供給]
    ├── D (Color & GUI) ──→ B [配色uniform供給]
    └── E (Export & Display)
```

依存先のスケルトン（インターフェイスだけ実装、中身は空）が先にmainにmergeされていれば、各Trackは並列に進められます。

---

## Phase進行

REQUIREMENTS.md §12 の Phase 順に注意：

1. **Phase 1 (MVP)** — Track A + B の最小構成、Curl Noise のみ、固定パレット
2. **Phase 2 (Motion & Color)** — 1/fゆらぎ、2レイヤー描画、Track D
3. **Phase 3 (SDF Morphing)** — Track B + C の核心
4. **Phase 4 (Hand Interaction)** — Track C の MediaPipe + Ghost
5. **Phase 5 (Output)** — Track E
6. **Phase 6 (Polish)** — Track F

各Phaseの完了で動作確認 → 次へ。

---

## PR時のチェックリスト

- [ ] 該当する Definition of Done 項目（REQUIREMENTS.md §11）にチェック
- [ ] 動作スクショ or 動画（モーフィング系は **必ず動画**）を添付
- [ ] `pnpm lint && pnpm test && pnpm build` がパスする
- [ ] FPS計測値（少なくとも自分のマシンで何fps出ているか）を記載
- [ ] 他Trackへの影響がある場合、明記

---

## 共有用語集

| 用語 | 意味 |
|------|------|
| **Fill / 図** | 手のシルエットの塗りつぶしレイヤー |
| **Contour / 輪郭図** | 手のアウトライン線レイヤー |
| **Pose Morphing** | SDF補間による「指がゆっくり動く」効果 |
| **1/fゆらぎ** | Voss-McCartney法で生成する自然なゆらぎ |
| **OKLCH** | 知覚的に均一な色空間。配色の基底 |
| **Ghost Layer** | 登録された手の残像が背景に漂う層 |
| **Ember** | 火の粉、Ref-1スタイルの直線シャード |
| **Atlas** | SDFテクスチャを束ねた1枚の大きなテクスチャ |
| **EDT** | Euclidean Distance Transform、SDF生成アルゴリズム |
