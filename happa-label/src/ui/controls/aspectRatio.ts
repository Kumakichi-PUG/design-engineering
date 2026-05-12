/**
 * Aspect Ratio segmented control — `16:9 | 4:3 | 1:1 | 9:16`.
 *
 * Matches parent happa v1.1 wireframe v0.10 `.segmented` markup. Active
 * button gets the inverted-on-text background; siblings are dim.
 */

import type { AppState, AspectRatio } from '../../state';

/** Ordered per spec §8. */
const RATIOS: readonly AspectRatio[] = ['16:9', '4:3', '1:1', '9:16'];

/** Handle for external sync. */
export interface AspectRatioHandle {
  /** Push the store value into the DOM (active class). */
  update: (ratio: AspectRatio) => void;
}

/**
 * Mount the Aspect Ratio segmented control.
 *
 * @param root - Section container.
 * @param getState - Snapshot reader (initial active button).
 * @param setState - Patch writer; called on click with the new ratio.
 */
export function mountAspectRatio(
  root: HTMLElement,
  getState: () => AppState,
  setState: (patch: Partial<AppState>) => void,
): AspectRatioHandle {
  const segmented = document.createElement('div');
  segmented.className = 'segmented';

  const buttons = new Map<AspectRatio, HTMLButtonElement>();

  for (const ratio of RATIOS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.ratio = ratio;
    btn.textContent = ratio;
    btn.addEventListener('click', () => {
      if (getState().aspectRatio === ratio) return;
      setState({ aspectRatio: ratio });
    });
    segmented.appendChild(btn);
    buttons.set(ratio, btn);
  }

  const sync = (current: AspectRatio): void => {
    for (const [ratio, btn] of buttons) {
      btn.classList.toggle('active', ratio === current);
    }
  };

  sync(getState().aspectRatio);
  root.appendChild(segmented);

  return { update: sync };
}
