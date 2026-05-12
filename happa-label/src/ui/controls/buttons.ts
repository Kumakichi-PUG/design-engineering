/**
 * Button helpers — accent / ghost / detonate variants.
 *
 * Pure DOM factories; no store binding. Callers attach click handlers
 * and append the returned element to a section.
 */

/** Visual variant of a button. */
export type ButtonVariant = 'primary' | 'ghost' | 'detonate';

/** Options for `createButton`. */
export interface ButtonOptions {
  /** Visible caps label (e.g. `"RESET"`). */
  label: string;
  /** Optional click handler. */
  onClick?: () => void;
  /** Visual variant. Defaults to `'primary'` (bordered, monospace caps). */
  variant?: ButtonVariant;
  /** Extra class names to append (e.g. `"btn-shuffle"` for margin). */
  extraClass?: string;
}

/**
 * Build a `<button class="btn ...">` matching the parent design system.
 *
 * - `primary`: bordered ghost; text + border light up on hover.
 * - `ghost`: dim2 text, same border. Used for secondary actions
 *   (RESET, Clear, SHUFFLE SEED, RANDOMIZE COLORS).
 * - `detonate`: accent-filled, high-tracking, the loudest element in UI.
 */
export function createButton(options: ButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = options.label;
  const variant = options.variant ?? 'primary';
  const classes = ['btn'];
  if (variant === 'ghost') classes.push('ghost');
  if (variant === 'detonate') classes.push('detonate');
  if (options.extraClass) classes.push(options.extraClass);
  btn.className = classes.join(' ');
  if (options.onClick) {
    btn.addEventListener('click', options.onClick);
  }
  return btn;
}
