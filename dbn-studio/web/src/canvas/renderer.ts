// Canvas 2D 描画エンジン — 100×100 グレースケール

import { WIDTH, HEIGHT, type DrawCommand } from "../dbn/types.js";

/**
 * DBN のグレースケール値 (0=白, 100=黒) を RGB 値 (0-255) に変換
 */
function dbnColorToRGB(dbnColor: number): number {
  // 0 → 255 (白), 100 → 0 (黒)
  const clamped = Math.max(0, Math.min(100, dbnColor));
  return Math.round(255 * (1 - clamped / 100));
}

/**
 * DBN の Y 座標をキャンバス座標に変換（Y 軸反転）
 * DBN: 左下が (0,0)、Canvas: 左上が (0,0)
 */
function flipY(y: number): number {
  return HEIGHT - 1 - y;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  // 内部バッファ: DBN グレースケール値 (0-100) を格納
  private buffer: Uint8Array;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    // キャンバスの内部解像度を 100×100 に固定
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context の取得に失敗");
    this.ctx = ctx;

    this.buffer = new Uint8Array(WIDTH * HEIGHT);
  }

  /**
   * 描画コマンド列を実行してキャンバスに描画する
   */
  render(commands: DrawCommand[]): void {
    // バッファをクリア（0 = 白）
    this.buffer.fill(0);
    // 現在のペン色（デフォルト: 100 = 黒）
    let penColor = 100;

    for (const cmd of commands) {
      switch (cmd.type) {
        case "Paper":
          this.fillPaper(cmd.color);
          break;
        case "Pen":
          penColor = cmd.color;
          break;
        case "Line":
          this.drawLine(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.color);
          break;
        case "SetPixel":
          this.setPixel(cmd.x, cmd.y, cmd.color);
          break;
      }
    }

    // バッファの内容を Canvas に反映
    this.flush();
  }

  /**
   * バッファ全体を指定色で塗りつぶす
   */
  private fillPaper(color: number): void {
    this.buffer.fill(color);
  }

  /**
   * 指定座標にピクセルを設定（範囲外は無視）
   */
  private setPixel(x: number, y: number, color: number): void {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
    // DBN 座標系で格納（Y 反転はフラッシュ時に処理）
    this.buffer[y * WIDTH + x] = color;
  }

  /**
   * ブレゼンハムのアルゴリズムで直線を描画
   */
  private drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number,
  ): void {
    let x = x1;
    let y = y1;
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      this.setPixel(x, y, color);

      if (x === x2 && y === y2) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /**
   * 内部バッファから ImageData を生成して Canvas に描画
   */
  private flush(): void {
    const imageData = this.ctx.createImageData(WIDTH, HEIGHT);
    const data = imageData.data;

    for (let dbnY = 0; dbnY < HEIGHT; dbnY++) {
      for (let x = 0; x < WIDTH; x++) {
        const dbnColor = this.buffer[dbnY * WIDTH + x];
        const rgb = dbnColorToRGB(dbnColor);

        // Y 軸反転: DBN の y=0 はキャンバスの最下行
        const canvasY = flipY(dbnY);
        const idx = (canvasY * WIDTH + x) * 4;

        data[idx] = rgb; // R
        data[idx + 1] = rgb; // G
        data[idx + 2] = rgb; // B
        data[idx + 3] = 255; // A（不透明）
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }
}
