# Track D — Color System & Parametric GUI

> あなたは Track D 担当エージェントです。  
> OKLCHベースのランダム配色システムと、leva による全パラメータの操作UIを担当します。

---

## 必読

1. `../REQUIREMENTS.md` 全体（特に §3.6 OKLCH配色、§3.7 leva GUI）
2. `../CLAUDE.md`
3. `./README.md`

---

## あなたが作るもの

### D-1. OKLCH パレット生成器

```
src/lib/oklchPalette.ts
```

REQUIREMENTS.md §3.6 のレイヤー別範囲表を実装。

```typescript
interface PaletteSpec {
  baseHue: number          // 0-360
  hueSpread: number        // 0-180
  chroma: number           // 0-0.4
  lightnessMin: number     // 0-1
  lightnessMax: number     // 0-1
}

interface Palette {
  background: OKLCH
  fill: OKLCH[]            // 温度グラデ用、複数stops
  contour: OKLCH
  ember: OKLCH
  ghost: OKLCH
}

export function generatePalette(spec: PaletteSpec, seed?: number): Palette
export function rerollPalette(): PaletteSpec   // 完全新規
export function variatePalette(
  current: PaletteSpec,
  amount: number      // 0-1
): PaletteSpec        // 部分的に変化
export function shiftHue(p: PaletteSpec, deltaHue: number): PaletteSpec
```

#### 設計ポイント
- 起動時に `rerollPalette()` で初期化
- `variate(current, 0.5)` は「半分くらい変える」
- レイヤー間のHueは `baseHue` からの相対オフセット（§3.6 の Hue戦略表）
- L/C は許容範囲内でランダム

### D-2. OKLCH → OKLab → RGB 変換

```
src/lib/colorConvert.ts
```

`culori` をラップして使いやすい形に：

```typescript
import { oklch, oklab, rgb } from 'culori'

export function oklchToOklab(c: OKLCH): OKLab           // for shader uniform
export function oklchToRgb(c: OKLCH): RGB               // for CSS
export function oklchToHex(c: OKLCH): string            // for CSS / GUI display
```

**重要**：シェーダ補間は OKLab で行うため、uniform にはOKLab値を渡す。シェーダ内の OKLab→RGB 変換ヘルパは Track B が用意（`flame.frag.glsl` 内）。

### D-3. leva 統合 ⭐

```
src/components/ui/LevaPanel.tsx
```

REQUIREMENTS.md §3.7 の全パラメータを leva で公開。

```typescript
import { useControls, button, folder } from 'leva'

export function LevaPanel() {
  const motionControls = useControls('Motion', {
    density: { value: 100, min: 30, max: 300, step: 1 },
    upwardSpeed: { value: 1.0, min: 0.1, max: 3.0, step: 0.05 },
    curlStrength: { value: 1.0, min: 0, max: 2.0, step: 0.05 },
    oneOverFAmount: { value: 0.5, min: 0, max: 1, step: 0.01 },
    oneOverFOctaves: { value: 6, min: 3, max: 8, step: 1 },
  })
  
  // ... folder('Pose Morphing', { ... })
  // ... folder('Shape', { ... })
  // ... folder('Color (OKLCH)', { ... })
  // ... etc
  
  // Zustand へ流し込む
  useEffect(() => {
    setStoreFromLeva(motionControls, ...)
  }, [...])
  
  return null
}
```

#### 必要なfolder
1. **Motion** — Density, UpwardSpeed, CurlStrength, 1/f Amount, 1/f Octaves
2. **Pose Morphing** — Speed, Variance, Pause, Easing
3. **Shape** — HandScaleMin, HandScaleMax, ContourWidth, PosterizeLevels
4. **Color (OKLCH)** — BaseHue, HueSpread, Chroma, LightnessRange, [Re-roll], Variation, HueShift
5. **Ghost Layer** — Opacity, DriftSpeed, Visibility
6. **Background** — GrainAmount, Vignette, Pulse
7. **Ember** — Count, Speed, Sharpness
8. **Camera & Hand** — Camera, AutoRegister, AutoRegisterDelay, [Register Now], Count, [Clear All]
9. **Export** — [Screenshot], [Record/Stop], Resolution
10. **Display** — [Fullscreen], (HideGUI is `H` key)

#### levaのスタイル
- 折りたたみ可能、初期状態は全folderたたんで Motion だけ展開
- `H` キーで `<Leva hidden />` 切替
- 配置：右上 or 右下（アートを邪魔しない）
- 半透明背景、ガラス感（backdrop-filter blur）

### D-4. 配色のシェーダへの流し込み

```
src/lib/paletteToUniforms.ts
```

Palette → 各シェーダmaterial のuniform更新を一元化。

```typescript
export function applyPaletteToFlameMaterial(
  material: THREE.ShaderMaterial,
  palette: Palette
): void

export function applyPaletteToBackgroundMaterial(...)
export function applyPaletteToEmberMaterial(...)
export function applyPaletteToGhostMaterial(...)
```

palette 変更時に各materialのuniformsを更新。

### D-5. Re-roll アニメーション（オプション、できれば）

Re-rollボタンを押した時、瞬時に切り替えるのではなく、200msで OKLab補間しながら遷移。  
これだけで作品としての高級感が一段上がる。

---

## Track 間の依存

- **Track A**: Zustand store の各field（あなたがフィールドを追加していく）
- **Track B**: Material uniforms を提供する側がBなので、material refを取得する仕組みが必要（B側で `useImperativeHandle` か Zustand に material ref を保持）
- **Track C**: Camera関連のControlsとhandRegistryのコールバック連携
- **Track E**: Export ボタンのコールバック連携

---

## Definition of Done (Track D)

- [ ] 起動時にOKLCHランダム配色が生成される（毎回違う、しかし統一感がある）
- [ ] 🎲 Re-roll で全レイヤー再生成
- [ ] Variation スライダーで部分変化が可能
- [ ] Hue Shift で全体回転
- [ ] leva の全folder が REQUIREMENTS.md §3.7 通りに揃っている
- [ ] `H` キーで leva 完全非表示
- [ ] パラメータ変更が即座にビジュアルに反映される
- [ ] OKLCH → OKLab → uniform → シェーダ内RGB の経路が動作

---

## 推奨進行順

1. D-2 colorConvert（culoriラッパ、これがないと何も始まらない）
2. D-1 oklchPalette（生成器）
3. D-4 paletteToUniforms（B のmaterialと協調）
4. D-3 LevaPanel（パラメータ群を順次追加）
5. D-5 Re-roll アニメーション（最後の仕上げ）

---

## 完了報告

```
✅ Track D: Color & GUI — Done
- OKLCHランダム配色、毎回統一感あり
- 全 leva パラメータが動作、リアルタイム反映
- Re-roll の 200ms OKLab補間遷移が美しい
- スクショ: <link to PR>
```
