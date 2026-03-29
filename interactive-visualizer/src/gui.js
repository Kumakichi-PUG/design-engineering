import GUI from 'lil-gui';

// --- OKLCH → hex 変換 ---
// OKLab → linear sRGB → sRGB gamma → hex

/**
 * OKLCH を hex カラー文字列に変換する
 *
 * @param {number} L - 明度 (0–1)
 * @param {number} C - 彩度 (0–0.4)
 * @param {number} H - 色相 (0–360)
 * @returns {string} hex カラー (#rrggbb)
 */
function oklchToHex(L, C, H) {
  const hRad = H * Math.PI / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLab → LMS (逆変換)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // LMS → linear sRGB
  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // linear → sRGB gamma
  r = linearToSrgb(r);
  g = linearToSrgb(g);
  bl = linearToSrgb(bl);

  // clamp & hex
  const toHex = (v) => {
    const clamped = Math.max(0, Math.min(1, v));
    const byte = Math.round(clamped * 255);
    return byte.toString(16).padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function linearToSrgb(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x < 0.0031308
    ? 12.92 * x
    : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

/**
 * プリセット定義
 */
const PRESETS = {
  '矩形': [],
  'F型': [
    { y: 0.20, height: 0.12, depth: 200 },
    { y: 0.48, height: 0.38, depth: 450 },
  ],
  'E型': [
    { y: 0.18, height: 0.12, depth: 350 },
    { y: 0.45, height: 0.10, depth: 350 },
    { y: 0.73, height: 0.12, depth: 350 },
  ],
  'L型': [
    { y: 0.05, height: 0.75, depth: 500 },
  ],
  'T型': [
    { y: 0.25, height: 0.75, depth: 600 },
  ],
};

/**
 * スライダーUIを構築する
 *
 * @param {Function} onUpdate - 構造パラメーター変更時のコールバック
 * @returns {{ gui: GUI, params: object }}
 */
export function createGUI(onUpdate) {
  const params = {
    preset: 'F型',
    notchCount: 2,

    notch1_y: 0.20,
    notch1_height: 0.12,
    notch1_depth: 200,

    notch2_y: 0.48,
    notch2_height: 0.38,
    notch2_depth: 450,

    notch3_y: 0.70,
    notch3_height: 0.15,
    notch3_depth: 300,

    // ジグザグ
    totalPoints: 80,

    // 音声
    sensitivity: 3.0,
    maxIndent: 120,
    randomAmount: 0.5,
    spacingRandomAmount: 0.3,
    angleRandomAmount: 0.5,
    clampStrength: 0.3,
    ambientAmount: 3,

    // カラー
    outsideColor: '#e0e0e0',
    bgColor: '#f8f8f8',
    blackColor: '#1a1a1a',
    whiteColor: '#ffffff',

    // デバッグ
    showDebug: false,
  };

  const gui = new GUI({ title: 'Visualizer' });

  // --- 形状 ---
  const shapeFolder = gui.addFolder('形状');

  shapeFolder.add(params, 'preset', Object.keys(PRESETS))
    .name('プリセット')
    .onChange((val) => {
      applyPreset(val);
      updateFolderVisibility();
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      onUpdate();
    });

  shapeFolder.add(params, 'notchCount', 0, 3, 1)
    .name('ノッチ数')
    .onChange(() => {
      params.preset = 'カスタム';
      updateFolderVisibility();
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      onUpdate();
    });

  const notchFolders = [];
  for (let i = 1; i <= 3; i++) {
    const folder = shapeFolder.addFolder(`ノッチ ${i}`);
    folder.add(params, `notch${i}_y`, 0.00, 0.90, 0.01)
      .name('位置 (Y)')
      .onChange(markCustomAndUpdate);
    folder.add(params, `notch${i}_height`, 0.03, 0.50, 0.01)
      .name('高さ')
      .onChange(markCustomAndUpdate);
    folder.add(params, `notch${i}_depth`, 30, 1500, 10)
      .name('深さ (px)')
      .onChange(markCustomAndUpdate);
    notchFolders.push(folder);
  }

  // --- ジグザグ ---
  const zigzagFolder = gui.addFolder('ジグザグ');
  zigzagFolder.add(params, 'totalPoints', 20, 200, 2)
    .name('トゲ密度')
    .onChange(onUpdate);

  // --- 音声 ---
  const audioFolder = gui.addFolder('音声反応');
  audioFolder.add(params, 'sensitivity', 0.5, 10, 0.1)
    .name('音量感度');
  audioFolder.add(params, 'maxIndent', 10, 1200, 1)
    .name('最大トゲ深さ');
  audioFolder.add(params, 'randomAmount', 0, 1, 0.05)
    .name('深さランダム');
  audioFolder.add(params, 'spacingRandomAmount', 0, 1, 0.05)
    .name('間隔ランダム');
  audioFolder.add(params, 'angleRandomAmount', 0, 1, 0.05)
    .name('角度ランダム');
  audioFolder.add(params, 'clampStrength', 0, 1, 0.05)
    .name('交差防止');
  audioFolder.add(params, 'ambientAmount', 0, 10, 0.5)
    .name('アンビエント量');

  // --- カラー ---
  // onColorChange はパスの fillColor だけを更新するコールバック
  // 形状の再計算は行わない（軽量）
  let onColorChange = null;

  const colorFolder = gui.addFolder('カラー');
  colorFolder.addColor(params, 'outsideColor').name('Outside')
    .onChange(() => onColorChange && onColorChange());
  colorFolder.addColor(params, 'bgColor').name('背景色')
    .onChange(() => onColorChange && onColorChange());
  colorFolder.addColor(params, 'blackColor').name('黒オブジェクト')
    .onChange(() => onColorChange && onColorChange());
  colorFolder.addColor(params, 'whiteColor').name('白オブジェクト')
    .onChange(() => onColorChange && onColorChange());

  // ランダム配色ボタン
  const colorActions = { randomize() { generateRandomPalette(); } };
  colorFolder.add(colorActions, 'randomize').name('ランダム配色');

  function generateRandomPalette() {
    // 配色スキームをランダムに選択
    const schemes = ['complementary', 'splitComplementary', 'analogous', 'triadic'];
    const scheme = schemes[Math.floor(Math.random() * schemes.length)];

    // ベース色相をランダムに決定（0–360）
    const baseHue = Math.random() * 360;

    let bgHue, outerHue, innerHue;
    switch (scheme) {
      case 'complementary':
        // 背景と外側が補色関係、内側は中間
        bgHue = baseHue;
        outerHue = (baseHue + 180 + (Math.random() - 0.5) * 20) % 360;
        innerHue = (baseHue + 90 + (Math.random() - 0.5) * 30) % 360;
        break;
      case 'splitComplementary':
        // 外側が分裂補色（±150°）
        bgHue = baseHue;
        outerHue = (baseHue + 150 + Math.random() * 60) % 360;
        innerHue = (baseHue + 210 + Math.random() * 60) % 360;
        break;
      case 'analogous':
        // 類似色（±30°範囲）
        bgHue = baseHue;
        outerHue = (baseHue + 20 + Math.random() * 20) % 360;
        innerHue = (baseHue - 20 - Math.random() * 20 + 360) % 360;
        break;
      case 'triadic':
        // 三角配色（120°間隔）
        bgHue = baseHue;
        outerHue = (baseHue + 120 + (Math.random() - 0.5) * 20) % 360;
        innerHue = (baseHue + 240 + (Math.random() - 0.5) * 20) % 360;
        break;
    }

    // OKLCH → hex 変換して params に適用
    const bgL = 0.85 + Math.random() * 0.10;       // 明度高め
    const bgC = 0.02 + Math.random() * 0.06;        // 彩度控えめ
    const outerL = 0.15 + Math.random() * 0.20;     // 明度低め
    const outerC = 0.05 + Math.random() * 0.12;     // 彩度中程度
    const innerL = 0.50 + Math.random() * 0.20;     // 中間明度
    const innerC = 0.08 + Math.random() * 0.15;     // 彩度高め

    params.bgColor = oklchToHex(bgL, bgC, bgHue);
    params.blackColor = oklchToHex(outerL, outerC, outerHue);
    params.whiteColor = oklchToHex(innerL, innerC, innerHue);

    gui.controllersRecursive().forEach((c) => c.updateDisplay());
    if (onColorChange) onColorChange();
  }

  // --- デバッグ ---
  gui.add(params, 'showDebug')
    .name('デバッグ表示');

  // --- ヘルパー ---
  function markCustomAndUpdate() {
    params.preset = 'カスタム';
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
    onUpdate();
  }

  function applyPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;
    params.notchCount = preset.length;
    preset.forEach((n, i) => {
      const idx = i + 1;
      params[`notch${idx}_y`] = n.y;
      params[`notch${idx}_height`] = n.height;
      params[`notch${idx}_depth`] = n.depth;
    });
  }

  function updateFolderVisibility() {
    notchFolders.forEach((f, i) => {
      if (i < params.notchCount) f.show();
      else f.hide();
    });
  }

  updateFolderVisibility();

  /**
   * カラー変更コールバックを外部から登録する
   * @param {Function} fn
   */
  function setColorChangeHandler(fn) {
    onColorChange = fn;
  }

  return { gui, params, setColorChangeHandler };
}

/**
 * params からノッチ配列を取り出す
 */
export function getNotchesFromParams(params) {
  const notches = [];
  for (let i = 1; i <= params.notchCount; i++) {
    notches.push({
      yRatio: params[`notch${i}_y`],
      heightRatio: params[`notch${i}_height`],
      depth: params[`notch${i}_depth`],
    });
  }
  return notches.sort((a, b) => a.yRatio - b.yRatio);
}
