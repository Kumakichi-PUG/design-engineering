# Track E — Export & Display

> あなたは Track E 担当エージェントです。  
> 作品を外に持ち出すための録画・スクショ、そして展示モード（フルスクリーン）を担当します。  
> アートディレクターはこれらを使ってデモ動画を作成・展示します。

---

## 必読

1. `../REQUIREMENTS.md` 全体（特に §3.8 録画/スクショ、§3.9 フルスクリーンモード）
2. `../CLAUDE.md`
3. `./README.md`

---

## あなたが作るもの

### E-1. スクリーンショット

```
src/lib/screenshot.ts
```

```typescript
export async function takeScreenshot(
  canvas: HTMLCanvasElement,
  options?: { resolution?: '720p' | '1080p' | '1440p' }
): Promise<void>  // ファイルダウンロード起動
```

- `canvas.toBlob()` で取得 → ダウンロードリンク作成 → 自動クリック
- ファイル名: `flame_{YYYYMMDD-HHmmss}.png`
- 解像度オプション: 内部レンダリングを一時的に変更してキャプチャ → 元に戻す
  - シンプルに現在の解像度でいくのも可（実装コスト次第）

### E-2. 録画機能

```
src/lib/recorder.ts
src/hooks/useRecorder.ts
```

```typescript
export class Recorder {
  constructor(canvas: HTMLCanvasElement, options?: RecorderOptions)
  start(): void
  stop(): Promise<Blob>
  isRecording(): boolean
  getDuration(): number       // 経過秒数
  onMaxDurationReached(callback: () => void): void
}
```

#### 仕様
- `MediaRecorder` API + `canvas.captureStream(30)` で WebM 1080p 30fps
- bitrate: 8Mbps程度
- `onstop` で Blob を返す
- 最大録画長: 60秒（leva経由で延長可能）
- 録画開始時にコールバックでDensityをスロットル：

```typescript
// Track B / Track D 連携
if (recording) setDensity(currentDensity * 0.8)
```

### E-3. 録画中インジケータ

```
src/components/ui/RecordingIndicator.tsx
```

- 画面右上 or 左上に固定
- 赤い丸（脈打つアニメーション） + 経過時間 `00:23 / 01:00`
- フルスクリーンモードでも表示される（録画中だけ）
- 停止ボタン

### E-4. キーボードショートカットの統合

Track A の `useKeyboardShortcuts` フックに以下を実装：

| キー | アクション |
|------|----------|
| `R` | 録画 開始/停止 |
| `S` | スクリーンショット |
| `F` | フルスクリーン 切替 |
| `H` | GUI 切替 (Track D) |
| `ESC` | フルスクリーン解除 |

### E-5. フルスクリーンモード

```
src/hooks/useFullscreen.ts
src/components/ui/FullscreenButton.tsx
```

```typescript
export function useFullscreen(): {
  isFullscreen: boolean
  enter: () => void
  exit: () => void
  toggle: () => void
}
```

#### 仕様
- Fullscreen API（`element.requestFullscreen()`）
- 対象は Canvas の親（AspectFrame）
- フルスクリーン時に：
  - leva GUI 自動非表示（Track D の `setHidden(true)`）
  - マウスカーソル 3秒非アクティブで自動非表示（CSS `cursor: none` トグル）
  - 録画インジケータは表示（録画中のみ）
- ESC でフルスクリーン解除（ブラウザ標準動作）

### E-6. マウスカーソル auto-hide

```
src/hooks/useAutoHideCursor.ts
```

- 3秒間マウス非アクティブで cursor: none
- マウス動かすと再表示
- フルスクリーン時のみ有効

### E-7. モバイル警告

```
src/components/ui/MobileWarning.tsx
```

- viewport width < 768px の場合、フルスクリーンオーバーレイで警告
- 「PCで開いてください」メッセージ
- なぜ非対応かも軽く説明

---

## Track 間の依存

- **Track A**: useKeyboardShortcuts のハンドラ登録口
- **Track B**: Canvas DOM 要素を取得する経路（Zustand or ref）
- **Track D**: leva の Export folder のボタンが Track E のコールバックを呼ぶ
- **Track D**: 録画中の Density スロットルを適用するため、Zustand に `recordingThrottle` フラグ等を追加

---

## Definition of Done (Track E)

- [ ] スクショで PNG が完全な解像度で保存される（透明部分が黒くならない、ちゃんと背景込み）
- [ ] 録画 WebM がブラウザ標準プレイヤーで再生できる
- [ ] 録画中は赤丸インジケータと経過秒数が表示される
- [ ] 60秒上限で自動停止
- [ ] 録画中に Density が80%にスロットルされ、停止後に元に戻る
- [ ] フルスクリーンで GUI とカーソルが消える
- [ ] ESC で抜けられる
- [ ] `R`, `S`, `F` キーが動作
- [ ] モバイルアクセス時に警告が出る

---

## 推奨進行順

1. E-1 screenshot
2. E-5 useFullscreen
3. E-6 useAutoHideCursor
4. E-2 + E-3 録画 + インジケータ
5. E-4 キーショートカット統合
6. E-7 モバイル警告

---

## 完了報告

```
✅ Track E: Export & Display — Done
- 1080p 30fps WebM 録画、60秒上限、Densityスロットル動作
- スクショ PNG 保存OK
- フルスクリーンでGUI/カーソル消える
- 動画: <link to PR>
```
