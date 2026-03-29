import paper from 'paper';
import { createBlackShape } from './shape.js';
import {
  generateWhiteVertices,
  generateZigzagPoints,
  drawVertexLabels,
} from './innerShape.js';
import { createGUI, getNotchesFromParams } from './gui.js';
import { initAudio, stopAudio, getVolume, isActive } from './audio.js';

// Paper.jsの初期化
const canvas = document.getElementById('visualizer');
paper.setup(canvas);

// 背景（最背面に固定）
const bgRect = new paper.Path.Rectangle({
  point: [0, 0],
  size: [1920, 1080],
  fillColor: '#f8f8f8',
});

// --- 描画オブジェクト ---
let blackPath = null;
let whitePath = null;
let debugGroup = null;

// --- スムージング用ステート ---
let smoothedVolume = 0;
let smoothedWidth = 0;       // 幅専用のイージング
let smoothedNotchClose = 0;  // ノッチ閉じ専用のイージング

// --- キャッシュ ---
let cachedNotches = null;

/**
 * 構造パラメーター変更時
 */
function onStructureChange() {
  cachedNotches = getNotchesFromParams(params);
}

/**
 * lerp（線形補間）
 */
function lerp(current, target, factor) {
  return current + (target - current) * factor;
}

/**
 * 毎フレーム呼ばれる描画更新
 */
function updateFrame(event) {
  const time = event.time;

  // --- 音量取得 → スムージング ---
  const rawVolume = getVolume();
  const scaledVolume = Math.min(1, rawVolume * params.sensitivity);

  // 音量のスムージング（アタック速い / リリース遅い）
  if (scaledVolume > smoothedVolume) {
    smoothedVolume = lerp(smoothedVolume, scaledVolume, 0.4);
  } else {
    smoothedVolume = lerp(smoothedVolume, scaledVolume, 0.08);
  }

  const vol = smoothedVolume;

  // --- 幅のイージング（別レートでより滑らかに） ---
  const targetWidth = vol;
  const targetNotchClose = vol;

  // 幅: ゆっくり膨張、さらにゆっくり収縮
  if (targetWidth > smoothedWidth) {
    smoothedWidth = lerp(smoothedWidth, targetWidth, 0.12);
  } else {
    smoothedWidth = lerp(smoothedWidth, targetWidth, 0.04);
  }

  // ノッチ閉じ: 幅と同期しつつ少しだけ速い
  if (targetNotchClose > smoothedNotchClose) {
    smoothedNotchClose = lerp(smoothedNotchClose, targetNotchClose, 0.18);
  } else {
    smoothedNotchClose = lerp(smoothedNotchClose, targetNotchClose, 0.06);
  }

  // --- 音量 → 各パラメーター ---
  const widthFactor = smoothedWidth;
  const notchCloseFactor = smoothedNotchClose;
  const indentAmount = vol * params.maxIndent;
  const ambientAmount = params.ambientAmount;

  // デバッグ: 1秒ごとに音量パイプラインの値を出力
  if (!updateFrame._lastLog || Date.now() - updateFrame._lastLog > 1000) {
    updateFrame._lastLog = Date.now();
    if (rawVolume > 0) {
      console.log('[Main] raw:', rawVolume.toFixed(4), 'scaled:', scaledVolume.toFixed(4), 'smoothed:', vol.toFixed(4), 'width:', widthFactor.toFixed(4), 'indent:', indentAmount.toFixed(1));
    }
  }

  // --- 黒オブジェクト ---
  const notches = cachedNotches || getNotchesFromParams(params);
  const blackVerts = createBlackShape(notches, notchCloseFactor, widthFactor, params.blackColor);

  if (blackPath) blackPath.remove();
  blackPath = blackVerts.path;

  // --- 白オブジェクト ---
  const whiteVerts = generateWhiteVertices(blackVerts.vertices);
  const zigzagPts = generateZigzagPoints(
    whiteVerts,
    params.totalPoints,
    indentAmount,
    time,
    ambientAmount,
    params.randomAmount,
    params.spacingRandomAmount,
    params.angleRandomAmount,
    params.clampStrength,
  );

  if (whitePath) {
    if (whitePath.segments.length === zigzagPts.length) {
      for (let i = 0; i < zigzagPts.length; i++) {
        whitePath.segments[i].point = zigzagPts[i];
      }
    } else {
      whitePath.remove();
      whitePath = new paper.Path({
        segments: zigzagPts,
        closed: true,
        fillColor: params.whiteColor,
        strokeColor: null,
      });
    }
  } else {
    whitePath = new paper.Path({
      segments: zigzagPts,
      closed: true,
      fillColor: params.whiteColor,
      strokeColor: null,
    });
  }

  // --- z-order ---
  whitePath.insertAbove(blackPath);

  // --- デバッグ表示 ---
  if (debugGroup) debugGroup.remove();
  debugGroup = null;
  if (params.showDebug) {
    debugGroup = drawVertexLabels(blackVerts.vertices, whiteVerts);
  }
}

// --- GUI構築 ---
const { params, setColorChangeHandler } = createGUI(onStructureChange);
onStructureChange();

// カラー変更時: パスの fillColor だけを更新（形状再生成なし）
setColorChangeHandler(() => {
  document.body.style.backgroundColor = params.outsideColor;
  bgRect.fillColor = params.bgColor;
  if (blackPath) blackPath.fillColor = params.blackColor;
  if (whitePath) whitePath.fillColor = params.whiteColor;
});

// --- マイク スタート/ストップ ---
const micBtn = document.getElementById('mic-btn');
let micActive = false;

micBtn.addEventListener('click', async () => {
  if (micActive) {
    // ストップ
    stopAudio();
    micActive = false;
    micBtn.textContent = 'MIC OFF';
    micBtn.classList.remove('active');
  } else {
    // スタート
    micBtn.disabled = true;
    micBtn.textContent = '接続中...';
    const ok = await initAudio();
    micBtn.disabled = false;
    if (ok) {
      micActive = true;
      micBtn.textContent = 'MIC ON';
      micBtn.classList.add('active');
    } else {
      micBtn.textContent = 'MIC OFF';
    }
  }
});

// --- SVGエクスポート ---
const svgBtn = document.getElementById('svg-btn');
svgBtn.addEventListener('click', () => {
  // エクスポート時はデバッグ表示を一時的に非表示にする
  if (debugGroup) debugGroup.visible = false;
  const svg = paper.project.exportSVG({ asString: true });
  if (debugGroup) debugGroup.visible = true;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `visualizer-${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
});

// --- アニメーションループ ---
paper.view.onFrame = updateFrame;

console.log('Interactive Visualizer 起動完了');
