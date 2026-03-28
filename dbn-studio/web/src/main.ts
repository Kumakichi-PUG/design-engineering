/**
 * DBN Studio — メインエントリポイント
 * エディタとキャンバスを初期化し、Swift ブリッジを接続する
 */

import { createEditor, setEditorContent, getEditorContent } from "./editor/editor.js";
import { Renderer } from "./canvas/renderer.js";
import { run } from "./dbn/index.js";
import bridge from "./bridge.js";
import type { EditorView } from "@codemirror/view";

let editor: EditorView;
let renderer: Renderer;

/**
 * ソースコードを実行してキャンバスに描画する
 */
function executeAndRender(source: string): void {
  const result = run(source);

  // エラーがあればコンソールに出力
  if (result.errors.length > 0) {
    for (const err of result.errors) {
      console.warn(`[DBN] Line ${err.line ?? "?"}: ${err.message}`);
    }
  }

  // 描画コマンドを実行
  renderer.render(result.drawCommands);

  // Swift 側に実行完了を通知
  bridge.sendToSwift("executionComplete", {
    commandCount: result.drawCommands.length,
    errorCount: result.errors.length,
  });
}

/**
 * アプリケーション初期化
 */
function init(): void {
  // エディタコンテナの取得
  const editorContainer = document.getElementById("editor-container");
  if (!editorContainer) throw new Error("#editor-container が見つかりません");

  // キャンバス要素の取得
  const canvas = document.getElementById("dbn-canvas") as HTMLCanvasElement;
  if (!canvas) throw new Error("#dbn-canvas が見つかりません");

  // レンダラー初期化
  renderer = new Renderer(canvas);

  // エディタ初期化（変更時に自動実行）
  editor = createEditor({
    parent: editorContainer,
    onChange: (code) => {
      executeAndRender(code);
    },
  });

  // ブリッジ経由で Swift からコードを受け取るハンドラ
  bridge.on("runCode", (payload) => {
    const data = payload as { code: string };
    setEditorContent(editor, data.code);
    executeAndRender(data.code);
  });

  // Claude から受け取ったコードをエディタに反映
  document.addEventListener("dbn:claude-code", ((e: CustomEvent) => {
    const code = e.detail?.code as string;
    if (code) {
      setEditorContent(editor, code);
      executeAndRender(code);
    }
  }) as EventListener);

  // ブリッジ経由の描画コマンドを処理
  document.addEventListener("dbn:draw-commands", ((e: CustomEvent) => {
    const commands = e.detail?.commands;
    if (commands) {
      renderer.render(commands);
    }
  }) as EventListener);

  // 初期コードを実行
  executeAndRender(getEditorContent(editor));

  console.log("DBN Studio initialized");
}

// DOM 準備完了後に初期化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
