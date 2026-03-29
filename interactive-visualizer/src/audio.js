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
    console.log('[Audio] 初期化成功', {
      state: audioContext.state,
      fftSize: analyser.fftSize,
      binCount: analyser.frequencyBinCount,
      tracks: stream.getAudioTracks().map((t) => ({ label: t.label, enabled: t.enabled, readyState: t.readyState })),
    });
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

  const vol = Math.min(1, rms * 2);

  // 1秒ごとにデバッグ出力（毎フレームだと重いので間引き）
  if (!getVolume._lastLog || Date.now() - getVolume._lastLog > 1000) {
    getVolume._lastLog = Date.now();
    // dataArrayの先頭10個の生データも出力
    console.log('[Audio] volume:', vol.toFixed(4), 'rms:', rms.toFixed(4), 'bins:', Array.from(dataArray.slice(0, 10)));
  }

  return vol;
}

/**
 * マイクが有効かどうか
 */
export function isActive() {
  return analyser !== null;
}
