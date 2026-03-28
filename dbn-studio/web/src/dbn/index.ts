// DBN (Design by Numbers) 公開 API
// tokenize → parse → interpret のパイプライン

import type { InterpreterResult } from "./types.js";
import { tokenize } from "./tokenizer.js";
import { parse } from "./parser.js";
import { interpret } from "./interpreter.js";

/**
 * DBN ソースコードを実行し、描画コマンド列を返す
 * @param source DBN ソースコード文字列
 * @returns 描画コマンド配列とエラー情報
 */
export function run(source: string): InterpreterResult {
  // 1. トークン化
  const tokens = tokenize(source);

  // 2. パース
  const { program, errors: parseErrors } = parse(tokens);

  // 3. インタプリタ実行
  const result = interpret(program);

  // パースエラーをインタプリタエラーとマージ
  const mergedErrors = [
    ...parseErrors.map((e) => ({
      message: e.message,
      line: e.line,
    })),
    ...result.errors,
  ];

  return {
    drawCommands: result.drawCommands,
    errors: mergedErrors,
  };
}

// 個別モジュールの再エクスポート（テストやデバッグ用）
export { tokenize } from "./tokenizer.js";
export { parse } from "./parser.js";
export { interpret } from "./interpreter.js";
export * from "./types.js";
