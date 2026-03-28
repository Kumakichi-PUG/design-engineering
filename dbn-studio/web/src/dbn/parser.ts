// DBN 再帰下降パーサー
// Token[] → AST (Program ノード) を返す

import type {
  Token,
  TokenType,
  Program,
  Block,
  Statement,
  SetStatement,
  RepeatStatement,
  CommandDefinition,
  CommandCall,
  Question,
  Expression,
  Dot,
  BinaryOp,
  NumberLiteral,
  Identifier,
} from "./types.js";

export interface ParseError {
  message: string;
  line: number;
  column: number;
}

export interface ParseResult {
  program: Program;
  errors: ParseError[];
}

/** トークン列を AST に変換する */
export function parse(tokens: Token[]): ParseResult {
  const parser = new Parser(tokens);
  return parser.parse();
}

class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private errors: ParseError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ParseResult {
    const body = this.parseBlock(true);
    return {
      program: { kind: "Program", body },
      errors: this.errors,
    };
  }

  // ─── ユーティリティ ───

  private current(): Token {
    return this.tokens[this.pos];
  }

  private peek(offset: number = 0): Token {
    const idx = this.pos + offset;
    if (idx >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1]; // EOF
    }
    return this.tokens[idx];
  }

  private advance(): Token {
    const tok = this.current();
    if (tok.type !== "EOF") {
      this.pos++;
    }
    return tok;
  }

  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: TokenType, msg: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    const tok = this.current();
    this.error(`${msg} (expected ${type}, got ${tok.type} '${tok.value}')`, tok);
    return tok;
  }

  private error(message: string, tok: Token): void {
    this.errors.push({ message, line: tok.line, column: tok.column });
  }

  /** 改行トークンを読み飛ばす */
  private skipNewlines(): void {
    while (this.check("NEWLINE")) {
      this.advance();
    }
  }

  /** 現在行の残りトークンを次の改行/EOF まで読み飛ばす（エラーリカバリ用） */
  private skipToNextLine(): void {
    while (!this.check("NEWLINE") && !this.check("EOF") && !this.check("CLOSEBRACE")) {
      this.advance();
    }
    if (this.check("NEWLINE")) {
      this.advance();
    }
  }

  // ─── ブロック ───

  /** ブロックをパースする。isTopLevel=true のとき Command 定義を許可 */
  private parseBlock(isTopLevel: boolean): Block {
    const statements: Statement[] = [];
    this.skipNewlines();

    while (!this.check("EOF") && !this.check("CLOSEBRACE")) {
      this.skipNewlines();
      if (this.check("EOF") || this.check("CLOSEBRACE")) break;

      const stmt = this.parseStatement(isTopLevel);
      if (stmt) {
        statements.push(stmt);
      }
    }
    return { kind: "Block", statements };
  }

  // ─── ステートメント ───

  private parseStatement(isTopLevel: boolean): Statement | null {
    const tok = this.current();

    try {
      switch (tok.type) {
        case "KEYWORD_SET":
          return this.parseSet();
        case "KEYWORD_REPEAT":
          return this.parseRepeat();
        case "KEYWORD_COMMAND":
          if (!isTopLevel) {
            this.error("Command definitions are only allowed at top level", tok);
            this.skipToNextLine();
            return null;
          }
          return this.parseCommandDefinition();
        case "QUESTION":
          return this.parseQuestion();
        case "WORD":
          return this.parseCommandCall();
        default:
          this.error(`Unexpected token '${tok.value}'`, tok);
          this.skipToNextLine();
          return null;
      }
    } catch {
      // パースエラーからの回復: 次の行までスキップ
      this.skipToNextLine();
      return null;
    }
  }

  // ─── Set ステートメント ───

  private parseSet(): SetStatement {
    const setTok = this.advance(); // 'Set' を消費
    let target: Dot | Identifier;

    if (this.check("OPENBRACKET")) {
      target = this.parseDot();
    } else {
      const wordTok = this.expect("WORD", "Expected variable name after Set");
      target = { kind: "Identifier", name: wordTok.value };
    }

    const value = this.parseArgument();
    this.consumeNewline();

    return { kind: "SetStatement", target, value, line: setTok.line };
  }

  // ─── Repeat ステートメント ───

  private parseRepeat(): RepeatStatement {
    const repTok = this.advance(); // 'Repeat' を消費
    const varTok = this.expect("WORD", "Expected loop variable after Repeat");
    const from = this.parseArgument();
    const to = this.parseArgument();
    this.skipNewlines();
    this.expect("OPENBRACE", "Expected '{' to start Repeat body");
    this.expect("NEWLINE", "Expected newline after '{'");
    const body = this.parseBlock(false);
    this.expect("CLOSEBRACE", "Expected '}' to end Repeat body");
    this.consumeNewline();

    return {
      kind: "RepeatStatement",
      variable: varTok.value,
      from,
      to,
      body,
      line: repTok.line,
    };
  }

  // ─── Command 定義 ───

  private parseCommandDefinition(): CommandDefinition {
    const cmdTok = this.advance(); // 'Command' を消費
    const nameTok = this.expect("WORD", "Expected command name after Command");
    const params: string[] = [];

    // パラメータ名を改行または '{' まで読む
    while (this.check("WORD")) {
      params.push(this.advance().value);
    }

    this.skipNewlines();
    this.expect("OPENBRACE", "Expected '{' to start Command body");
    this.expect("NEWLINE", "Expected newline after '{'");
    const body = this.parseBlock(false);
    this.expect("CLOSEBRACE", "Expected '}' to end Command body");
    this.consumeNewline();

    return {
      kind: "CommandDefinition",
      name: nameTok.value,
      params,
      body,
      line: cmdTok.line,
    };
  }

  // ─── コマンド呼び出し ───

  private parseCommandCall(): CommandCall {
    const nameTok = this.advance(); // コマンド名を消費
    const args: Expression[] = [];

    // 引数を改行/EOF/CLOSEBRACE まで読む
    while (!this.check("NEWLINE") && !this.check("EOF") && !this.check("CLOSEBRACE")) {
      args.push(this.parseArgument());
    }
    this.consumeNewline();

    return { kind: "CommandCall", name: nameTok.value, args, line: nameTok.line };
  }

  // ─── Question (条件式) ───

  private parseQuestion(): Question {
    const qTok = this.advance(); // クエスチョントークンを消費
    const left = this.parseArgument();
    const right = this.parseArgument();
    this.skipNewlines();
    this.expect("OPENBRACE", "Expected '{' to start Question body");
    this.expect("NEWLINE", "Expected newline after '{'");
    const body = this.parseBlock(false);
    this.expect("CLOSEBRACE", "Expected '}' to end Question body");
    this.consumeNewline();

    return {
      kind: "Question",
      operator: qTok.value as Question["operator"],
      left,
      right,
      body,
      line: qTok.line,
    };
  }

  // ─── 引数（式） ───

  /** DBN_ARGUMENT: NUMBER | WORD | DOT | ARITHMETIC */
  private parseArgument(): Expression {
    const tok = this.current();

    if (tok.type === "NUMBER") {
      this.advance();
      return { kind: "NumberLiteral", value: parseInt(tok.value, 10) };
    }

    if (tok.type === "WORD") {
      this.advance();
      return { kind: "Identifier", name: tok.value };
    }

    if (tok.type === "OPENBRACKET") {
      return this.parseDot();
    }

    if (tok.type === "OPENPAREN") {
      return this.parseArithmetic();
    }

    this.error(`Expected argument, got '${tok.value}'`, tok);
    this.advance();
    // フォールバック: 0 を返す
    return { kind: "NumberLiteral", value: 0 };
  }

  // ─── ドットアクセス [x y] ───

  private parseDot(): Dot {
    this.advance(); // '[' を消費
    const x = this.parseArgument();
    const y = this.parseArgument();
    this.expect("CLOSEBRACKET", "Expected ']' to close dot access");
    return { kind: "Dot", x, y };
  }

  // ─── 算術式 (operand) ───

  /**
   * 算術式のパース。
   * DBN_ARITHMATIC := OPENPAREN [DBN_OPERAND] CLOSEPAREN
   * DBN_OPERAND := NUMBER | [DBN_OPERATION] | [DBN_ARITHMATIC]
   * DBN_OPERATION := [DBN_BINARYOPERATION]
   * DBN_BINARYOPERATION := [DBN_OPERAND] OPERATION [DBN_OPERAND]
   *
   * つまり (A op B) の形式。ネストも可能: ((A op B) op C)
   */
  private parseArithmetic(): Expression {
    this.advance(); // '(' を消費
    const expr = this.parseOperand();

    // 演算子が続けば二項演算
    if (this.check("OPERATOR")) {
      const opTok = this.advance();
      const right = this.parseOperand();
      this.expect("CLOSEPAREN", "Expected ')' to close arithmetic expression");
      return {
        kind: "BinaryOp",
        operator: opTok.value as BinaryOp["operator"],
        left: expr,
        right,
      };
    }

    this.expect("CLOSEPAREN", "Expected ')' to close arithmetic expression");
    return expr;
  }

  /** DBN_OPERAND: NUMBER | WORD | DOT | 入れ子の算術式 */
  private parseOperand(): Expression {
    const tok = this.current();

    if (tok.type === "NUMBER") {
      this.advance();
      return { kind: "NumberLiteral", value: parseInt(tok.value, 10) };
    }

    if (tok.type === "WORD") {
      this.advance();
      return { kind: "Identifier", name: tok.value };
    }

    if (tok.type === "OPENBRACKET") {
      return this.parseDot();
    }

    if (tok.type === "OPENPAREN") {
      return this.parseArithmetic();
    }

    this.error(`Expected operand, got '${tok.value}'`, tok);
    this.advance();
    return { kind: "NumberLiteral", value: 0 };
  }

  // ─── ヘルパー ───

  /** 改行が期待される位置で改行を消費する（EOF や } の前では許容） */
  private consumeNewline(): void {
    if (this.check("NEWLINE")) {
      this.advance();
    }
    // EOF や CLOSEBRACE の場合は改行不要
  }
}
