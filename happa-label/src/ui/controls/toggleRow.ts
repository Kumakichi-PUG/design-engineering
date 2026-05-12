/**
 * Toggle row — boolean control rendered as a bordered row with ON/OFF
 * text and accent border when active. Matches parent happa v1.1
 * `.toggle-row` (wireframe v0.10 L48–51).
 *
 * Uses `role="switch"` + `tabindex` so keyboard users can toggle with
 * Space / Enter without bringing in a native checkbox (its UA rendering
 * would clash with the monochrome design system).
 */

import type { AppState } from '../../state';

/** Boolean-valued fields on `AppState`. */
type BooleanField = {
  [K in keyof AppState]: AppState[K] extends boolean ? K : never;
}[keyof AppState];

/** Options for `mountToggleRow`. */
export interface ToggleRowOptions {
  /** Left-side label (e.g. `"Enable"`, `"Cell Edges"`). */
  label: string;
  /** Boolean state field. */
  field: BooleanField;
}

/** Handle for external sync. */
export interface ToggleRowHandle {
  /** Push the store value into the DOM (class + ON/OFF + aria). */
  update: (on: boolean) => void;
}

/**
 * Mount one toggle row.
 *
 * @param root - Section container.
 * @param getState - Snapshot reader; used for initial value only.
 * @param setState - Patch writer; toggles the field on click / keypress.
 * @param options - Label and bound boolean field.
 */
export function mountToggleRow(
  root: HTMLElement,
  getState: () => AppState,
  setState: (patch: Partial<AppState>) => void,
  options: ToggleRowOptions,
): ToggleRowHandle {
  const row = document.createElement('div');
  row.className = 'toggle-row';
  row.setAttribute('role', 'switch');
  row.setAttribute('tabindex', '0');

  const labelSpan = document.createElement('span');
  labelSpan.textContent = options.label;

  const stateSpan = document.createElement('span');
  stateSpan.className = 'state';

  row.appendChild(labelSpan);
  row.appendChild(stateSpan);

  const sync = (on: boolean): void => {
    row.classList.toggle('active', on);
    row.setAttribute('aria-checked', on ? 'true' : 'false');
    stateSpan.textContent = on ? 'ON' : 'OFF';
  };

  sync(getState()[options.field]);

  const toggle = (): void => {
    const current = getState()[options.field];
    setState({ [options.field]: !current } as Partial<AppState>);
  };

  row.addEventListener('click', toggle);
  row.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  });

  root.appendChild(row);

  return { update: sync };
}
