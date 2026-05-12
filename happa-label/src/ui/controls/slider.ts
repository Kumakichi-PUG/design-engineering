/**
 * Labeled slider with a monospaced numeric readout.
 *
 * Markup matches parent happa v1.1 wireframe v0.10 `.row > label +
 * input[type=range] + .value`. The store callback is invoked on every
 * `input` event; an `update` hook lets the caller push external state
 * back into the DOM (used by `mountControls` for the DETONATE rAF loop
 * and any subscribe-driven sync).
 */

import type { AppState } from '../../state';

/** Numeric fields on `AppState` that a slider may write. */
export type SliderField =
  | 'progress'
  | 'shapeRandomness'
  | 'gutterPct'
  | 'bleedMult'
  | 'fragmentCount'
  | 'randomness'
  | 'innerDispPct'
  | 'perimMult'
  | 'speedVariance'
  | 'directionNoise'
  | 'rotation';

/** Options for `mountSlider`. */
export interface SliderOptions {
  /** Row label (e.g. `"Edge Band (%)"`). */
  label: string;
  /** State field this slider writes. */
  field: SliderField;
  /** `<input type="range" min>`. */
  min: number;
  /** `<input type="range" max>`. */
  max: number;
  /** `<input type="range" step>`. */
  step: number;
  /**
   * Format a store value as the row's readout string. Defaults to
   * step-aware `Number.toFixed`. Receives the **store value**, not the
   * raw range value (callers without `storeTransform` see the same).
   */
  formatValue?: (storeValue: number) => string;
}

/** Handle returned by `mountSlider`. */
export interface SliderHandle {
  /** Push the current store value into the DOM (range + readout). */
  update: (storeValue: number) => void;
}

/** Choose a default readout format based on the step granularity. */
function defaultFormat(step: number): (v: number) => string {
  if (step >= 1) {
    return (v): string => String(Math.round(v));
  }
  if (step >= 0.1) {
    return (v): string => v.toFixed(1);
  }
  return (v): string => v.toFixed(2);
}

/**
 * Mount one labeled slider into `root`.
 *
 * @param root - The section container.
 * @param getState - Snapshot reader; used for initial value only.
 * @param setState - Patch writer; invoked on every `input` event.
 * @param options - Label / field / range / step / format.
 * @returns `SliderHandle` with an `update` callback for external sync.
 */
export function mountSlider(
  root: HTMLElement,
  getState: () => AppState,
  setState: (patch: Partial<AppState>) => void,
  options: SliderOptions,
): SliderHandle {
  const format = options.formatValue ?? defaultFormat(options.step);

  const row = document.createElement('div');
  row.className = 'row';

  const label = document.createElement('label');
  label.textContent = options.label;
  row.appendChild(label);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(options.min);
  input.max = String(options.max);
  input.step = String(options.step);
  const initial = getState()[options.field];
  input.value = String(initial);
  row.appendChild(input);

  const readout = document.createElement('div');
  readout.className = 'value';
  readout.textContent = format(initial);
  row.appendChild(readout);

  input.addEventListener('input', () => {
    const n = Number.parseFloat(input.value);
    if (!Number.isFinite(n)) return;
    readout.textContent = format(n);
    setState({ [options.field]: n } as Partial<AppState>);
  });

  root.appendChild(row);

  return {
    update: (storeValue: number): void => {
      // Guard against caret jumps: only rewrite when the value drifted
      // from what the DOM already holds (string-level equality).
      const next = String(storeValue);
      if (input.value !== next) input.value = next;
      readout.textContent = format(storeValue);
    },
  };
}
