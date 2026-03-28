// DBN 言語の CodeMirror 6 用シンタックスハイライト定義

import { StreamLanguage, type StreamParser } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// DBN キーワード（組み込みコマンド含む）
const BUILTINS = new Set(["Paper", "Pen", "Line"]);
const KEYWORDS = new Set(["Set", "Repeat", "Command"]);
const QUESTIONS = new Set(["Same?", "NotSame?", "Smaller?", "NotSmaller?"]);

interface DBNState {
  // 状態は不要だが、StreamLanguage の型要件を満たすため
  inLine: boolean;
}

const dbnParser: StreamParser<DBNState> = {
  startState(): DBNState {
    return { inLine: false };
  },

  token(stream, _state): string | null {
    // 空白をスキップ
    if (stream.eatSpace()) return null;

    // コメント: // 以降
    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }

    // 数値リテラル
    if (stream.match(/^-?\d+/)) {
      return "number";
    }

    // 演算子
    if (stream.match(/^[+\-*/]/)) {
      return "operator";
    }

    // 括弧・ブラケット・ブレース
    if (stream.match(/^[()[\]{}]/)) {
      return "bracket";
    }

    // 単語（キーワード・識別子）
    if (stream.match(/^[A-Za-z_]\w*\??/)) {
      const word = stream.current();

      if (KEYWORDS.has(word)) return "keyword";
      if (BUILTINS.has(word)) return "keyword";
      if (QUESTIONS.has(word)) return "keyword";

      return "variableName";
    }

    // 認識できない文字をスキップ
    stream.next();
    return null;
  },
};

// StreamLanguage インスタンス
export const dbnLanguage = StreamLanguage.define(dbnParser);

// ハイライトスタイル用のタグマッピング（参考情報）
export const dbnHighlightTags = {
  keyword: tags.keyword,
  number: tags.number,
  comment: tags.comment,
  operator: tags.operator,
  variableName: tags.variableName,
  bracket: tags.bracket,
};
