# happa-label v0.1 — Claude Code Agent Teams 実装キックオフ

このドキュメントは Claude Code に投げる**最初の指示**です。
Agent Teams（`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`）前提で、並列実装を指示します。

`happa/happa-v1.1-kickoff.md`（v1.1 の同等ドキュメント）を踏襲しています。

---

## 0. 事前準備（ユーザー手元で済ませておく）

### 0.1 ディレクトリと主要ドキュメントの配置確認

```bash
cd ~/design-engineering

# 以下が存在することを確認
ls happa-label/AGENTS.md
ls happa-label/happa-label-kickoff.md      # 本ファイル
ls happa-label/docs/happa-label-spec.md    # 主仕様書

# parent repo (継承元) も存在確認
ls happa/docs/happa-designtool-v1.1-spec.md
ls happa/wireframes/v0.10/wireframe.html
ls happa/src/
```

### 0.2 Claude Code 起動

```bash
cd ~/design-engineering   # monorepo ルートで起動
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude
```

> Phase 0 で `pnpm install` と依存追加（`culori`, `d3-delaunay` を parent から踏襲）は Agent が実施するので、ユーザー側での事前 pnpm 作業は不要。

---

## 1. 初回プロンプト（Claude Code にそのまま貼る）

```text
happa-label v0.1 の実装を始めたい。

## ドキュメント
- `happa-label/AGENTS.md` を最初に読む（プロジェクト全体の前提・禁止事項・フロー）
- `happa-label/docs/happa-label-spec.md` が主仕様書（v0.1）。実装の根拠
- 継承元の参照:
  - `happa/docs/happa-designtool-v1.1-spec.md` (v1.1 spec 正本)
  - `happa/wireframes/v0.10/wireframe.html` (reference implementation)
  - `happa/src/` (継承元コード)
- `happa/AGENTS.md` と `happa/CLAUDE.md` は v1.1 開発時のもの。今回は無視

## 方針
主仕様書 §10.1 の Agent 責務マトリクスに従い、5 エージェント体制で実装する。
本プロジェクトは happa designtool v1.1 から **テキスト・混植・warped silhouette
を取り除き、純粋な造形マシン**として再構築するもの。Overlay は静止描画、
出力は PNG (×1/×2/×4) / SVG / GIF。

## 実装フロー
主仕様書 §10.2 と本キックオフドキュメントに従い、Phase 0 → A → B → C の順
で進める：

- Phase 0（準備）: 単一 agent で実行。ディレクトリ雛形、技術スタック設定の
  parent からのコピー、継承モジュールのコピー、不要ファイル除外確認
- Phase A（骨格）: state + core + render を並列実装
- Phase B（色 + Overlay）: core + render + ui
- Phase C（書き出し）: export + ui

## 各 Phase の同期ポイント
- Phase 0 完了 → 主仕様書 §6.0.4 の完了基準を満たす。`pnpm dev` で空の Vite
  が起動するまで
- Phase A 完了 → 主仕様書 §10.2 と本キックオフ §3 の受入テストを全項目通過
- Phase B 完了 → 本キックオフ §4
- Phase C 完了 → 本キックオフ §5

## 禁忌（主仕様書 AGENTS.md §6 参照）
- parent repo (`happa/`) のファイルを編集しない（read-only）
- テキスト関連のコード・依存・UI を持ち込まない
  （silhouette.ts, typography.ts, text.ts, presets.ts, fonts.ts,
   fontPicker.ts は不要）
- warped silhouette を復活させない
- 3 色目（Text 色）を再導入しない
- Overlay は静止描画。爆破に追従させない
- localStorage / IndexedDB に状態を保存しない
- 依存パッケージを勝手に追加しない（culori, d3-delaunay 以外を入れる場合は
  必ず Takuto に確認）
- Biome lint / TypeScript strict を通らないコードを commit しない
- `any` 禁止（型は主仕様書 §6.2 を流用）

## 最初にやること
各 agent は以下を順に実施してから Phase 0 に着手：
1. `happa-label/AGENTS.md` を全文読む
2. `happa-label/docs/happa-label-spec.md` を全文読む
3. 必要に応じて `happa/docs/happa-designtool-v1.1-spec.md` と
   `happa/wireframes/v0.10/wireframe.html` の該当部分を参照
4. 担当の Phase 0 タスクを 5 行以内で計画報告

Phase 0 は単一 agent（`@state-agent` または `@core-agent`）で実行する。
他 agent は Phase 0 完了を待ってから Phase A に並列着手する。

では始めて。
```

---

## 2. Phase 0 完了確認の受入テスト

Agent が「Phase 0 完了」と報告したら、手元で以下を確認：

- [ ] `happa-label/src/{core,state,render,ui,export,public}/` のディレクトリが存在する
- [ ] `happa-label/package.json` が存在し、parent (`happa/package.json`) から依存を継承している（culori, d3-delaunay を含む）
- [ ] `happa-label/tsconfig.json`, `biome.json`, `vite.config.ts`, `index.html` が parent からコピーされ、必要箇所だけ調整されている
- [ ] 継承モジュール対応表（主仕様書 §6.0.3）どおりにファイルがコピーされている
- [ ] 削除対象ファイル（`silhouette.ts`, `typography.ts`, `text.ts`, `presets.ts`, `fonts.ts`, `fontPicker.ts`）が**一切存在しない**
- [ ] `cd happa-label && pnpm install` がエラー無く完了
- [ ] `pnpm dev` で Vite が起動し、ブラウザでアクセスできる（中身は空または最小限で OK）
- [ ] `pnpm tsc --noEmit` でエラーが出ない（空ファイルでも型エラーが出ないこと）

---

## 3. Phase A 完了確認の受入テスト

- [ ] `pnpm dev` で起動する
- [ ] Vertex count picker（3/4/5/6/7/8/10/12/16/24）で正多角形が切り替わる
- [ ] Shape Jitter スライダーで正多角形がランダムに歪む
- [ ] **`progress = 0` で innerPoly がソリッド**（Voronoi 分割線が**見えない**）
- [ ] DETONATE すると Voronoi 分割が現れて破片が散る
- [ ] 破片数 20 に下げても progress > 0 で Inner 色が隙間から漏れない（adaptive phantom offset 効いている）
- [ ] セル境界に AA シームの白線が出ない（Unified Path2D 効いている）
- [ ] **テキスト関連の UI / 描画が一切ない**ことを目視確認
- [ ] **warped silhouette / 外周テキスト経路の痕跡がない**ことを目視確認
- [ ] `pnpm build` が通る
- [ ] `pnpm lint` が通る（Biome）
- [ ] TypeScript strict でエラー無し

---

## 4. Phase B 完了確認の受入テスト

### 4.1 色

- [ ] Colors セクションに Surface / Inner の **2 つだけ** のピッカーが表示（Text 色は**ない**）
- [ ] それぞれ独立に色が変えられる
- [ ] Randomize Colors で Surface と Inner が補色ペアになる

### 4.2 Overlay

- [ ] Overlay セクションに「Enable toggle」「Load Image」「Clear」が表示
- [ ] PNG / 透過 PNG を読み込める
- [ ] Enable toggle ON で画像が innerPoly clip 内に描画される
- [ ] 画像が innerPoly のバウンディングボックスに対して aspect 維持でフィット
- [ ] `progress = 0` でも progress > 0 でも Overlay は**静止**している（爆破に追従しない）
- [ ] Clear で Overlay 画像が消える
- [ ] 大きすぎる画像（4096×4096 超）を読み込もうとすると警告が出る

---

## 5. Phase C 完了確認の受入テスト

### 5.1 PNG

- [ ] Export セクションに PNG Scale picker（×1 / ×2 / ×4）が表示
- [ ] `Download PNG` ボタンで outer canvas サイズの PNG が DL できる
- [ ] ×1 / ×2 / ×4 でそれぞれ正しい解像度（例: 1:1, gutter 12%, bleed ×1.0 で innerW=1080 → outer 約 1339px、×4 で約 5356px）
- [ ] PNG は現在の progress 値のフレームが保存されている
- [ ] Overlay が ON のときは PNG にも Overlay が反映される

### 5.2 SVG

- [ ] `Download SVG` ボタンで現フレームの SVG が DL できる
- [ ] SVG 内に Voronoi cells が結合 `<path>` として書き出されている
- [ ] Overlay が ON のときは SVG にも `<image>` として base64 で埋め込まれる
- [ ] Illustrator または別ベクター編集アプリで開いて編集可能（path がパーツ単位で選択できる）

### 5.3 GIF

- [ ] `Download GIF` ボタンで 3 秒アニメの GIF が DL できる
- [ ] GIF は最大辺 900px 以下
- [ ] Overlay は GIF でも静止している

### 5.4 ファイル名規約

- [ ] PNG: `happa-label_<timestamp>_x<scale>.png`
- [ ] SVG: `happa-label_<timestamp>.svg`
- [ ] GIF: `happa-label_<timestamp>.gif`

---

## 6. 全 Phase 完了後の統合確認

- [ ] すべての UI コントロールが機能する
- [ ] 長時間操作してもメモリリークが起きない（特に Overlay 画像の繰り返し読み込み時）
- [ ] 60fps で動く（DevTools の FPS メーターで確認）
- [ ] `pnpm build` が通って `dist/` が生成される
- [ ] `pnpm preview` で本番相当で動作確認できる
- [ ] UI が Happo VM v1.1 (`happa/`) と同等の洗練度に到達している
  - dark theme + mono フォント + accent `#ff3300`
  - パネルの余白、スライダーの精度、タイポグラフィの整合性
  - **「引き算の美学」を担保**: 不要なラベル文字や装飾がない
- [ ] テキスト機能の痕跡が一切ない（コード・UI・依存とも）

---

## 7. 仕様から外れそうなときの判断フロー

1. 主仕様書（`happa-label/docs/happa-label-spec.md`）の該当セクションを読み直す
2. 不明点が parent 由来なら `happa/wireframes/v0.10/wireframe.html` と `happa/docs/happa-designtool-v1.1-spec.md` を参照
3. parent と本書の記述が矛盾する場合は **本書を優先**（主仕様書 §0.3.2 参照）
4. それでも不明なら、主仕様書 §11 Open Questions に追加項目として書き残し、Takuto に確認
5. **勝手に解釈して実装しない**。特に以下は必ず確認:
   - 削除対象機能を「あった方が便利」で復活させる
   - 新しい依存パッケージを追加する
   - aspect ratio プリセットを変更する
   - 色体制を 2 色から増やす

---

## 8. コミット方針

各 Phase ごとに feature branch を切る：

- `phase-0/scaffolding`
- `phase-a/core-render`
- `phase-b/color-overlay`
- `phase-c/export`

各 agent は subcommit プレフィックスで分ける：
- `[phase-0] ...`
- `[core] ...`
- `[render] ...`
- `[state] ...`
- `[ui] ...`
- `[export] ...`

`feat`, `fix`, `refactor`, `docs` のプレフィックスは併用可能（例: `[render] feat: implement Unified Path2D`）。

---

## 変更履歴

- **2026-05-12**: 初版（happa-label v0.1 spec に対応）
