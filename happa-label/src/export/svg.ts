/**
 * SVG 書き出し（happa-label v0.1、spec §5.3 FR-L02 / §6.5）。
 *
 * 現 progress フレームをベクターで書き出す。`progress === 0` では innerPoly を
 * 単一 `<path>` で塗り、`progress > 0` では innerColor を base に敷いた上に
 * displaced Voronoi セル群を 1 本の `<path>` に結合し `clip-path="url(#inner-clip)"`
 * で innerPoly 内にクリップする（Canvas 側 `renderExplosion` の Unified Path2D と
 * 同等の構造、spec §6.5）。
 *
 * Overlay 画像は base64 data URL を `<image>` に埋め込み、`preserveAspectRatio
 * ="xMidYMid meet"` で innerPoly AABB に対し aspect 保持 contain（drawOverlay と
 * 同挙動）する（spec §6.4 / §6.5）。
 *
 * 本ファイルは render/explosion.ts の `transformPoly` を再実装している（同ファイル
 * から export されていないため、依存方向を作らず local copy で同期を取る）。
 *
 * 設計参照: `docs/happa-label-spec.md` §6.5。
 */

import { easeOutExpo } from '../core/easing';
import { polygonAABB } from '../core/polygon';
import type { Cell, Vec2 } from '../core/types';
import { buildScene, computeLayout } from '../render';
import type { AppState } from '../state';

/**
 * polygon を `M x y L x y L … Z` 形式の SVG path d 属性値に変換する。
 *
 * 頂点 3 未満は空文字を返す（描画されない）。座標値はそのまま埋め込む
 * （Layout 座標は浮動小数だが SVG パーサが許容する）。
 */
function polyToPathD(poly: Vec2[]): string {
  if (poly.length < 3) return '';
  const first = poly[0];
  if (!first) return '';
  const rest = poly
    .slice(1)
    .map((p) => `L${p[0]} ${p[1]}`)
    .join(' ');
  return `M${first[0]} ${first[1]} ${rest} Z`;
}

/**
 * cell.points を progress で displaced polygon に変換する（spec §4.4 + §4.5）。
 *
 * `render/explosion.ts` の `transformPoly` と完全に同じ式:
 * - `p = easeOutExpo(progress)`
 * - 各頂点を `cell.centroid` 基準で `cell.rot × p` rad 回転
 * - 続いて `[cell.vx × p, cell.vy × p]` 平行移動
 *
 * `explosion.ts` の helper は export されていないので、依存方向を増やさない
 * ため local copy で持つ。式を変更する際は両者を同期させること。
 */
function transformCellPoly(cell: Cell, progress: number): Vec2[] {
  const p = easeOutExpo(progress);
  const angle = cell.rot * p;
  const ox = cell.vx * p;
  const oy = cell.vy * p;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const [cx, cy] = cell.centroid;
  return cell.points.map((v) => {
    const dx = v[0] - cx;
    const dy = v[1] - cy;
    const rx = cx + dx * cos - dy * sin;
    const ry = cy + dx * sin + dy * cos;
    return [rx + ox, ry + oy] as Vec2;
  });
}

/**
 * `<image href="…">` などの属性値に dataUrl を埋める際の最小限の XML エスケープ。
 *
 * happa-label の Overlay は PNG / 透過 PNG の data URL なので実用上 `&` 等は
 * 出現しないが、防御的に `& < > " '` を escape する。
 */
function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 現フレームを SVG として組み立て、ブラウザにダウンロードさせる（spec §6.5）。
 *
 * ファイル名は kickoff §5.4 の規約 `happa-label_<unix-ms>.svg`。
 *
 * @param state 現在の AppState。
 */
export function exportSVG(state: AppState): void {
  const L = computeLayout(state);
  const scene = buildScene(L, state);

  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.outerW} ${L.outerH}" width="${L.outerW}" height="${L.outerH}">`,
  );
  out.push(
    `<defs><clipPath id="inner-clip"><path d="${polyToPathD(scene.innerPoly)}"/></clipPath></defs>`,
  );

  if (state.progress === 0) {
    // pre-explosion: innerPoly 単一 fill（Voronoi は表に出さない、spec §4.2 progress=0 case）。
    out.push(`<path d="${polyToPathD(scene.innerPoly)}" fill="${state.surfaceColor}"/>`);
  } else {
    // explosion: innerColor base → 結合 path を innerColor clip 内に surfaceColor で塗る。
    out.push(`<path d="${polyToPathD(scene.innerPoly)}" fill="${state.innerColor}"/>`);
    const combined = scene.cells
      .map((c) => polyToPathD(transformCellPoly(c, state.progress)))
      .filter((d) => d.length > 0)
      .join(' ');
    if (combined.length > 0) {
      out.push(`<path d="${combined}" fill="${state.surfaceColor}" clip-path="url(#inner-clip)"/>`);
    }
  }

  if (state.showOverlay && state.overlayDataUrl) {
    const [minX, minY, maxX, maxY] = polygonAABB(scene.innerPoly);
    const href = escapeXmlAttr(state.overlayDataUrl);
    out.push(
      `<image href="${href}" x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" clip-path="url(#inner-clip)" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  out.push(`</svg>`);
  const svgString = out.join('\n');

  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `happa-label_${Date.now()}.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}
