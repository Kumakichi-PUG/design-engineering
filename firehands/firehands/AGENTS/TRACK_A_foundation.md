# Track A — Foundation

> あなたは Track A 担当エージェントです。  
> プロジェクトの基盤・骨格・共通インフラを担当します。  
> 他のすべてのトラックがあなたの上で動きます。

---

## 必読

1. `../REQUIREMENTS.md` 全体（特に §5 技術スタック、§6 アーキテクチャ）
2. `../CLAUDE.md`
3. `./README.md`

---

## あなたが作るもの

### A-1. プロジェクト初期化

`package.json` には既に依存が宣言されています。`pnpm install` が通る状態を担保してください。

各種設定ファイル（`vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js`, `.prettierrc`）を必要なら最終調整。

### A-2. レイアウト骨格（16:9固定）

```
src/components/layout/AspectFrame.tsx
```

- 画面サイズに応じて 16:9 を保ったままレスポンシブにスケール
- 上下左右の余白は背景色（OKLCH定義の暗色）
- 中央寄せ
- props: `children`
- 内側のサイズを ResizeObserver で監視し、Zustand に流し込む（`canvasSize`）

### A-3. Zustand Store の骨格

```
src/store/useVisualStore.ts
```

最低限の構造：

```typescript
interface VisualStore {
  // Display
  canvasSize: { width: number; height: number }
  setCanvasSize: (size: { width: number; height: number }) => void
  isFullscreen: boolean
  setFullscreen: (v: boolean) => void
  isGuiHidden: boolean
  toggleGui: () => void

  // Motion (Track B が拡張)
  density: number
  upwardSpeed: number
  curlStrength: number
  oneOverFAmount: number

  // Pose Morphing (Track B + C が拡張)
  morphSpeed: number
  morphVariance: number
  morphPause: number

  // Color (Track D が拡張)
  baseHue: number
  hueSpread: number
  chroma: number
  
  // Camera (Track C が拡張)
  cameraEnabled: boolean
  registeredHandsCount: number
  
  // ... 他Trackがそれぞれ拡張
}
```

各Trackが必要なフィールドを追加していけるよう、初期値とsetterだけ用意してください。

### A-4. App.tsx 骨格

```
src/App.tsx
```

最終的にこうなる：

```tsx
<>
  <AspectFrame>
    <FlameCanvas />          {/* Track B */}
  </AspectFrame>
  <CameraConsent />          {/* Track C */}
  <LevaPanel />              {/* Track D */}
  <RecordingIndicator />     {/* Track E */}
  <PrivacyOverlay />         {/* Track C */}
</>
```

今は AspectFrame の中に「Hello flame」プレースホルダを入れておくだけでOK。

### A-5. グローバルキーボードショートカット基盤

```
src/hooks/useKeyboardShortcuts.ts
```

`F`, `H`, `R`, `S`, `ESC` のハンドラ登録の枠組みだけ作る（実際のアクションは各Track）。

### A-6. グローバルスタイル

```
src/styles/globals.css
src/styles/tokens.ts
```

- Tailwind base/components/utilities import
- カーソル制御（フルスクリーン時のauto-hide用CSS）
- フォントは要相談だが、**システムフォントに頼らず distinctive な選択を**（CLAUDE.md と frontend-design スキル参照）

### A-7. CI/CD設定（任意、できれば）

`.github/workflows/ci.yml` で `pnpm lint && pnpm test && pnpm build` を走らせる。

---

## あなたが触らないもの

- シェーダ実装（Track B）
- MediaPipe / SDF生成（Track C）
- leva の中身（Track D が拡張する）
- 録画ロジック（Track E）
- ポストプロセス（Track F）

---

## Definition of Done (Track A)

- [ ] `pnpm install && pnpm dev` でブラウザに16:9のキャンバス枠と「Hello flame」が表示される
- [ ] `pnpm lint && pnpm test && pnpm build` がパス
- [ ] AspectFrame がウィンドウリサイズで正しく追従
- [ ] Zustand store が型安全で、全Trackが必要な拡張ができる構造
- [ ] グローバルキーボードショートカットの登録口ができている
- [ ] フォント・色の基本トークンが `tokens.ts` に定義されている
- [ ] 16:9 を保ったまま、ウィンドウのどんなサイズでも中央配置される

---

## 推奨進行順

1. A-1 を最終確認（`pnpm install`通る）
2. A-6 グローバルスタイル
3. A-2 AspectFrame
4. A-3 Zustand 骨格
5. A-4 App.tsx 骨格
6. A-5 キーボードショートカット
7. A-7 CI

---

## 完了報告

完了したら次のように報告：

```
✅ Track A: Foundation — Done
- 16:9 AspectFrame 動作確認済み（FPS 60維持）
- Zustand store 拡張可能な状態
- pnpm dev で起動 OK
- 次のTrackがmainに mergeできる状態
```
