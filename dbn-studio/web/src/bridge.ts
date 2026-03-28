// Swift ↔ JS メッセージブリッジ
// Swift 側の MessageBridge.swift と対になる JS 側実装

import type { DrawCommand, InterpreterError } from "./dbn/types";

// ─── 型定義 ───

// Swift → JS: Claude レスポンスペイロード
interface ClaudeResponsePayload {
  code: string | null;
  explanation: string | null;
  error: string | null;
}

// Swift → JS: 描画コマンドペイロード
interface DrawCommandsPayload {
  commands: DrawCommand[];
  errors: InterpreterError[];
}

// Swift → JS: エラーペイロード
interface ErrorPayload {
  message: string;
  line?: number;
}

// メッセージハンドラの型
type MessageHandler = (payload: unknown) => void;

// ─── グローバル型拡張 ───

declare global {
  interface Window {
    dbnBridge: DBNBridge;
    webkit?: {
      messageHandlers: {
        dbnBridge: {
          postMessage(message: { type: string; payload: unknown }): void;
        };
      };
    };
  }
}

// ─── ブリッジ実装 ───

class DBNBridge {
  /// メッセージタイプごとのハンドラ登録
  private handlers: Map<string, MessageHandler[]> = new Map();

  constructor() {
    // デフォルトハンドラを登録
    this.on("claudeResponse", this.handleClaudeResponse.bind(this));
    this.on("drawCommands", this.handleDrawCommands.bind(this));
    this.on("error", this.handleError.bind(this));
  }

  // MARK: - Swift → JS 受信

  /// Swift 側から呼び出されるエントリポイント
  /// MessageBridge.swift の sendToJS が evaluateJavaScript で呼ぶ
  receive(type: string, payload: unknown): void {
    const handlers = this.handlers.get(type);
    if (!handlers || handlers.length === 0) {
      console.warn(`[bridge] 未登録のメッセージタイプ: ${type}`);
      return;
    }

    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (e) {
        console.error(`[bridge] ハンドラエラー (${type}):`, e);
      }
    }
  }

  // MARK: - JS → Swift 送信

  /// Swift 側にメッセージを送信する
  sendToSwift(type: string, payload: unknown): void {
    if (!window.webkit?.messageHandlers?.dbnBridge) {
      // WKWebView 外（ブラウザ開発時）ではログのみ
      console.log(`[bridge] sendToSwift (no native): ${type}`, payload);
      return;
    }

    window.webkit.messageHandlers.dbnBridge.postMessage({ type, payload });
  }

  /// Claude に自然言語プロンプトを送信する
  askClaude(prompt: string): void {
    this.sendToSwift("askClaude", { prompt });
  }

  /// DBN コードの実行をリクエストする
  runCode(code: string): void {
    this.sendToSwift("runCode", { code });
  }

  // MARK: - ハンドラ登録

  /// メッセージタイプに対するハンドラを登録する
  on(type: string, handler: MessageHandler): void {
    const existing = this.handlers.get(type) ?? [];
    existing.push(handler);
    this.handlers.set(type, existing);
  }

  /// メッセージタイプのハンドラを解除する
  off(type: string, handler: MessageHandler): void {
    const existing = this.handlers.get(type);
    if (!existing) return;

    const index = existing.indexOf(handler);
    if (index !== -1) {
      existing.splice(index, 1);
    }
  }

  // MARK: - デフォルトハンドラ

  /// Claude レスポンスを処理する
  private handleClaudeResponse(payload: unknown): void {
    const data = payload as ClaudeResponsePayload;

    if (data.error) {
      console.error(`[bridge] Claude エラー: ${data.error}`);
      return;
    }

    if (data.code) {
      // エディタにコードを挿入する
      // renderer エージェントが editor モジュールを実装後に接続
      console.log("[bridge] Claude コード受信:", data.code);
      document.dispatchEvent(
        new CustomEvent("dbn:claude-code", { detail: { code: data.code } })
      );
    }
  }

  /// 描画コマンドを処理する
  private handleDrawCommands(payload: unknown): void {
    const data = payload as DrawCommandsPayload;

    if (data.errors.length > 0) {
      for (const err of data.errors) {
        console.error(
          `[bridge] インタプリタエラー${err.line != null ? ` (行 ${err.line})` : ""}: ${err.message}`
        );
      }
    }

    // キャンバスに描画コマンドを送信する
    // renderer エージェントが canvas モジュールを実装後に接続
    console.log(`[bridge] 描画コマンド受信: ${data.commands.length} 件`);
    document.dispatchEvent(
      new CustomEvent("dbn:draw-commands", { detail: data })
    );
  }

  /// エラーを処理する
  private handleError(payload: unknown): void {
    const data = payload as ErrorPayload;
    console.error(
      `[bridge] エラー${data.line != null ? ` (行 ${data.line})` : ""}: ${data.message}`
    );
    document.dispatchEvent(
      new CustomEvent("dbn:error", { detail: data })
    );
  }
}

// ─── グローバル初期化 ───

// ブリッジインスタンスを生成し window に公開
const bridge = new DBNBridge();
window.dbnBridge = bridge;

export default bridge;
