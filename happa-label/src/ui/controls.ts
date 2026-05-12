/**
 * happa-label v0.1 — controls panel entry point (Phase C).
 *
 * Assembles every section listed in spec §8 in order:
 *   brand → Aspect Ratio → Animation → Shape → Colors → Layout →
 *   Fragmentation → Explosion → Overlay → Guides → Export
 *
 * Visual language is inherited from parent happa designtool v1.1
 * (DL-7): dark theme, monospace, accent `#ff3300`. Text / font
 * controls and the third color from the parent are intentionally
 * absent (happa-label/AGENTS.md §6 禁忌 §2 / §4).
 *
 * The panel binds bidirectionally to the global store: every input
 * pushes a `setState` patch, and a single `subscribe` callback at the
 * bottom re-syncs every control from the next state snapshot. This
 * keeps RANDOMIZE COLORS, SHUFFLE SEED, and the DETONATE rAF loop
 * reflected everywhere without per-control listeners.
 */

import { randomComplementaryPair } from '../core/color';
import { type AppState, subscribe } from '../state';
import { mountAspectRatio } from './controls/aspectRatio';
import { createButton } from './controls/buttons';
import { mountColorRow } from './controls/colorRow';
import { mountExportSection } from './controls/exportSection';
import { mountOverlaySection } from './controls/overlaySection';
import { mountPolygonPicker } from './controls/polygonPicker';
import { createSection } from './controls/section';
import { mountSlider, type SliderHandle } from './controls/slider';
import { mountTimeline } from './controls/timeline';
import { mountToggleRow } from './controls/toggleRow';

/**
 * Mount the controls panel into `container`.
 *
 * @param container - The `<aside class="controls">` element.
 * @param getState - Snapshot reader (every binding reads through this).
 * @param setState - Patch writer (every input writes through this).
 */
export function mountControls(
  container: HTMLElement,
  getState: () => AppState,
  setState: (patch: Partial<AppState>) => void,
): void {
  container.replaceChildren();

  // ── Brand header ───────────────────────────────────────────
  const brand = document.createElement('div');
  brand.className = 'brand';
  const brandLeft = document.createElement('div');
  const brandTitle = document.createElement('div');
  brandTitle.className = 'brand-title';
  brandTitle.textContent = 'happa-label';
  const brandSub = document.createElement('div');
  brandSub.className = 'brand-sub';
  brandSub.textContent = 'v0.1';
  brandLeft.appendChild(brandTitle);
  brandLeft.appendChild(brandSub);
  brand.appendChild(brandLeft);
  container.appendChild(brand);

  // ── 1. Aspect Ratio ────────────────────────────────────────
  const aspectSection = createSection(container, 'Aspect Ratio');
  const aspectHandle = mountAspectRatio(aspectSection, getState, setState);

  // ── 2. Animation (Progress + DETONATE / RESET) ─────────────
  const timelineHandle = mountTimeline(container, getState, setState);

  // ── 3. Shape — Regular Polygon ─────────────────────────────
  const shapeSection = createSection(container, 'Shape ─ Regular Polygon');
  const polygonHandle = mountPolygonPicker(shapeSection, getState, setState);
  const shapeJitterHandle = mountSlider(shapeSection, getState, setState, {
    label: 'Shape Jitter (%)',
    field: 'shapeRandomness',
    min: 0,
    max: 100,
    step: 1,
  });

  // ── 4. Colors ──────────────────────────────────────────────
  const colorsSection = createSection(container, 'Colors');
  const surfaceHandle = mountColorRow(colorsSection, getState, setState, 'Surface', 'surfaceColor');
  const innerHandle = mountColorRow(colorsSection, getState, setState, 'Inner', 'innerColor');
  const randomizeBtn = createButton({
    label: '↻ Randomize Colors',
    variant: 'ghost',
    extraClass: 'btn-randomize-colors',
    onClick: () => {
      const pair = randomComplementaryPair();
      setState({ surfaceColor: pair.surface, innerColor: pair.inner });
    },
  });
  colorsSection.appendChild(randomizeBtn);

  // ── 5. Layout ──────────────────────────────────────────────
  const layoutSection = createSection(container, 'Layout');
  const gutterHandle = mountSlider(layoutSection, getState, setState, {
    label: 'Edge Band (%)',
    field: 'gutterPct',
    min: 4,
    max: 24,
    step: 1,
  });
  const bleedHandle = mountSlider(layoutSection, getState, setState, {
    label: 'Bleed (×band)',
    field: 'bleedMult',
    min: 0,
    max: 2,
    step: 0.1,
    formatValue: (v) => v.toFixed(1),
  });

  // ── 6. Fragmentation — Voronoi ─────────────────────────────
  const fragSection = createSection(container, 'Fragmentation ─ Voronoi');
  const fragCountHandle = mountSlider(fragSection, getState, setState, {
    label: '破片数 Count',
    field: 'fragmentCount',
    min: 20,
    max: 200,
    step: 1,
  });
  const cellJitterHandle = mountSlider(fragSection, getState, setState, {
    label: 'Cell Jitter (%)',
    field: 'randomness',
    min: 0,
    max: 100,
    step: 1,
  });

  // ── 7. Explosion — Fragment Motion ─────────────────────────
  const motionSection = createSection(container, 'Explosion ─ Fragment Motion');
  const innerDispHandle = mountSlider(motionSection, getState, setState, {
    label: 'Inner Disp (%)',
    field: 'innerDispPct',
    min: 0,
    max: 30,
    step: 0.5,
    formatValue: (v) => v.toFixed(1),
  });
  const perimMultHandle = mountSlider(motionSection, getState, setState, {
    label: 'Perim Mult (×)',
    field: 'perimMult',
    min: 1,
    max: 5,
    step: 0.1,
    formatValue: (v) => v.toFixed(1),
  });
  const speedVarHandle = mountSlider(motionSection, getState, setState, {
    label: 'Speed Variance (%)',
    field: 'speedVariance',
    min: 0,
    max: 100,
    step: 1,
  });
  const dirNoiseHandle = mountSlider(motionSection, getState, setState, {
    label: 'Direction Noise (°)',
    field: 'directionNoise',
    min: 0,
    max: 60,
    step: 1,
  });
  const rotationHandle = mountSlider(motionSection, getState, setState, {
    label: 'Rotation (%)',
    field: 'rotation',
    min: 0,
    max: 100,
    step: 1,
  });
  const shuffleBtn = createButton({
    label: '↻ Shuffle Seed',
    variant: 'ghost',
    extraClass: 'btn-shuffle',
    onClick: () => {
      setState({ seed: Math.random() });
    },
  });
  motionSection.appendChild(shuffleBtn);

  // ── 8. Overlay (toggle + loader + clear) ───────────────────
  const overlayHandle = mountOverlaySection(container, getState, setState);

  // ── 9. Guides ──────────────────────────────────────────────
  const guidesSection = createSection(container, 'Guides');
  const hullHandle = mountToggleRow(guidesSection, getState, setState, {
    label: 'Show innerPoly',
    field: 'showHull',
  });
  const cellsHandle = mountToggleRow(guidesSection, getState, setState, {
    label: 'Cell Edges',
    field: 'showCells',
  });

  // ── 10. Export ─────────────────────────────────────────────
  const exportHandle = mountExportSection(container, getState, setState);

  // ── External state → UI sync ───────────────────────────────
  // One subscription updates every control. Slider handles guard
  // against caret-jump by only writing when the DOM value drifted
  // from the store value (see slider.ts).
  //
  // The sliders below are grouped into one array so adding a new
  // field requires only one new line — easy to keep in sync with
  // the section definitions above.
  const sliderHandles: ReadonlyArray<readonly [SliderHandle, (s: AppState) => number]> = [
    [shapeJitterHandle, (s): number => s.shapeRandomness],
    [gutterHandle, (s): number => s.gutterPct],
    [bleedHandle, (s): number => s.bleedMult],
    [fragCountHandle, (s): number => s.fragmentCount],
    [cellJitterHandle, (s): number => s.randomness],
    [innerDispHandle, (s): number => s.innerDispPct],
    [perimMultHandle, (s): number => s.perimMult],
    [speedVarHandle, (s): number => s.speedVariance],
    [dirNoiseHandle, (s): number => s.directionNoise],
    [rotationHandle, (s): number => s.rotation],
  ];

  subscribe((state) => {
    aspectHandle.update(state.aspectRatio);
    polygonHandle.update(state.vertexCount);
    timelineHandle.update(state.progress);
    surfaceHandle.update(state.surfaceColor);
    innerHandle.update(state.innerColor);
    overlayHandle.update(state.showOverlay, state.overlayDataUrl);
    hullHandle.update(state.showHull);
    cellsHandle.update(state.showCells);
    exportHandle.update(state.pngScale);
    for (const [handle, read] of sliderHandles) {
      handle.update(read(state));
    }
  });
}
