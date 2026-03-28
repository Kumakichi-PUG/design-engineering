# DBN Studio — Project Context

## プロジェクト概要
Design by Numbers (John Maeda, 1999) を再実装した Mac + iPhone ユニバーサルアプリ。
Claude API による自然言語 → DBN コード変換機能を搭載。

## 技術スタック
- アプリシェル: Swift + SwiftUI (Multiplatform: macOS + iOS)
- エディタ + キャンバス: WKWebView 内に CodeMirror 6 + Canvas 2D
- DBN インタプリタ: TypeScript (web/src/dbn/)、Vite でビルド
- Claude 連携: Anthropic API (claude-sonnet-4-20250514)
- API キー管理: macOS Keychain (Security framework)

## ディレクトリ所有権（Agent Teams 用）
- web/src/dbn/ → parser エージェント
- web/src/editor/ + web/src/canvas/ + web/src/style.css → renderer エージェント
- DBNStudio/Services/ + web/src/bridge.ts → claude-bridge エージェント
- DBNStudio/Views/ + DBNStudio/Bridge/ → shell エージェント

## DBN 言語仕様
- キャンバス: 100x100 ピクセル、グレースケール（0=白、100=黒）
- 座標系: 左下が (0,0)、右上が (99,99)
- コマンド: Paper, Pen, Line, Set, Repeat, Command
- 文法: louissobel/dbn の parse_grammer.txt を参照してクリーンルーム実装

## コーディング規約
- TypeScript: strict mode、ESM
- Swift: SwiftUI 宣言的スタイル、async/await
- コメント: 日本語で記述
- 関数名・変数名: 英語
- エラーメッセージ: 日本語 UI + 英語ログ

## デザイン原則
- Maeda 的ミニマリズム: 余白を恐れない、要素を極限まで減らす
- モノクロームベース: アクセントカラーは1色以下
- タイポグラフィ重視: フォント選定はアートディレクターが最終決定
- ピクセルパーフェクト: 1px のズレも許容しない

## Agent Teams プロトコル
- 他エージェントのファイルを編集しない
- 共有インターフェース: web/src/dbn/types.ts を全員が参照
- コミットメッセージ: [agent-name] description 形式
- マージ前に Team Lead がレビュー
