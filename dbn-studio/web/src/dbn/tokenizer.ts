// DBN トークナイザー
// ソースコード文字列を Token 配列に変換する

import type { Token, TokenType } from "./types.js";

// キーワードとクエスチョンの判定マップ
const KEYWORDS: Record<string, TokenType> = {
  Set: "KEYWORD_SET",
  Repeat: "KEYWORD_REPEAT",
  Command: "KEYWORD_COMMAND",
};

const QUESTIONS = new Set(["Same?", "NotSame?", "Smaller?", "NotSmaller?"]);

const OPERATORS = new Set(["+", "-", "*", "/"]);

const GROUPERS: Record<string, TokenType> = {
  "(": "OPENPAREN",
  ")": "CLOSEPAREN",
  "[": "OPENBRACKET",
  "]": "CLOSEBRACKET",
  "{": "OPENBRACE",
  "}": "CLOSEBRACE",
};

/** DBN ソースコードをトークン列に変換する */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let column = 1;

  const length = source.length;

  while (pos < length) {
    const ch = source[pos];

    // 行コメント: // から行末まで読み飛ばす
    if (ch === "/" && pos + 1 < length && source[pos + 1] === "/") {
      while (pos < length && source[pos] !== "\n") {
        pos++;
      }
      continue;
    }

    // 改行
    if (ch === "\n") {
      tokens.push({ type: "NEWLINE", value: "\n", line, column });
      pos++;
      line++;
      column = 1;
      continue;
    }

    // 空白（改行以外）はスキップ
    if (ch === " " || ch === "\t" || ch === "\r") {
      pos++;
      column++;
      continue;
    }

    // グルーパー
    if (ch in GROUPERS) {
      tokens.push({ type: GROUPERS[ch], value: ch, line, column });
      pos++;
      column++;
      continue;
    }

    // 演算子
    if (OPERATORS.has(ch)) {
      tokens.push({ type: "OPERATOR", value: ch, line, column });
      pos++;
      column++;
      continue;
    }

    // 数値リテラル
    if (isDigit(ch)) {
      const startCol = column;
      let num = "";
      while (pos < length && isDigit(source[pos])) {
        num += source[pos];
        pos++;
        column++;
      }
      tokens.push({ type: "NUMBER", value: num, line, column: startCol });
      continue;
    }

    // ワード / キーワード / クエスチョン
    if (isAlpha(ch) || ch === "_") {
      const startCol = column;
      let word = "";
      while (pos < length && isWordChar(source[pos])) {
        word += source[pos];
        pos++;
        column++;
      }
      // クエスチョン: 末尾に ? が付く場合
      if (pos < length && source[pos] === "?") {
        word += "?";
        pos++;
        column++;
      }

      if (QUESTIONS.has(word)) {
        tokens.push({ type: "QUESTION", value: word, line, column: startCol });
      } else if (word in KEYWORDS) {
        tokens.push({ type: KEYWORDS[word], value: word, line, column: startCol });
      } else {
        tokens.push({ type: "WORD", value: word, line, column: startCol });
      }
      continue;
    }

    // 不明な文字はスキップ（エラー耐性）
    pos++;
    column++;
  }

  // EOF トークンを追加
  tokens.push({ type: "EOF", value: "", line, column });
  return tokens;
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isAlpha(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
}

function isWordChar(ch: string): boolean {
  return isAlpha(ch) || isDigit(ch) || ch === "_";
}
