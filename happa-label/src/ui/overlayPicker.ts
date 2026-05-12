/**
 * Overlay 画像ピッカー（happa-label v0.1、Phase B）。
 *
 * ファイル選択 → byte size / pixel dimension のバリデーション
 * → data URL 化 → 画像プリロード → render 側キャッシュ温め
 * → `setState({ overlayDataUrl, showOverlay: true })` を一括で行う。
 *
 * - spec §5.3 FR-L04 / L05、§11 OQ-L6 (size limits)
 * - 禁忌 §6: localStorage / IndexedDB へは保存しない（state はメモリのみ）。
 */

import { ensureOverlayImage } from '../render/overlay';
import type { AppState } from '../state';

/** Byte size 上限（10 MB）。OQ-L6。 */
const MAX_BYTES = 10 * 1024 * 1024;

/** Pixel 寸法上限（幅・高さそれぞれ 4096 px）。OQ-L6。 */
const MAX_DIMENSION = 4096;

/**
 * `fileInput` の `change` イベントを購読し、選択された画像を検証 → state に反映する。
 *
 * バリデーション順:
 * 1. `file.size > 10 MB` → alert + abort
 * 2. FileReader で data URL 化
 * 3. `new Image()` でデコードし `naturalWidth/Height > 4096` → alert + abort
 * 4. `ensureOverlayImage(dataUrl)` で render 側キャッシュを温める
 * 5. `setState({ overlayDataUrl, showOverlay: true })`
 *
 * いずれの失敗ケースでも file input の `value` をリセットし、同じファイルを
 * 修正後に再選択できるようにする。
 */
export function attachOverlayLoader(
  fileInput: HTMLInputElement,
  setState: (patch: Partial<AppState>) => void,
): void {
  fileInput.addEventListener('change', () => {
    void handleFileChange(fileInput, setState);
  });
}

/**
 * Overlay 画像を解除する。
 *
 * data URL とトグルをクリアするのみ。render 側の画像キャッシュは残しても問題ないので
 * 解放しない（同じ画像を後で再選択しても `ensureOverlayImage` がキャッシュヒットする）。
 */
export function clearOverlay(setState: (patch: Partial<AppState>) => void): void {
  setState({ overlayDataUrl: null, showOverlay: false });
}

async function handleFileChange(
  fileInput: HTMLInputElement,
  setState: (patch: Partial<AppState>) => void,
): Promise<void> {
  const file = fileInput.files?.[0];
  if (!file) return;

  // 1. Byte size 検証
  if (file.size > MAX_BYTES) {
    window.alert('Overlay image is too large (max 10 MB).');
    fileInput.value = '';
    return;
  }

  try {
    // 2. data URL 化
    const dataUrl = await readFileAsDataUrl(file);

    // 3. プリロード + 寸法検証
    const img = await decodeImage(dataUrl);
    if (img.naturalWidth > MAX_DIMENSION || img.naturalHeight > MAX_DIMENSION) {
      window.alert(
        `Overlay image exceeds 4096×4096 (got ${img.naturalWidth}×${img.naturalHeight}).`,
      );
      fileInput.value = '';
      return;
    }

    // 4. render 側キャッシュ温め
    await ensureOverlayImage(dataUrl);

    // 5. state 反映
    setState({ overlayDataUrl: dataUrl, showOverlay: true });
  } catch (err) {
    console.error('[overlayPicker] Failed to load overlay image:', err);
    window.alert('Failed to load overlay image. The file may be corrupt or unsupported.');
    fileInput.value = '';
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('FileReader did not return a string.'));
      }
    };
    reader.onerror = (): void => {
      reject(reader.error ?? new Error('FileReader error.'));
    };
    reader.readAsDataURL(file);
  });
}

function decodeImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = (): void => resolve(img);
    img.onerror = (): void => reject(new Error('Image failed to decode.'));
    img.src = dataUrl;
  });
}
