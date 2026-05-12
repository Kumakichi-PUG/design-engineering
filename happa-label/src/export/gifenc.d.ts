/**
 * Ambient types for `gifenc` v1.0.3 (no shipped `.d.ts`).
 *
 * Mirrors the runtime API of `node_modules/gifenc/src/index.js`. We only
 * declare the surface area used by `src/export/gif.ts`. The palette is a
 * `number[][]` of `[r, g, b]` (or `[r, g, b, a]`) triples; we model it as
 * `readonly number[][]` for safety and pass it through as-is.
 */

declare module 'gifenc' {
  /** RGBA pixel buffer accepted by `quantize` / `applyPalette`. */
  export type RGBA = Uint8Array | Uint8ClampedArray;

  /** Color palette: array of `[r, g, b]` (or `[r, g, b, a]`) tuples. */
  export type Palette = number[][];

  /** Index buffer returned by `applyPalette`. */
  export type IndexedPixels = Uint8Array;

  /** Options accepted by `GIFEncoder().writeFrame`. */
  export interface WriteFrameOptions {
    /** Per-frame (local) palette. Required on the first frame. */
    palette?: Palette;
    /** Frame delay in milliseconds; gifenc normalizes to GIF's 1/100s. */
    delay?: number;
    /** Loop count: -1 once, 0 forever (default), >0 explicit count. */
    repeat?: number;
    /** Whether the frame uses a transparent index. */
    transparent?: boolean;
    /** Transparent palette index (0..255). */
    transparentIndex?: number;
    /** Bits per pixel (default 8). */
    colorDepth?: number;
    /** GIF disposal method override. */
    dispose?: number;
    /** Manual-mode first-frame flag. */
    first?: boolean;
  }

  /** Encoder instance returned by `GIFEncoder()`. */
  export interface GIFEncoderInstance {
    reset(): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    writeHeader(): void;
    writeFrame(index: IndexedPixels, width: number, height: number, opts?: WriteFrameOptions): void;
  }

  /** Encoder constructor options. */
  export interface GIFEncoderOptions {
    initialCapacity?: number;
    auto?: boolean;
  }

  export function GIFEncoder(opt?: GIFEncoderOptions): GIFEncoderInstance;

  export function quantize(
    rgba: RGBA,
    maxColors: number,
    opts?: {
      format?: 'rgb565' | 'rgb444' | 'rgba4444';
      oneBitAlpha?: boolean | number;
      clearAlpha?: boolean;
      clearAlphaThreshold?: number;
      clearAlphaColor?: number;
    },
  ): Palette;

  export function applyPalette(
    rgba: RGBA,
    palette: Palette,
    format?: 'rgb565' | 'rgb444' | 'rgba4444',
  ): IndexedPixels;
}
