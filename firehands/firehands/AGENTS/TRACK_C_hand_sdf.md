# Track C — Hand Detection & SDF Pipeline

> あなたは Track C 担当エージェントです。  
> カメラから手を検出し、SDFテクスチャに変換してアトラスへ格納し、永続化する **データパイプライン** と、登録された手のゴーストレイヤーを担当します。

---

## 必読

1. `../REQUIREMENTS.md` 全体（特に §3.3 ゴースト、§3.4 手の登録、§8 SDFモーフィング、§14 リスク）
2. `../CLAUDE.md`
3. `./README.md`

---

## あなたが作るもの

### C-1. MediaPipe Hand Landmarker ラッパー

```
src/components/hand/HandTracker.tsx
src/hooks/useHandDetection.ts
```

- `@mediapipe/tasks-vision` の HandLandmarker を初期化
- WebRTC で webcam stream を取得
- 30fps で landmark 検出を実行
- 検出結果（21点の正規化座標）を Zustand に流し込む
- カメラOFF時はリソース解放

#### 重要
- wasm assets は `public/mediapipe/` に配置（lazy load）
- 初期化中はローディングインジケータ
- カメラ拒否時は静かに失敗してアイドル炎にフォールバック

### C-2. ランドマーク → ポリゴン変換

```
src/components/hand/handToSilhouette.ts
```

21点のランドマークから、滑らかな手の輪郭ポリゴンを生成。

```typescript
export function landmarksToSilhouette(
  landmarks: Landmark[],     // 21点
  options?: { smoothing?: number; fingerTipRadius?: number }
): Polygon  // 閉じた点列
```

実装ヒント：
- 手首 → 各指の付け根 → 指先 → 戻る を順に辿る
- 各セグメントをスプライン補間（Catmull-Rom等）で滑らかに
- 指先は丸める（fingerTipRadius）
- 手全体に若干の outward expansion を適用してマスクに膨らみを持たせる

### C-3. EDT による SDF 生成 ⭐ コア機能

```
src/lib/sdfGenerator.ts
```

REQUIREMENTS.md §8.2 の通り：

```typescript
// メインスレッドで使う場合
export function polygonToSDF(
  polygon: Polygon,
  resolution: number = 128
): Float32Array  // 128*128 サイズ

// Web Worker版（推奨、メインスレッドをブロックしない）
export function polygonToSDFAsync(
  polygon: Polygon,
  resolution?: number
): Promise<Float32Array>
```

#### 実装方針
1. ポリゴンを2値マスクにラスタライズ
2. **2-pass EDT**（Felzenszwalb-Huttenlocher アルゴリズム推奨）で各画素の境界距離を計算
3. マスク内部は負の値、外部は正の値に符号付け
4. 結果を Float32Array で返す（GPU では DataTexture / R32F として使用）

#### 推奨ライブラリ（任意）
- `tiny-sdf` — 小さくて速い、文字用だが流用可能
- 自前実装でも200行程度

### C-4. SDFアトラス管理

```
src/lib/handAtlas.ts
```

```typescript
export class HandAtlas {
  constructor(slotSize: number = 128, gridSize: number = 16)
  // 計 16*16 = 256 スロット、テクスチャは 2048x2048
  
  addSDF(sdf: Float32Array): number        // 戻り値: スロットインデックス
  removeSDF(slot: number): void
  getSlotUV(slot: number): { u: number; v: number; w: number; h: number }
  getTexture(): THREE.DataTexture
  count(): number
  
  // HandLibrary インターフェイス（Track B が使う）
  getRandomSlot(exclude?: number): number
}
```

- フォーマット: R32F（負距離もサポート）
- `texture.needsUpdate = true` を addSDF後に呼ぶ
- 古いスロットの再利用ロジック（FIFOで上限超過分を削除）

### C-5. 同梱ハンドライブラリ（Phase 1必須）

```
public/hand-silhouettes/        # SVGを置く
src/lib/handLibrary.ts          # 読み込みロジック
```

最初は **30種のSVG手シルエット** を同梱。バリエーション例：
- 開いた手（5本指広げ）
- グー
- パー
- ピース
- 指差し（人差し指）
- サムズアップ
- OK サイン
- 手刀
- 合掌
- つまむ（つまみ）
- 5本指バラバラ
- 手のひらを向ける
- 手の甲を向ける
- 横向き手
- ... etc

各SVGは正方形 viewBox、黒塗りつぶし、白背景。  
`handLibrary.ts` で起動時に SVG → SDF 化してアトラスに投入。

> **時間が足りなければ**、Inkscapeやプロのアセット集から借用（要ライセンス確認）or 簡易ジェネレータで作る。最低でも10種は必須。

### C-6. 永続化（IndexedDB）

```
src/components/hand/handRegistry.ts
```

`idb-keyval` を使って登録された手のSDFをBlobで保存。

```typescript
export async function saveHand(sdf: Float32Array, meta: { timestamp: number }): Promise<string>  // ID
export async function loadAllHands(): Promise<Array<{ id: string; sdf: Float32Array; meta }>>
export async function deleteHand(id: string): Promise<void>
export async function clearAll(): Promise<void>
export function getCount(): Promise<number>
```

起動時に `loadAllHands()` を呼んで、過去の登録をアトラスに復元。

### C-7. ゴーストレイヤー

```
src/components/canvas/GhostLayer.tsx
src/shaders/ghost.frag.glsl
```

- 登録された手のSDFを、画面背景にうっすら漂わせる
- 別 InstancedMesh、別シェーダ
- alpha: 5–15%、drift: 緩慢
- モーフィングなし（静止したSDFをサンプル、Fill のみ、Contourなし）
- メイン炎の「下」「背景の上」

### C-8. カメラUI

```
src/components/hand/CameraConsent.tsx
src/components/ui/PrivacyOverlay.tsx
```

- 初回起動時にカメラ許可を求めるダイアログ（プライバシー文付き）
- 拒否時は「カメラなしでも炎は美しく動きます」と表示してフォールバック
- `Camera ON/OFF` トグル（leva経由でTrack Dと連携）
- **登録時の挙動**: 自動登録（一定時間静止）or 手動登録（Register Now ボタン）の両対応

---

## Track 間の依存

- **Track A**: Zustand store（cameraEnabled, registeredHandsCount）
- **Track B**: SDFアトラス + HandLibrary インターフェイスを提供する側（あなたが提供）
  - **重要**: B が早く動作するために、C-5 の同梱SDFアトラスを最優先で実装
- **Track D**: leva の Camera セクションは D が作るが、コールバックを C が提供

---

## パフォーマンスの注意

- EDT は **Web Worker で非同期実行**（メインスレッドをブロックしない）
- MediaPipe の検出は 30fps（60fps全力検出は不要）
- SDFアトラステクスチャの更新は addSDF時のみ（毎フレーム更新しない）
- IndexedDB 保存は debounce（連続登録で書き込み連発しない）

---

## Definition of Done (Track C)

- [ ] 同梱SVGライブラリ 30種（最低10種）が起動時に SDF化されてアトラスに格納される
- [ ] カメラON時、手をかざすとMediaPipeが検出してランドマークが取れる
- [ ] 一定時間静止 or Register Now で登録され、SDFが生成されてアトラスに追加される
- [ ] 登録された手はIndexedDBに永続化、次回起動時も保持される
- [ ] ゴーストレイヤーに登録手がうっすら漂う
- [ ] カメラ拒否時もアイドル炎は動く
- [ ] EDT処理がWeb Worker化されてメインスレッドをブロックしない
- [ ] アトラスが上限200個を超えたらFIFOで自動削除

---

## 推奨進行順

1. C-3 EDT実装（`sdfGenerator.ts`）— コア機能、まず単体で動かす
2. C-4 アトラス管理 — Track B と協調確認
3. C-5 同梱SVG → SDF パイプライン（**Track B のために最優先**）
4. C-6 IndexedDB
5. C-1 MediaPipe統合
6. C-2 ランドマーク → ポリゴン
7. C-8 カメラUI
8. C-7 ゴーストレイヤー

---

## 完了報告

```
✅ Track C: Hand & SDF — Done
- EDT Web Worker化、登録時のメインスレッドブロックなし
- 同梱30種 + カメラ登録で計XX種のハンドライブラリ
- IndexedDB永続化、再起動後も保持
- ゴーストレイヤー動作確認
- 動画: <link to PR video>
```
