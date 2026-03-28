// DBN インタプリタ
// AST を評価して DrawCommand[] を生成する

import type {
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
  DrawCommand,
  InterpreterResult,
  InterpreterError,
} from "./types.js";
import { WIDTH, HEIGHT, MIN_COLOR, MAX_COLOR } from "./types.js";

/** 変数環境（スコープチェーン） */
class Environment {
  private vars: Map<string, number>;
  private parent: Environment | null;

  constructor(parent: Environment | null = null) {
    this.vars = new Map();
    this.parent = parent;
  }

  get(name: string): number | undefined {
    const val = this.vars.get(name);
    if (val !== undefined) return val;
    return this.parent?.get(name);
  }

  set(name: string, value: number): void {
    // 親スコープに既に存在する変数も、ローカルに上書きする
    // （DBN は基本的にフラットなスコープだが、Repeat のループ変数はローカル）
    this.vars.set(name, value);
  }
}

/** ユーザー定義コマンドの登録情報 */
interface UserCommand {
  params: string[];
  body: Block;
}

/** 値を 0-100 にクランプする */
function clamp(value: number): number {
  return Math.max(MIN_COLOR, Math.min(MAX_COLOR, Math.round(value)));
}

/** AST を実行して描画コマンド列を返す */
export function interpret(program: Program): InterpreterResult {
  const interp = new Interpreter();
  return interp.run(program);
}

class Interpreter {
  /** 100x100 キャンバス（左下原点、グレースケール 0-100） */
  private canvas: number[][] = [];
  /** 現在のペン色（0-100） */
  private penColor: number = 100;
  /** 描画コマンド出力 */
  private drawCommands: DrawCommand[] = [];
  /** エラー蓄積 */
  private errors: InterpreterError[] = [];
  /** ユーザー定義コマンドテーブル */
  private userCommands: Map<string, UserCommand> = new Map();
  /** グローバル環境 */
  private globalEnv: Environment = new Environment();

  constructor() {
    // キャンバス初期化（全面白=0）
    this.canvas = Array.from({ length: HEIGHT }, () =>
      Array.from({ length: WIDTH }, () => 0)
    );
  }

  run(program: Program): InterpreterResult {
    // まずトップレベルの Command 定義を登録
    this.registerCommands(program.body);
    // 実行
    this.execBlock(program.body, this.globalEnv);
    return {
      drawCommands: this.drawCommands,
      errors: this.errors,
    };
  }

  /** トップレベルの Command 定義を先に登録する */
  private registerCommands(block: Block): void {
    for (const stmt of block.statements) {
      if (stmt.kind === "CommandDefinition") {
        this.userCommands.set(stmt.name, {
          params: stmt.params,
          body: stmt.body,
        });
      }
    }
  }

  // ─── ブロック・ステートメント実行 ───

  private execBlock(block: Block, env: Environment): void {
    for (const stmt of block.statements) {
      this.execStatement(stmt, env);
    }
  }

  private execStatement(stmt: Statement, env: Environment): void {
    try {
      switch (stmt.kind) {
        case "SetStatement":
          this.execSet(stmt, env);
          break;
        case "RepeatStatement":
          this.execRepeat(stmt, env);
          break;
        case "CommandDefinition":
          // 既に registerCommands で登録済み
          break;
        case "CommandCall":
          this.execCommandCall(stmt, env);
          break;
        case "Question":
          this.execQuestion(stmt, env);
          break;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.errors.push({ message: msg, line: stmt.line });
    }
  }

  // ─── Set ───

  private execSet(stmt: SetStatement, env: Environment): void {
    const value = this.evalExpr(stmt.value, env);

    if (stmt.target.kind === "Identifier") {
      env.set(stmt.target.name, value);
    } else if (stmt.target.kind === "Dot") {
      // ドットアクセス: ピクセルに書き込み
      const x = Math.round(this.evalExpr(stmt.target.x, env));
      const y = Math.round(this.evalExpr(stmt.target.y, env));
      const color = clamp(value);
      this.setPixel(x, y, color);
      this.drawCommands.push({ type: "SetPixel", x, y, color });
    }
  }

  // ─── Repeat ───

  private execRepeat(stmt: RepeatStatement, env: Environment): void {
    const from = Math.round(this.evalExpr(stmt.from, env));
    const to = Math.round(this.evalExpr(stmt.to, env));

    // from から to まで（両端含む）
    if (from <= to) {
      for (let i = from; i <= to; i++) {
        const loopEnv = new Environment(env);
        loopEnv.set(stmt.variable, i);
        this.execBlock(stmt.body, loopEnv);
      }
    } else {
      for (let i = from; i >= to; i--) {
        const loopEnv = new Environment(env);
        loopEnv.set(stmt.variable, i);
        this.execBlock(stmt.body, loopEnv);
      }
    }
  }

  // ─── コマンド呼び出し ───

  private execCommandCall(stmt: CommandCall, env: Environment): void {
    const name = stmt.name;
    const args = stmt.args.map((a) => this.evalExpr(a, env));

    // 組み込みコマンド
    switch (name) {
      case "Paper":
        this.execPaper(args, stmt.line);
        return;
      case "Pen":
        this.execPen(args, stmt.line);
        return;
      case "Line":
        this.execLine(args, stmt.line);
        return;
    }

    // ユーザー定義コマンド
    const userCmd = this.userCommands.get(name);
    if (!userCmd) {
      this.errors.push({ message: `Unknown command: ${name}`, line: stmt.line });
      return;
    }

    if (args.length !== userCmd.params.length) {
      this.errors.push({
        message: `Command '${name}' expects ${userCmd.params.length} arguments, got ${args.length}`,
        line: stmt.line,
      });
      return;
    }

    // 新しいスコープでパラメータをバインド
    const cmdEnv = new Environment(this.globalEnv);
    for (let i = 0; i < userCmd.params.length; i++) {
      cmdEnv.set(userCmd.params[i], args[i]);
    }
    this.execBlock(userCmd.body, cmdEnv);
  }

  // ─── 組み込みコマンド ───

  private execPaper(args: number[], line: number): void {
    if (args.length !== 1) {
      this.errors.push({ message: "Paper expects 1 argument", line });
      return;
    }
    const color = clamp(args[0]);
    // キャンバス全面を指定色で塗りつぶす
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        this.canvas[y][x] = color;
      }
    }
    this.drawCommands.push({ type: "Paper", color });
  }

  private execPen(args: number[], line: number): void {
    if (args.length !== 1) {
      this.errors.push({ message: "Pen expects 1 argument", line });
      return;
    }
    this.penColor = clamp(args[0]);
    this.drawCommands.push({ type: "Pen", color: this.penColor });
  }

  private execLine(args: number[], line: number): void {
    if (args.length !== 4) {
      this.errors.push({ message: "Line expects 4 arguments (x1 y1 x2 y2)", line });
      return;
    }
    const [x1, y1, x2, y2] = args.map(Math.round);
    const color = this.penColor;

    this.drawCommands.push({ type: "Line", x1, y1, x2, y2, color });

    // ブレゼンハムのアルゴリズムでピクセルを描画
    this.bresenham(x1, y1, x2, y2, color);
  }

  /** ブレゼンハムのアルゴリズムによる直線描画 */
  private bresenham(x0: number, y0: number, x1: number, y1: number, color: number): void {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;

    while (true) {
      this.setPixel(cx, cy, color);

      if (cx === x1 && cy === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  }

  // ─── Question (条件式) ───

  private execQuestion(stmt: Question, env: Environment): void {
    const left = this.evalExpr(stmt.left, env);
    const right = this.evalExpr(stmt.right, env);
    let result = false;

    switch (stmt.operator) {
      case "Same?":
        result = left === right;
        break;
      case "NotSame?":
        result = left !== right;
        break;
      case "Smaller?":
        result = left < right;
        break;
      case "NotSmaller?":
        result = left >= right;
        break;
    }

    if (result) {
      this.execBlock(stmt.body, new Environment(env));
    }
  }

  // ─── 式の評価 ───

  private evalExpr(expr: Expression, env: Environment): number {
    switch (expr.kind) {
      case "NumberLiteral":
        return expr.value;

      case "Identifier": {
        const val = env.get(expr.name);
        if (val === undefined) {
          this.errors.push({ message: `Undefined variable: ${expr.name}` });
          return 0;
        }
        return val;
      }

      case "Dot":
        return this.evalDot(expr, env);

      case "BinaryOp":
        return this.evalBinaryOp(expr, env);
    }
  }

  /** ドットアクセス [x y] の読み取り */
  private evalDot(dot: Dot, env: Environment): number {
    const x = Math.round(this.evalExpr(dot.x, env));
    const y = Math.round(this.evalExpr(dot.y, env));
    return this.getPixel(x, y);
  }

  /** 二項演算の評価 */
  private evalBinaryOp(op: BinaryOp, env: Environment): number {
    const left = this.evalExpr(op.left, env);
    const right = this.evalExpr(op.right, env);

    switch (op.operator) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        if (right === 0) {
          this.errors.push({ message: "Division by zero" });
          return 0;
        }
        return Math.floor(left / right);
    }
  }

  // ─── キャンバス操作 ───

  /** ピクセルを設定する（座標系: 左下原点） */
  private setPixel(x: number, y: number, color: number): void {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
    // 左下原点 → 配列インデックス変換（配列は上から下）
    this.canvas[HEIGHT - 1 - y][x] = color;
  }

  /** ピクセルを読み取る（座標系: 左下原点） */
  private getPixel(x: number, y: number): number {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return 0;
    return this.canvas[HEIGHT - 1 - y][x];
  }
}
