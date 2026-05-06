# 🔥 Hands of Flame

> 100本の手のシルエットでできた、ゆっくり呼吸する炎のビジュアルマシン

---

## クイックスタート

```bash
# 依存をインストール（pnpm 推奨）
pnpm install

# 開発サーバ起動
pnpm dev
# → http://localhost:5173
```

ブラウザでアクセスして、手をかざせば登録されます。  
`F` でフルスクリーン、`H` で GUI 非表示。

---

## このリポジトリについて

このリポジトリは **Claude Code Agent Teams での並列開発を前提**に設計されています。  
6つのトラックを6人（または6並列セッション）の Claude Code エージェントが同時に進める想定です。

```
firehands/
├── REQUIREMENTS.md          # 全機能要件 (v0.3) — 必読
├── CLAUDE.md                # Claude Code が自動読込するプロジェクトコンテキスト
├── AGENTS/
│   ├── README.md            # 並列開発の進め方
│   ├── TRACK_A_foundation.md
│   ├── TRACK_B_flame_core.md
│   ├── TRACK_C_hand_sdf.md
│   ├── TRACK_D_color_gui.md
│   ├── TRACK_E_export_display.md
│   └── TRACK_F_polish.md
├── src/                     # 実装コード（Trackごとに埋まっていく）
└── public/                  # 静的アセット（手シルエットSVG等）
```

---

## Claude Code Agent Teams で開発を開始する方法

### 方法1：1セッションで全Track並列ディスパッチ

`firehands/` で Claude Code を起動：

```bash
cd ~/design-engineering/firehands
claude
```

そして次のように指示：

```
REQUIREMENTS.md と AGENTS/ 配下のすべての TRACK_*.md を読んで、
Track A から F までを並列のサブエージェントとして同時に進めてください。

各サブエージェントは自分の TRACK_*.md を最重要指示として扱い、
完了したら "Track X: Done" を報告してください。
```

### 方法2：各Trackを別セッション/別ブランチで進める

各エンジニア or AIエージェントが個別のブランチで進める：

```bash
git checkout -b track-a-foundation
# AGENTS/TRACK_A_foundation.md を Claude Code に読ませて実装
```

完了したら main へPR。  
他のTrackも同様に並列で。

### 方法3：個別ディスパッチ

```bash
claude "AGENTS/TRACK_B_flame_core.md の内容を実装してください"
```

---

## 開発フロー上の注意

1. **Phase順を守る**：
   - Phase 1 (MVP) → Phase 2 (Motion & Color) → Phase 3 (SDF Morphing) → ...
   - REQUIREMENTS.md §12 を参照
2. **各Trackの依存関係**：
   - Track B の SDF実装は Track C のSDF生成パイプラインに依存
   - Track D の leva は Track A の Zustand 骨格に依存
   - 依存先のスケルトンが先にmainにmergeされていればOK
3. **PR時に動画を添付**：
   - モーフィングは静止画では伝わらないため、必ず録画 or GIF を添付

---

## 主要ショートカット

| キー | 機能 |
|------|------|
| `F` | フルスクリーン切替 |
| `H` | GUIパネル切替 |
| `R` | 録画開始/停止 |
| `S` | スクリーンショット |
| `ESC` | フルスクリーン解除 |

---

## ライセンス

- Concept & Art Direction: **大川 大空翔**
- 共同設計: Claude (Anthropic)
- 依存ライブラリ: 各オープンソースライセンス
- MediaPipe: Apache 2.0
