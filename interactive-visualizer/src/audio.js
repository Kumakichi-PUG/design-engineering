/**
 * マイク入力 + FFT解析
 * Web Audio API（getUserMedia + AnalyserNode）
 */

let audioContext = null;
let analyser = null;
let dataArray = null;
let stream = null;

/**
 * マイク入力を初期化する
 *
 * @returns {Promise<boolean>} 成功したらtrue
 */
export async function initAudio() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    return true;
  } catch (err) {
    console.error('マイク入力の初期化に失敗:', err);
    return false;
  }
}

/**
 * マイク入力を停止する
 */
export function stopAudio() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  analyser = null;
  dataArray = null;
}

/**
 * 現在の音量を 0–1 で返す（周波数ドメインのRMS）
 */
export function getVolume() {
  if (!analyser || !dataArray) return 0;

  analyser.getByteFrequencyData(dataArray);

  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 255;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / dataArray.length);

  return Math.min(1, rms * 2);
}

/**
 * マイクが有効かどうか
 */
export function isActive() {
  return analyser !== null;
}
