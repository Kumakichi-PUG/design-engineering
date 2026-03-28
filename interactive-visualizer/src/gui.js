import GUI from 'lil-gui';

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
    maxIndent: 40,
    randomAmount: 0.5,
    spacingRandomAmount: 0.3,
    ambientAmount: 3,

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
  audioFolder.add(params, 'maxIndent', 10, 80, 1)
    .name('最大トゲ深さ');
  audioFolder.add(params, 'randomAmount', 0, 1, 0.05)
    .name('深さランダム');
  audioFolder.add(params, 'spacingRandomAmount', 0, 1, 0.05)
    .name('間隔ランダム');
  audioFolder.add(params, 'ambientAmount', 0, 10, 0.5)
    .name('アンビエント量');

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

  return { gui, params };
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
