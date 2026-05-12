/**
 * Overlay section — Enable toggle + Load Image button + Clear button.
 *
 * happa-label v0.1 has a single overlay slot (DL-6); the parent's
 * 4-slot Overlay Images block is intentionally simplified. The actual
 * file-loading + validation logic lives in `ui/overlayPicker.ts`
 * (`attachOverlayLoader` / `clearOverlay`); this module is purely the
 * section's DOM and wiring.
 */

import type { AppState } from '../../state';
import { attachOverlayLoader, clearOverlay } from '../overlayPicker';
import { createButton } from './buttons';
import { mountToggleRow } from './toggleRow';

/** Handle returned for external sync. */
export interface OverlayHandle {
  /**
   * Push the store value into the DOM:
   * - the Enable toggle ON/OFF state
   * - the file label's "loaded" appearance and filename readout
   *   (`overlayDataUrl` presence flips it on; absence flips it off)
   */
  update: (enabled: boolean, dataUrl: string | null) => void;
}

/**
 * Mount the Overlay section.
 *
 * @param root - Controls container.
 * @param getState - Snapshot reader.
 * @param setState - Patch writer.
 */
export function mountOverlaySection(
  root: HTMLElement,
  getState: () => AppState,
  setState: (patch: Partial<AppState>) => void,
): OverlayHandle {
  const section = document.createElement('div');
  section.className = 'section';

  const heading = document.createElement('div');
  heading.className = 'section-label';
  heading.textContent = 'Overlay';
  section.appendChild(heading);

  const toggleHandle = mountToggleRow(section, getState, setState, {
    label: 'Enable',
    field: 'showOverlay',
  });

  // Dashed "Load Image" label is the hit area for the hidden file input.
  // On successful load the label flips to .loaded styling and shows the
  // filename. The file input itself is hidden via CSS.
  const fileLabel = document.createElement('label');
  fileLabel.className = 'file-label';

  const fileLabelText = document.createElement('span');
  fileLabelText.className = 'filename';
  fileLabelText.textContent = '↑ Load Image (PNG)';
  fileLabel.appendChild(fileLabelText);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/png,image/*';
  fileLabel.appendChild(fileInput);

  section.appendChild(fileLabel);

  attachOverlayLoader(fileInput, setState);

  // Capture the chosen filename for the dashed label. We can't read it
  // from the store (only the data URL is stored), so we mirror it here
  // and rely on the subscribe-driven `update` to reset on clear.
  let lastFilename: string | null = null;
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) lastFilename = file.name;
  });

  const clearBtn = createButton({
    label: '✕ Clear',
    variant: 'ghost',
    onClick: () => {
      clearOverlay(setState);
      fileInput.value = '';
      lastFilename = null;
    },
  });
  section.appendChild(clearBtn);

  const syncLabel = (dataUrl: string | null): void => {
    if (dataUrl) {
      fileLabel.classList.add('loaded');
      fileLabelText.textContent = lastFilename ?? 'overlay loaded';
    } else {
      fileLabel.classList.remove('loaded');
      fileLabelText.textContent = '↑ Load Image (PNG)';
    }
  };

  // Initial sync.
  syncLabel(getState().overlayDataUrl);

  root.appendChild(section);

  return {
    update: (enabled, dataUrl): void => {
      toggleHandle.update(enabled);
      syncLabel(dataUrl);
    },
  };
}
