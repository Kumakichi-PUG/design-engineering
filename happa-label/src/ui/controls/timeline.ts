/**
 * Animation section: Progress slider + DETONATE / RESET buttons.
 *
 * Parent calls this "timeline" — happa-label retains the name for the
 * scrubber element but the spec §8 names the section `Animation`.
 *
 * Behaviour:
 *  - Slider bidirectional with `state.progress` (0..1, step 0.01).
 *  - DETONATE drives `progress` 0 → 1 linearly over 3000 ms via rAF.
 *    Easing is applied downstream in render (`easeOutExpo`).
 *  - RESET sets `progress = 0` and cancels any in-flight rAF.
 *  - Manual scrub also cancels the rAF (a `pointerdown` on the slider
 *    is enough — the value may not have changed yet but the user
 *    intent is clear).
 *
 * The rAF loop is owned by this module because the UI is the natural
 * home for the "DETONATE button" trigger. State only carries `progress`;
 * no `isAnimating` flag (DL: happa-label state is intentionally lean).
 */

import type { AppState } from '../../state';
import { createButton } from './buttons';

/** Detonation duration (spec §A.2 / FR-14). */
const DETONATE_DURATION_MS = 3000;

/** Slider resolution: 1001 steps (0, 0.001, …, 1.000). */
const STEPS = 1000;

/** Handle returned by `mountTimeline`. */
export interface TimelineHandle {
  /** Push the store value into the slider (used by subscribe). */
  update: (progress: number) => void;
  /** Cancel any in-flight DETONATE rAF (called when the panel teardowns). */
  cancel: () => void;
}

/**
 * Mount the Animation section.
 *
 * @param root - Controls container; this function appends a new
 *  section with its own heading.
 * @param getState - Snapshot reader (used by the rAF loop).
 * @param setState - Patch writer (progress updates + reset).
 */
export function mountTimeline(
  root: HTMLElement,
  getState: () => AppState,
  setState: (patch: Partial<AppState>) => void,
): TimelineHandle {
  const section = document.createElement('div');
  section.className = 'section';

  const heading = document.createElement('div');
  heading.className = 'section-label';
  heading.textContent = 'Animation';
  section.appendChild(heading);

  // ── Progress slider row ────────────────────────────────────
  const row = document.createElement('div');
  row.className = 'row';

  const label = document.createElement('label');
  label.textContent = 'Progress';
  row.appendChild(label);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'timeline';
  slider.min = '0';
  slider.max = String(STEPS);
  slider.step = '1';
  slider.value = String(Math.round(getState().progress * STEPS));
  row.appendChild(slider);

  const readout = document.createElement('div');
  readout.className = 'value';
  readout.textContent = getState().progress.toFixed(2);
  row.appendChild(readout);

  section.appendChild(row);

  // ── DETONATE / RESET buttons ───────────────────────────────
  let rafId: number | null = null;

  const cancelAnim = (): void => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const startDetonate = (): void => {
    cancelAnim();
    // If progress is already at 1, restart from 0; otherwise continue
    // from the current scrub position so the user can replay a slice.
    const startProgress = getState().progress;
    const from = startProgress >= 1 ? 0 : startProgress;
    if (from !== startProgress) {
      setState({ progress: from });
    }
    const t0 = performance.now();
    const tick = (now: number): void => {
      const elapsed = now - t0;
      const t = Math.min(1, elapsed / DETONATE_DURATION_MS);
      const next = from + (1 - from) * t;
      setState({ progress: next });
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };
    rafId = requestAnimationFrame(tick);
  };

  const reset = (): void => {
    cancelAnim();
    setState({ progress: 0 });
  };

  const buttonRow = document.createElement('div');
  buttonRow.className = 'button-row';
  const detonateBtn = createButton({
    label: '▸ DETONATE',
    variant: 'detonate',
    onClick: startDetonate,
  });
  const resetBtn = createButton({
    label: 'RESET',
    variant: 'ghost',
    onClick: reset,
  });
  buttonRow.appendChild(detonateBtn);
  buttonRow.appendChild(resetBtn);
  section.appendChild(buttonRow);

  // ── Slider events ──────────────────────────────────────────
  // Manual scrub cancels rAF immediately so the slider responds to
  // pointer input even before the value changes.
  slider.addEventListener('pointerdown', cancelAnim);
  slider.addEventListener('input', () => {
    cancelAnim();
    const n = Number.parseInt(slider.value, 10);
    if (!Number.isFinite(n)) return;
    const progress = n / STEPS;
    readout.textContent = progress.toFixed(2);
    setState({ progress });
  });

  root.appendChild(section);

  return {
    update: (progress: number): void => {
      const rounded = String(Math.round(progress * STEPS));
      if (slider.value !== rounded) slider.value = rounded;
      readout.textContent = progress.toFixed(2);
    },
    cancel: cancelAnim,
  };
}
