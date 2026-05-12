/**
 * Color row — hex text input + native color picker for one color field.
 *
 * Bidirectional binding:
 * - Native `<input type="color">`: commits on every `input` event
 *   (so dragging the picker is real-time, matching the parent wireframe).
 * - Hex `<input type="text">`: commits only when the value is a valid
 *   `#rrggbb` string, on `change` or `blur`. Invalid input gets an
 *   accent border via the `.invalid` class until the user fixes it.
 */

import type { AppState } from '../../state';

/** State fields this row may bind to. happa-label has only 2 colors (DL-1). */
export type ColorField = 'surfaceColor' | 'innerColor';

/** `#rrggbb` validator. */
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** Handle for external sync. */
export interface ColorRowHandle {
  /** Push the store value into both inputs. */
  update: (hex: string) => void;
}

/** Normalize `#RRGGBB` to lowercase. Returns input unchanged if not valid. */
function normalize(hex: string): string {
  return HEX_PATTERN.test(hex) ? hex.toLowerCase() : hex;
}

/**
 * Mount one color row.
 *
 * @param root - Section container.
 * @param getState - Snapshot reader (initial value).
 * @param setState - Patch writer; called on every valid color change.
 * @param label - Row label (e.g. `"Surface"`).
 * @param field - State field this row writes.
 */
export function mountColorRow(
  root: HTMLElement,
  getState: () => AppState,
  setState: (patch: Partial<AppState>) => void,
  label: string,
  field: ColorField,
): ColorRowHandle {
  const row = document.createElement('div');
  row.className = 'color-row';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  row.appendChild(labelEl);

  const swatch = document.createElement('div');
  swatch.className = 'color-swatch';

  const initial = normalize(getState()[field]);

  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.value = initial.toUpperCase();
  textInput.spellcheck = false;
  textInput.maxLength = 7;
  textInput.setAttribute('aria-label', `${label} hex`);

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = initial;
  colorInput.setAttribute('aria-label', `${label} swatch`);

  // Native picker: real-time drag updates.
  colorInput.addEventListener('input', () => {
    const hex = normalize(colorInput.value);
    textInput.classList.remove('invalid');
    textInput.value = hex.toUpperCase();
    setState({ [field]: hex } as Partial<AppState>);
  });

  // Hex text: validate on input (visual cue), commit on change / blur.
  const commitText = (): void => {
    const raw = textInput.value.trim();
    if (HEX_PATTERN.test(raw)) {
      const hex = normalize(raw);
      textInput.classList.remove('invalid');
      textInput.value = hex.toUpperCase();
      colorInput.value = hex;
      setState({ [field]: hex } as Partial<AppState>);
    } else {
      // Revert to current store value on blur if user typed garbage.
      const current = normalize(getState()[field]);
      textInput.classList.remove('invalid');
      textInput.value = current.toUpperCase();
      colorInput.value = current;
    }
  };
  textInput.addEventListener('input', () => {
    const raw = textInput.value.trim();
    textInput.classList.toggle('invalid', raw.length > 0 && !HEX_PATTERN.test(raw));
  });
  textInput.addEventListener('change', commitText);
  textInput.addEventListener('blur', commitText);

  swatch.appendChild(textInput);
  swatch.appendChild(colorInput);
  row.appendChild(swatch);
  root.appendChild(row);

  return {
    update: (hex: string): void => {
      const next = normalize(hex);
      // Guard: only rewrite when the value drifted (avoids picker flicker
      // on Safari, where reassigning input.value reopens internal state).
      if (colorInput.value.toLowerCase() !== next.toLowerCase()) {
        colorInput.value = next;
      }
      const upper = next.toUpperCase();
      if (textInput.value !== upper) {
        textInput.value = upper;
      }
      textInput.classList.remove('invalid');
    },
  };
}
