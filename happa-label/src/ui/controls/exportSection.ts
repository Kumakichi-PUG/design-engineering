/**
 * Export section (spec §5.3 / §8 / FR-L01 / FR-L02 / FR-L03).
 *
 * - PNG Scale: `×1 | ×2 | ×4` segmented picker bound to `state.pngScale`.
 * - Download PNG / SVG / GIF buttons; each invokes the corresponding
 *   `src/export/*` function.
 *
 * PNG and GIF actions are async; we mark the button busy during the call
 * to avoid the user spamming it (GIF in particular can take several
 * seconds for 90-frame quantize + LZW).
 */

import { exportGIF } from '../../export/gif';
import { exportPNG } from '../../export/png';
import { exportSVG } from '../../export/svg';
import type { AppState, PngScale } from '../../state';
import { createButton } from './buttons';

/** PNG scale segments per spec §A.1. */
const SCALES: readonly PngScale[] = [1, 2, 4];

/** Handle for external sync. */
export interface ExportHandle {
  /** Push the store value into the segmented control (active class). */
  update: (scale: PngScale) => void;
}

/**
 * Mount the Export section.
 *
 * @param root - Controls container.
 * @param getState - Snapshot reader (also passed to exporters at click time).
 * @param setState - Patch writer for `pngScale`.
 */
export function mountExportSection(
  root: HTMLElement,
  getState: () => AppState,
  setState: (patch: Partial<AppState>) => void,
): ExportHandle {
  const section = document.createElement('div');
  section.className = 'section';

  const heading = document.createElement('div');
  heading.className = 'section-label';
  heading.textContent = 'Export';
  section.appendChild(heading);

  // ── PNG Scale segmented (3 buttons) ────────────────────────
  const scaleRow = document.createElement('div');
  scaleRow.className = 'row';
  const scaleLabel = document.createElement('label');
  scaleLabel.textContent = 'PNG Scale';
  scaleRow.appendChild(scaleLabel);

  const segmented = document.createElement('div');
  segmented.className = 'segmented segmented-3';
  // Stretch the segmented group to fill the row's remaining width.
  segmented.style.flex = '1';

  const buttons = new Map<PngScale, HTMLButtonElement>();
  for (const scale of SCALES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.scale = String(scale);
    btn.textContent = `×${scale}`;
    btn.addEventListener('click', () => {
      if (getState().pngScale === scale) return;
      setState({ pngScale: scale });
    });
    segmented.appendChild(btn);
    buttons.set(scale, btn);
  }

  const syncScale = (current: PngScale): void => {
    for (const [scale, btn] of buttons) {
      btn.classList.toggle('active', scale === current);
    }
  };

  syncScale(getState().pngScale);
  scaleRow.appendChild(segmented);
  section.appendChild(scaleRow);

  // ── Download buttons (PNG / SVG / GIF) ─────────────────────
  const downloadRow = document.createElement('div');
  downloadRow.className = 'button-row-3';

  let pngBusy = false;
  const pngBtn = createButton({
    label: 'PNG',
    variant: 'primary',
    onClick: () => {
      if (pngBusy) return;
      pngBusy = true;
      pngBtn.disabled = true;
      const state = getState();
      void exportPNG(state, state.pngScale)
        .catch((err: unknown) => {
          console.error('[export/png]', err);
        })
        .finally(() => {
          pngBusy = false;
          pngBtn.disabled = false;
        });
    },
  });

  const svgBtn = createButton({
    label: 'SVG',
    variant: 'primary',
    onClick: () => {
      // svg.ts is being implemented in parallel; treat as fire-and-forget.
      // The export-agent module owns the file-download mechanics.
      try {
        exportSVG(getState());
      } catch (err) {
        console.error('[export/svg]', err);
      }
    },
  });

  let gifBusy = false;
  const gifBtn = createButton({
    label: 'GIF',
    variant: 'primary',
    onClick: () => {
      if (gifBusy) return;
      gifBusy = true;
      gifBtn.disabled = true;
      void exportGIF(getState())
        .catch((err: unknown) => {
          console.error('[export/gif]', err);
        })
        .finally(() => {
          gifBusy = false;
          gifBtn.disabled = false;
        });
    },
  });

  downloadRow.appendChild(pngBtn);
  downloadRow.appendChild(svgBtn);
  downloadRow.appendChild(gifBtn);
  section.appendChild(downloadRow);

  root.appendChild(section);

  return { update: syncScale };
}
