# happa-label / AGENTS.md

> Claude Code Agent Teams のエントリポイント。
> 各 agent はこのファイルを**最初に**読んでから作業を開始すること。

---

## 1. プロジェクト概要

**happa-label** は、ラベルの背景となるグラフィックを生成する Visual Machine。
正多角形を Voronoi 爆破することで、「毎回違うが毎回 happa」な視覚を作る。出力は VM で生成されたブランドが用いるラベルの**背景**として機能する（ラベルそのものではない）。

姉妹プロジェクト `happa`（プロダクト名: happa designtool v1.1）からの分岐。テキスト・混植・warped silhouette を削除し、純粋な造形マシンとして再構築する。

---

## 2. 主仕様書

すべての設計判断は以下の主仕様書に従う。本ファイルと矛盾する場合、**主仕様書が優先**する。

```
happa-label/docs/happa-label-spec.md
```

主仕様書を読まずに作業を開始しないこと。実装の詳細・数式・型定義・UI 構成はすべてそこに記述されている。

---

## 3. リポジトリ構成（monorepo）

```
design-engineering/                       ← Claude Code 起動位置
├── happa/                                ← parent repo（read-only 参照）
│   ├── AGENTS.md                         ← v1.1 開発用（本プロジェクトとは独立）
│   ├── CLAUDE.md                         ← 同上
│   ├── happa-v1.1-kickoff.md             ← v1.1 実装キックオフ指示書（参考）
│   ├── docs/
│   │   ├── happa-designtool-v1.1-spec.md ← v1.1 spec（正本）
│   │   ├── happa-designtool.md           ← v1.0 spec（legacy）
│   │   └── prototype.html
│   ├── src/                              ← 継承元コード本体
│   ├── wireframes/v0.10/wireframe.html   ← reference implementation
│   └── package.json / tsconfig.json / biome.json / vite.config.ts
└── happa-label/                          ← 本プロジェクト
    ├── AGENTS.md                         ← 本ファイル
    ├── happa-label-kickoff.md            ← 実装キックオフ指示書
    ├── docs/happa-label-spec.md          ← 主仕様書
    ├── src/
    ├── public/
    └── README.md
```

### 3.1 parent repo の役割

- `happa/` は **v1.1 の完成版**であり、本プロジェクトの **継承元**
- 主仕様書の「v1.1 継承」と書かれたモジュールは `happa/src/` を参照
- 詳細な数式・アルゴリズムは `happa/docs/happa-designtool-v1.1-spec.md` を参照可
- v1.1 の実装フロー（受入テストの組み立て方等）は `happa/happa-v1.1-kickoff.md` も参考になる
- `happa/AGENTS.md` と `happa/CLAUDE.md` は v1.1 開発時のもの。**本プロジェクトのフローは本ファイルが優先**し、parent の AGENTS は無視してよい
- **parent のファイルは絶対に編集しない**（read-only）

### 3.2 何をどこに書くか

| 種類                                 | 配置                              |
| ------------------------------------ | --------------------------------- |
| 実装コード                           | `happa-label/src/`                |
| 仕様の更新                           | `happa-label/docs/happa-label-spec.md` |
| 実装メモ・調査ログ                   | `happa-label/docs/notes/` (必要時に作成) |
| Open Questions の解決               | 主仕様書 §11 を編集                |

---

## 4. 開発フロー

主仕様書 §10.2 に従い、以下の順で進める：

```
Phase 0 ──► Phase A ──► Phase B ──► Phase C
（準備）   （骨格）    （色 + Overlay）（書き出し）
```

各 Phase の詳細・完了基準は主仕様書 §10.2 を参照。**前 Phase の完了基準を満たさずに次 Phase へ進まないこと。**

### 4.1 Phase 0 の特殊性

Phase 0 は単一 agent で完結する準備工程（§6.0）。継承モジュールのコピー作業を含むため、複数 agent が並列でファイル操作すると競合する。Phase 0 は **必ず `@state-agent` または `@core-agent` のいずれか単独で**実行する。

---

## 5. Agent 担当マトリクス

主仕様書 §10.1 のとおり：

| Agent            | 主担当                                                                           |
| ---------------- | -------------------------------------------------------------------------------- |
| `@state-agent`   | `AppState`、変更伝播、main.ts                                                    |
| `@core-agent`    | polygon.ts（縮小）、voronoi.ts、color.ts、types.ts、rng/easing 継承                |
| `@render-agent`  | scene.ts、preExplosion / explosion、Unified Path2D、overlay.ts、guides.ts        |
| `@ui-agent`      | controls.ts、colorPicker.ts（2 色版）、overlayPicker.ts、index.html、Export UI    |
| `@export-agent`  | png.ts（倍率指定）、svg.ts（新規）、gif.ts                                       |

担当外のファイルは編集しない。必要なら担当 agent に依頼する。

---

## 6. 禁止事項

実装中に**絶対に守る**べきルール：

1. **parent repo (`happa/`) のファイルを編集しない**。read-only として扱う。
2. **テキスト関連のコード・依存・UI を持ち込まない**。v1.1 にあった `silhouette.ts`, `typography.ts`, `text.ts`, `presets.ts`, `fonts.ts`, `fontPicker.ts` は不要。Web Font / FontFace API も不要。
3. **warped silhouette を復活させない**。`subdividePolygon`, `warpPolygonByCells`, `buildTextPath`, `samplePath` は持ち込まない。
4. **3 色目（Text 色）を再導入しない**。`AppState` の色は `surfaceColor` / `innerColor` の 2 つのみ。
5. **Overlay は静止描画**。v1.1 にあった「cell 単位 clip による爆破追従」は持ち込まない。innerPoly clip で固定描画する。
6. **localStorage / IndexedDB に状態を保存しない**。Overlay 画像も含めメモリのみ。
7. **依存パッケージを勝手に追加しない**。`culori`, `d3-delaunay` 以外の新規依存が必要な場合は主仕様書を更新してから追加。

---

## 7. 動作確認

各 Phase の完了確認：

```bash
cd happa-label
pnpm install         # Phase 0 終了後の初回のみ
pnpm dev             # 開発サーバー起動
pnpm build           # 本番ビルド
pnpm lint            # Biome チェック
pnpm tsc --noEmit    # TypeScript 型チェック
```

完了基準は各 Phase ごとに主仕様書 §10.2 に明記されている。チェックリストとして使うこと。

---

## 8. デザイン原則

実装判断に迷ったら、以下の原則に立ち戻る：

- **引き算の美学**: v0.1 は徹底して機能を絞る。「あった方が便利かも」で機能を追加しない。
- **幾何の規律**: 形態は正多角形を起点に。乱数は seed で再現可能であること。
- **二相の意味**: progress=0 と progress>0 は別物として扱う。progress=0 で Voronoi が見えてはいけない。
- **静止と動の分離**: Overlay は静止。爆破は動。両者を混ぜない。
- **UI の洗練**: Happo VM (v1.1) と同等の質感を保つ。コントロールの余白・タイポ・グリッドの整合性を妥協しない。

---

## 9. 仕様の更新ルール

実装中に主仕様書を更新する必要が生じた場合：

- 軽微な変更（誤字、補足、Open Question の解決）: 直接編集し、§変更履歴に追記
- 設計変更（API、データ構造、UI の本質的変更）: 一度作業を止めて、ユーザー（Takuto）に確認してから進める
- 新規機能の追加: v0.1 では原則として行わない（B フェーズに送る）

主仕様書の §11 Open Questions は実装中に発生した未解決事項の置き場として活用すること。

---

## 10. クイックリファレンス

```
主仕様書          : happa-label/docs/happa-label-spec.md
本プロジェクト kickoff: happa-label/happa-label-kickoff.md
parent v1.1 spec  : happa/docs/happa-designtool-v1.1-spec.md
parent v1.0 spec  : happa/docs/happa-designtool.md (legacy 参考)
parent 実装       : happa/src/
parent wireframe  : happa/wireframes/v0.10/wireframe.html
parent kickoff    : happa/happa-v1.1-kickoff.md (実装フロー参考)
```

困ったら主仕様書 §11 (Open Questions) と §A.4 (削除モジュール一覧) を確認すること。

---

**最終更新**: 2026-05-12 / **対応仕様**: happa-label v0.1
