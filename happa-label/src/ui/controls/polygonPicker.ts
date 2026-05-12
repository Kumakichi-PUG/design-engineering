/**
 * Vertex Count discrete picker — `3 | 4 | 5 | 6 | 7 | 8 | 10 | 12 | 16 | 24`.
 *
 * Matches parent happa v1.1 wireframe v0.10 `.polygon-picker` markup.
 * 5 columns × 2 rows grid; active button gets the accent fill.
 */

import type { AppState } from '../../state';

/** Allowed vertex counts per spec §4.1. */
const VERTEX_COUNTS: readonly number[] = [3, 4, 5, 6, 7, 8, 10, 12, 16, 24];

/** Handle for external sync. */
export interface PolygonPickerHandle {
  /** Push the store value into the DOM (active class). */
  update: (count: number) => void;
}

/**
 * Mount the vertex-count picker.
 *
 * @param root - Section container.
 * @param getState - Snapshot reader (initial active button).
 * @param setState - Patch writer; called on click with the new count.
 */
export function mountPolygonPicker(
  root: HTMLElement,
  getState: () => AppState,
  setState: (patch: Partial<AppState>) => void,
): PolygonPickerHandle {
  const picker = document.createElement('div');
  picker.className = 'polygon-picker';

  const buttons = new Map<number, HTMLButtonElement>();

  for (const n of VERTEX_COUNTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.n = String(n);
    btn.textContent = String(n);
    btn.addEventListener('click', () => {
      if (getState().vertexCount === n) return;
      setState({ vertexCount: n });
    });
    picker.appendChild(btn);
    buttons.set(n, btn);
  }

  const sync = (current: number): void => {
    for (const [n, btn] of buttons) {
      btn.classList.toggle('active', n === current);
    }
  };

  sync(getState().vertexCount);
  root.appendChild(picker);

  return { update: sync };
}
