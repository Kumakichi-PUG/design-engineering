# CLAUDE.md

> このファイルは Claude Code が `firehands/` を開いた際に自動的に読み込みます。

## プロジェクト概要

**Visual Machine — "Hands of Flame"**

「炎のゆらめきは、まるで無数の手のように見える」というコンセプトを基にした、インタラクティブなビジュアルマシン。  
約100本の手のシルエットが、Curl Noise + 1/fゆらぎで上昇しながらSDF補間でゆっくり別の手の形に溶けていく。  
カメラで手を見せると登録され、登録するほど多様な手が炎を構成する。  
過去に登録された手は背景にゴーストとしてうっすら漂い続ける。

### スケールの三層構造（このプロジェクトの中核）
- **遠景** = 炎
- **中景** = 100本の手
- **近景** = 各手の指がゆっくり動き、別の手に溶けていく

## 必読ドキュメント

- **`REQUIREMENTS.md`** — 全機能要件、技術仕様、シェーダ設計、受け入れ基準（v0.3）
- **`AGENTS/README.md`** — 並列開発の進め方
- **`AGENTS/TRACK_*.md`** — 各エージェントの担当範囲と詳細指示

## 並列開発の構成

6トラックを並列に進める：

| Track | 担当範囲 |
|-------|---------|
| **A** | Foundation（プロジェクト初期化、Zustand骨格、レイアウト） |
| **B** | Flame Core（インスタンス炎、Curl Noise、1/fゆらぎ、SDF補間モーフィング） |
| **C** | Hand & SDF（MediaPipe統合、SDF生成EDT、アトラス、IndexedDB永続化、Ghost） |
| **D** | Color & GUI（OKLCHパレット、leva統合） |
| **E** | Export & Display（録画、スクショ、フルスクリーン） |
| **F** | Polish（Bloom、grain、パフォーマンス、デモ） |

## 技術スタック

| 領域 | 採用技術 |
|------|---------|
| ビルド | Vite + TypeScript (strict) |
| UI | React 18 |
| 3D | Three.js + @react-three/fiber + @react-three/drei |
| ポストプロセス | @react-three/postprocessing |
| 手検出 | @mediapipe/tasks-vision |
| GUI | leva |
| 色空間 | culori（OKLCH） |
| 永続化 | idb-keyval |
| 状態管理 | Zustand |
| スタイル | Tailwind CSS |
| 録画 | MediaRecorder API |

## 絶対に守る原則

1. **60fps を妥協しない**（M1 MacBook Air 基準）
2. **アートを邪魔しない最小限のクロム**（GUIは折りたたみ + Hキー完全非表示）
3. **SDFポーズモーフィングは作品のアイデンティティ**。クロスフェードに逃げない
4. **OKLCH補間はOKLab経由**（シェーダ内で線形補間してからRGB変換）
5. **コミット規約**：Conventional Commits（`feat:`, `fix:`, `chore:`, `docs:` ...）
6. **TypeScript は strict mode**。`any` は禁止
7. **シェーダは美しさを最優先**。数値は実機で見ながら詰める

## 開発コマンド

```bash
pnpm install          # 初回
pnpm dev              # 開発サーバ（http://localhost:5173）
pnpm build            # 本番ビルド
pnpm preview          # ビルド成果物を確認
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm test             # Vitest
```

## カメラ・MediaPipe について

- 開発中も **HTTPS が必要**。Viteは `pnpm dev --host` でも localhost なら HTTP で動くが、 LAN 経由テストには `mkcert` 等が必要
- 本番デプロイは HTTPS 必須
- カメラ拒否時もアイドル炎は美しく動くこと

## アスペクト比

- v1 は **16:9 横長のみ**。9:16 / 3:4 / フルサイズは v2 以降
- 16:9 の比率を保ったまま中央配置、上下左右は背景色

## ライセンス & クレジット

- Concept & Art Direction: 大川 大空翔
- 共同設計: Claude (Anthropic)
