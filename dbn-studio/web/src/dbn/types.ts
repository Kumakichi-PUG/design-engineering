// DBN (Design by Numbers) 共有型定義
// 他エージェント（renderer, claude-bridge）も参照する最重要ファイル

// ─── キャンバス定数 ───
export const WIDTH = 100;
export const HEIGHT = 100;
export const MIN_COLOR = 0;
export const MAX_COLOR = 100;

// ─── トークン ───

export type TokenType =
  | "NUMBER"
  | "WORD"
  | "KEYWORD_SET"
  | "KEYWORD_REPEAT"
  | "KEYWORD_COMMAND"
  | "QUESTION" // Same?, NotSame?, Smaller?, NotSmaller?
  | "OPERATOR" // + - * /
  | "OPENPAREN"
  | "CLOSEPAREN"
  | "OPENBRACKET"
  | "CLOSEBRACKET"
  | "OPENBRACE"
  | "CLOSEBRACE"
  | "NEWLINE"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// ─── AST ノード ───

export type ASTNode =
  | Program
  | Block
  | SetStatement
  | RepeatStatement
  | CommandDefinition
  | CommandCall
  | Question
  | Dot
  | BinaryOp
  | NumberLiteral
  | Identifier;

export interface Program {
  kind: "Program";
  body: Block;
}

export interface Block {
  kind: "Block";
  statements: Statement[];
}

export type Statement =
  | SetStatement
  | RepeatStatement
  | CommandDefinition
  | CommandCall
  | Question;

export interface SetStatement {
  kind: "SetStatement";
  target: Dot | Identifier;
  value: Expression;
  line: number;
}

export interface RepeatStatement {
  kind: "RepeatStatement";
  variable: string;
  from: Expression;
  to: Expression;
  body: Block;
  line: number;
}

export interface CommandDefinition {
  kind: "CommandDefinition";
  name: string;
  params: string[];
  body: Block;
  line: number;
}

export interface CommandCall {
  kind: "CommandCall";
  name: string;
  args: Expression[];
  line: number;
}

export interface Question {
  kind: "Question";
  operator: "Same?" | "NotSame?" | "Smaller?" | "NotSmaller?";
  left: Expression;
  right: Expression;
  body: Block;
  line: number;
}

export interface Dot {
  kind: "Dot";
  x: Expression;
  y: Expression;
}

export interface BinaryOp {
  kind: "BinaryOp";
  operator: "+" | "-" | "*" | "/";
  left: Expression;
  right: Expression;
}

export interface NumberLiteral {
  kind: "NumberLiteral";
  value: number;
}

export interface Identifier {
  kind: "Identifier";
  name: string;
}

export type Expression = NumberLiteral | Identifier | Dot | BinaryOp;

// ─── 描画コマンド（Interpreter 出力） ───

export type DrawCommand =
  | PaperCommand
  | PenCommand
  | LineCommand
  | SetPixelCommand;

export interface PaperCommand {
  type: "Paper";
  color: number;
}

export interface PenCommand {
  type: "Pen";
  color: number;
}

export interface LineCommand {
  type: "Line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: number;
}

export interface SetPixelCommand {
  type: "SetPixel";
  x: number;
  y: number;
  color: number;
}

// ─── Interpreter 結果 ───

export interface InterpreterError {
  message: string;
  line?: number;
}

export interface InterpreterResult {
  drawCommands: DrawCommand[];
  errors: InterpreterError[];
}
