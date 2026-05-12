/**
 * happa-label v0.1 — エントリポイント（Phase A bootstrap）。
 *
 * - `#app` 直下の `.controls` / `.stage` を取り、`.stage` に `<canvas>`
 *   を一つ用意する。
 * - canvas の**バッキングストア解像度**（`width`/`height` 属性）は
 *   `computeLayout(state).outerW/H` に追従させる。CSS では `max-width`
 *   / `max-height` でステージにフィットさせるだけで、解像度には触らない。
 * - 状態購読 → 再 render の単純ループ。effects.ts の `Invalidation` は
 *   将来 scene キャッシュを導入する際の入口として用意してあるが、
 *   Phase A の段階では render-agent 側が毎回 buildScene() しているので
 *   ここでは利用しない。
 *
 * render-agent との契約（spec §9 / §10.1 / Phase A）:
 *   `src/render/index.ts` が `render(ctx, state)` と `computeLayout(state)`
 *   をエクスポートする。本ファイルはその 2 シンボルだけに依存する。
 */

import './styles/reset.css';
import './styles/tokens.css';
import './styles/app.css';

import { computeLayout, render } from './render';
import { getState, setState, subscribe } from './state';
import { mountControls } from './ui/controls';

function bootstrap(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('[happa-label] #app element not found');
    return;
  }

  const controlsEl = app.querySelector<HTMLElement>('.controls');
  const stageEl = app.querySelector<HTMLElement>('.stage');
  if (!controlsEl || !stageEl) {
    console.error('[happa-label] .controls / .stage element not found');
    return;
  }

  // 最低限のアプリ枠だけ整える。Phase B/C で @ui-agent が正式に整える。
  document.body.style.background = '#0a0a0a';
  document.body.style.color = '#e6e6e6';
  document.body.style.margin = '0';
  document.body.style.minHeight = '100vh';
  app.style.cssText = [
    'display: grid',
    'grid-template-columns: minmax(240px, 320px) 1fr',
    'min-height: 100vh',
  ].join('; ');
  stageEl.style.cssText = [
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'padding: 24px',
    'box-sizing: border-box',
    'min-width: 0',
    'min-height: 0',
  ].join('; ');

  // Canvas を生成し、表示サイズだけ CSS で抑える（内部解像度は applyRender で設定）。
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'max-width: 100%; max-height: 100%; display: block; margin: auto;';
  stageEl.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('[happa-label] failed to acquire 2D context');
    return;
  }

  const applyRender = (): void => {
    const state = getState();
    const layout = computeLayout(state);
    if (canvas.width !== layout.outerW || canvas.height !== layout.outerH) {
      canvas.width = layout.outerW;
      canvas.height = layout.outerH;
    }
    render(ctx, state);
  };

  subscribe(applyRender);
  mountControls(controlsEl, getState, setState);

  applyRender();
}

bootstrap();
