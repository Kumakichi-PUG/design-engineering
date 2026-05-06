# Track B — Flame Core (Rendering + Morphing)

> あなたは Track B 担当エージェントです。  
> このプロジェクトの**核心**である「100本の手で構成された炎」と「指がゆっくり動くSDFポーズモーフィング」を実装します。  
> このトラックの出来でプロジェクト全体の評価が決まります。**美しさを妥協しないでください。**

---

## 必読

1. `../REQUIREMENTS.md` 全体（特に §3.1 炎ビジュアライザ、§7 1/fゆらぎ、§8 SDFポーズモーフィング、§9 シェーダ設計）
2. `../CLAUDE.md`
3. `./README.md`

---

## あなたが作るもの

### B-1. R3F Canvas ラッパー

```
src/components/canvas/FlameCanvas.tsx
```

- `<Canvas>` を AspectFrame の中で動かす
- 平面オルソカメラ（2Dビジュアライザなので perspectiveは不要）
- `dpr={[1, 2]}` で Retina 対応
- 背景色は OKLCH定義の暗色（Track D 連携、暫定で `#0A0606`）
- frameloop: 'always'

### B-2. メイン炎フィールド（コアコンポーネント）

```
src/components/canvas/FlameField.tsx
```

`InstancedMesh` で約100本の手のシルエットを描画。

#### per-instance attributes
- `aSeed` (float) — 1/fゆらぎ用シード
- `aLifeOffset` (float) — life の位相オフセット
- `aMorphOffset` (float) — モーフィング位相オフセット
- `aMorphSpeed` (float) — このインスタンスのモーフ速度（Variance含む）
- `aCurrentSlot` (vec2) — SDFアトラス内の現在ポーズUV
- `aNextSlot` (vec2) — 同 次ポーズUV

CPU側（毎フレーム or 一定間隔）：
- 各インスタンスのモーフ係数を更新
- 完了したらnextを新規抽選してアトラスから引く
- Curl Noise + 1/f を計算して位置にフィードバック

### B-3. 1/fゆらぎ実装

```
src/lib/oneOverFNoise.ts
```

REQUIREMENTS.md §7.2 の Voss-McCartney法を実装。

```typescript
export function oneOverFNoise(seed: number, t: number, octaves = 6): number
```

各インスタンスの位置・スケール・回転・アルファ wobble を変調する。

### B-4. Curl Noise 実装

```
src/lib/curlNoise.ts
```

GPU側 GLSL 関数 + CPU側参照実装の両方。  
2D Curl Noise（Perlin の curl）を使用。

### B-5. ポーズモーフィングコントローラ

```
src/lib/poseMorphController.ts
```

REQUIREMENTS.md §8.5 の通り：

```typescript
interface MorphState {
  currentSlot: number
  nextSlot: number
  factor: number          // 0..1
  speed: number
  pauseUntil: number
  easing: 'linear' | 'sin' | 'quad'
}

export class PoseMorphController {
  constructor(instanceCount: number, library: HandLibrary)
  update(deltaTime: number): void
  getInstanceState(idx: number): MorphState
  reroll(idx: number): void  // 次ポーズを新規抽選
}
```

`HandLibrary` インターフェイスは Track C と協調定義。  
最低限：

```typescript
interface HandLibrary {
  count(): number
  getRandomSlot(exclude?: number): number
  getSlotUV(slot: number): { x: number; y: number }
}
```

### B-6. 炎シェーダ（v: vertex / f: fragment）

```
src/shaders/flame.vert.glsl
src/shaders/flame.frag.glsl
```

REQUIREMENTS.md §8.4 の SDF補間 + 2レイヤー描画（Fill / Contour）。  
ポスタライズ、温度マップ、リム発光込み。  
OKLCH→OKLab→RGB の変換ヘルパ関数も同梱。

#### 重要ポイント
- 中間SDF形状が**シャープなエッジを保つ**こと（クロスフェードでは絶対にダメ）
- Contour は abs(sdf) < width で抽出
- 温度マッピングは `life` と `worldY` の両方から
- ポスタライズは Fill色のみ（Contourは連続階調のままでも可）

### B-7. エンバーフィールド（Ref-1 スタイル）

```
src/components/canvas/EmberField.tsx
src/shaders/ember.vert.glsl
src/shaders/ember.frag.glsl
```

- 三角形ベースの直線シャード × 30〜80個
- メイン炎より速く・鋭角に・少数派
- 輪郭線なし、フラットな塗り
- 高彩度のアクセント色

### B-8. レンダリング順

```
背景 (Track A)
  ↓
GhostLayer (Track C)
  ↓
FlameField (このTrack)
  ↓
EmberField (このTrack)
  ↓
Postprocessing (Track F)
```

各層を別の `<group renderOrder={n}>` で管理。

---

## 期待される視覚効果（妥協厳禁）

1. **マクロ視聴**: 炎にしか見えない。手だと気付かない
2. **中視聴**: 「あ、これ手だ」と気付く瞬間がある
3. **近接視聴**:
   - 各手の指がゆっくり動いている
   - 輪郭が溶けて別の手の形に変わっていく
   - クロスフェードに見えてはいけない（**SDF補間の証拠**として、中間形状もシャープな輪郭を持つ）
4. **群体感**: 1/fゆらぎで全体が「呼吸している」
5. **アニメ的**: ポスタライズと輪郭線で、実写ではなくアニメ的な質感

---

## Track 間の依存・協調

- **Track A**: AspectFrame, Zustand store の field （density, upwardSpeed, curlStrength, oneOverFAmount, morphSpeed等）
- **Track C**: SDFアトラステクスチャ + HandLibrary インターフェイス
  - 初期段階では Track C のスタブ（同梱SVG 30種を仮SDF化したもの）でOK
  - 最終的に Track C の本実装に置き換わる
- **Track D**: 配色 uniform（OKLab値で受け取る）
- **Track F**: ポストプロセスで Bloom かかること前提に、過剰発光させすぎない

---

## Definition of Done (Track B)

- [ ] M1 MacBook Air で 60fps、density=300 でも 45fps以上
- [ ] 100本の手（同梱SVG群）で炎が成立
- [ ] Curl Noise + 1/fゆらぎが視認できる（純粋curlとの差を体感できる）
- [ ] Fill + Contour 2レイヤーが正しく描画される
- [ ] **SDFモーフィングが「クロスフェードではなく形そのものの遷移」として見える**
- [ ] 各インスタンスが独立した位相でモーフィングしている（全インスタンスが同時に変わらない）
- [ ] エンバーが Ref-1 スタイルで散っている
- [ ] アスペクト比 16:9 でレイアウト崩れなし

---

## 推奨進行順

1. B-1 FlameCanvas（プレースホルダmesh）
2. B-3 oneOverFNoise
3. B-4 curlNoise
4. B-2 FlameField（最初は静止のSDFテクスチャ1枚で）
5. B-6 シェーダ（最初は固定SDF、後でアトラス対応）
6. B-5 PoseMorphController（Track C のスタブと統合）
7. B-7 EmberField

---

## 完了報告

```
✅ Track B: Flame Core — Done
- 100本の手、SDFモーフィング、1/fゆらぎ、すべて動作
- M1 で 60fps（density=200）/ 50fps（density=300）
- 動画: <link to PR video>
```

PRには**必ず動画**を添付。モーフィングは静止画では伝わらない。
