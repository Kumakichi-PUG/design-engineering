/**
 * Section header factory.
 *
 * Each control group in the panel starts with a `<div class="section-label">`
 * (uppercase mono, 0.18em tracking) inside a `<div class="section">`
 * container, matching parent happa designtool v1.1 wireframe v0.10.
 *
 * Returns the section element so callers can append child controls (rows,
 * pickers, buttons) into it directly.
 */

/**
 * Create a section container with a heading and append it to `root`.
 *
 * @param root - The controls panel (typically `aside.controls`).
 * @param label - Uppercase section title (e.g. `"Colors"`, `"Animation"`).
 * @returns The new section element, ready to receive child rows.
 */
export function createSection(root: HTMLElement, label: string): HTMLElement {
  const section = document.createElement('div');
  section.className = 'section';

  const heading = document.createElement('div');
  heading.className = 'section-label';
  heading.textContent = label;
  section.appendChild(heading);

  root.appendChild(section);
  return section;
}
