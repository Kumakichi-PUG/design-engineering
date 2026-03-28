// CodeMirror 6 エディタのセットアップ
// コードは主役の一人。「読みやすい」ではなく「美しい」レベルを目指す

import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { dbnLanguage } from "./dbn-language.js";

// デフォルトの DBN コード — 最初の「おっ」を生む
const DEFAULT_CODE = `Paper 0
Pen 100
Line 0 0 100 100
`;

// モノクロームテーマ — 空気のように存在する
const monochromeTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "#1a1a1a",
    fontSize: "14px",
    fontFamily: "'SF Mono', Menlo, Monaco, Consolas, monospace",
  },
  ".cm-content": {
    caretColor: "#000000",
    padding: "0",
    lineHeight: "1.7",
  },
  ".cm-cursor": {
    borderLeftColor: "#000000",
    borderLeftWidth: "1.5px",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "#e8e8e8",
  },
  // 行番号は控えめに — 存在は認識できるが主張しない
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "#d0d0d0",
    border: "none",
    paddingRight: "12px",
    minWidth: "32px",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "#aaaaaa",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-line": {
    padding: "0 4px",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
});

// シンタックスハイライト — 色数を最小限に
// キーワードだけが黒く太く、あとはグレーの濃淡2段階
const monochromeHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#000000", fontWeight: "600" },
  { tag: tags.number, color: "#666666" },
  { tag: tags.comment, color: "#c0c0c0", fontStyle: "italic" },
  { tag: tags.operator, color: "#666666" },
  { tag: tags.variableName, color: "#333333" },
  { tag: tags.bracket, color: "#999999" },
]);

export interface EditorOptions {
  parent: HTMLElement;
  onChange?: (code: string) => void;
  initialCode?: string;
}

/**
 * CodeMirror 6 エディタを生成して返す
 */
export function createEditor(options: EditorOptions): EditorView {
  const { parent, onChange, initialCode = DEFAULT_CODE } = options;

  // 変更通知用の拡張
  const onChangeExtension = EditorView.updateListener.of((update) => {
    if (update.docChanged && onChange) {
      onChange(update.state.doc.toString());
    }
  });

  const state = EditorState.create({
    doc: initialCode,
    extensions: [
      lineNumbers(),
      history(),
      bracketMatching(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      dbnLanguage,
      syntaxHighlighting(monochromeHighlight),
      monochromeTheme,
      onChangeExtension,
    ],
  });

  const view = new EditorView({
    state,
    parent,
  });

  return view;
}

/**
 * エディタの内容を置き換える
 */
export function setEditorContent(view: EditorView, code: string): void {
  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: code,
    },
  });
}

/**
 * エディタの内容を取得する
 */
export function getEditorContent(view: EditorView): string {
  return view.state.doc.toString();
}
