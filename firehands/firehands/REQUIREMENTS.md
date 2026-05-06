# Visual Machine — "Hands of Flame" 要件定義書

> **コンセプト**：「炎のゆらめきは、まるで無数の手のように見える」
>
> 大きく見ると炎、よく見ると100本の手のシルエットでできた、インタラクティブなビジュアルマシン。  
> **見せた手を記憶し、登録するほど多様な手で炎が紡がれる。**  
> **さらに近づくと、それぞれの手の指がゆっくり呼吸するように動き、別の手の形へ溶けていく。**

| | |
|---|---|
| **バージョン** | v0.3 |
| **作成日** | 2026-05-06 |
| **更新内容** | v0.3 — SDFポーズモーフィング追加（指の articulate / 輪郭の溶け込み / 連続的なポーズ遷移） |
| **Art Director** | 大川 大空翔 |
| **形式** | Web App (PC専用) |
| **想定環境** | デスクトップChrome/Safari/Firefox（HTTPS必須） |

---

## 1. ビジョン / Concept

このプロジェクトの中核は、**「炎というマクロな現象が、無数の手のシルエットというミクロから立ち上がる」**という詩的な構造にある。

### スケールの三層構造

| スケール | 何が見える | 効果 |
|---------|-----------|------|
| **遠景** | 揺らめく炎 | 「ただの炎」 |
| **中景** | 炎が約100本の手のシルエットで構成されているのに気づく | 「これは手だ」という発見 |
| **近景** | 各手の指がゆっくり動き、輪郭が溶けて別の手に変わる | 「手も生きている」という二重の生命感 |

さらに、**カメラに手を見せる度に新しい手の形が登録され、炎の語彙が増えていく** — 過去の手は背景にゴーストとして残り続ける。

技術ではなく、概念として「**手**」「**炎**」「**記憶**」「**呼吸**」の四重構造を成立させることが目的。

---

## 2. ビジュアルリファレンス・スタイル棲み分け

ユーザー提供の参照画像を**役割分担**して使う：

| ID | スタイル特徴 | 担当レイヤー |
|----|-------------|------------|
| **Ref-1** | **直線を意識した鋭角なシルエット**（フラットな塗り、散る三角形のシャード） | **エンバー（火の粉・周辺シャード）** |
| **Ref-2** | **自然な曲線 + 漫画的にはっきりした輪郭**（赤→橙→黄の温度グラデ、内側にハイライト） | **メイン炎（手のシルエット）** |

**スタイル分業の意図**：
- **メイン炎** — 曲線的・有機的・漫画的（手の輪郭はカーブ、明快なエッジ、輪郭線あり）
- **エンバー** — 直線的・鋭角的・幾何学的（散るシャードは三角形、少数派のアクセント）
- 「**動と静**」「**曲と直**」のリズムで画面に飽きないコントラストを生む

---

## 3. 機能要件

### 3.1 炎ビジュアライザ（コア）

#### インスタンス構成
- 約100本の手のシルエットがインスタンス化された粒子として存在
- 各インスタンスは独立した位置・回転・スケール・life・色相位相・1/f系列・**ポーズモーフィング状態**を持つ

#### 動きの設計（Curl Noise + 1/fゆらぎ）

二層の運動モデル：

1. **Curl Noise（大局的な乱流）** — 流体的な渦、群としての炎の上昇形状
2. **1/fゆらぎ（ミクロの呼吸）** — 自然界に普遍的な揺らぎ統計（炎・心拍・小川・音楽と同質）

```
position = curlField(p, t) * curlStrength
         + oneOverFNoise(seed_i, t) * fluctuationAmount
         + upwardVelocity * t
```

#### 2レイヤー描画（図と輪郭図）

各手は**2層**で描画される：

- **Fill（図）** — 手のシルエットを温度グラデで塗りつぶす
- **Contour（輪郭図）** — 手のアウトラインを別色で線描（漫画的なライン）

重ね順は Fill → Contour（Contourが上）。これにより Ref-2 の「漫画的にはっきりしたシルエット」を再現。

#### ポーズ・モーフィング（指がゆっくり動く） 🆕

**コンセプト**：近づいて見たとき、それぞれの手の指がゆっくり呼吸するように動き、輪郭が溶けて別の手の形に変わっていく。

**手法：SDF（Signed Distance Field）補間**

- 各手のシルエットを**SDFテクスチャ**として事前計算（128×128）
- 各インスタンスは同時に**2つのポーズ**を保持： `currentPose` と `nextPose`
- フラグメントシェーダで2つのSDFを線形補間：  
  `morphedSDF = mix(currentSDF, nextSDF, morphFactor)`
- 0でしきい値処理 → 中間形状も「シャープな輪郭を保った正しいシルエット」になる
- これがSDF補間の魔法：単純なクロスフェードでは出ない「形そのものが変わる」感を生む

**サイクル**：

```
morphFactor: 0 ────────────────→ 1
             ↑                    ↓
        [次のポーズ抽選]   [現在 = 次, 次 = 新ポーズ]
                              ↻ ループ
```

- 1サイクル：**3〜8秒**（パラメータ化）
- 各インスタンスは**独立した位相とスピード**でモーフィング
- 結果として群体は常に部分的に変化し続ける

**視覚効果**：
- 近接で：指がゆっくり開いたり閉じたり、手のひらの向きが変わるように見える
- 中距離で：個々の手のシルエットが緩慢に揺らぐ、群体全体が呼吸している感じ
- 遠景で：効果は溶け込んでただの炎の動きとして体感される

#### その他コア仕様
- **ライフサイクル** — 下部発生 → 上昇しながら拡大→縮小・色相シフト → 上部でフェードアウト
- **ポスタライズ** — 階調を3〜5段階に圧縮（アニメ的セル塗り感）
- **マクロ形状** — 全インスタンスの分布が炎の輪郭を形成

### 3.2 エンバー（火の粉・シャード）

- Ref-1スタイル：**直線・鋭角・三角形**ベース
- 数：30〜80個程度
- 動き：メイン炎より速く、より直線的に、画面端へ散る
- 色：明度高め、彩度高めのアクセント色
- 輪郭線なし、モーフィングなし（フラットな塗り）

### 3.3 ゴーストレイヤー（登録された手の記憶）

**コンセプト**：「この炎は、見せられた手のすべてを記憶している」

- 登録された手のシルエットが、画面背景にうっすらと残る
- 透明度：5〜15%
- ゆっくりとした drift（炎とは独立した穏やかな漂い）
- 登録数が増えるほど、ゴーストの種類と密度が増す
- 描画優先度：背景の上、メイン炎の下
- ゴーストレイヤーは**モーフィングしない**（静止した記憶として残す）

### 3.4 手の検出 + 登録システム

#### 検出
- MediaPipe Hand Landmarker（`@mediapipe/tasks-vision`）
- 21点ランドマーク → スプライン補間ポリゴン → アウトライン抽出

#### 登録時の処理
1. ランドマーク検出
2. ポリゴン化 + アウトライン化
3. **マスクをラスタライズ → SDFテクスチャ生成（128×128）** 🆕
4. SDFアトラスに追加（fill + contour 派生は同じSDFから生成可能）
5. ゴーストレイヤーにも反映
6. UIにカウンタ表示更新

#### 登録の累積性

| 段階 | 内容 |
|-----|------|
| 初期状態 | 同梱SVGライブラリ 30種（事前にSDF化してバンドル） |
| カメラ登録 | 検出された手を「登録」ボタン or 一定時間静止で自動登録 |
| 永続化 | IndexedDB（`idb-keyval`）でSDFテクスチャをBlobで保存 |
| 上限 | 200個（超えたら古いものから自動削除） |

#### 管理UI
- 登録された手の数表示
- 全クリアボタン

### 3.5 アスペクト比（v1スコープ）

**v1では 16:9 横長のみ**にフォーカス。

- ウィンドウサイズに合わせてレスポンシブにスケール
- 16:9を保ったまま中央配置
- 最小幅 1024px 推奨

> 9:16 / 3:4 / フルサイズはv2以降。

### 3.6 カラーシステム（OKLCH）

OKLCH色空間で配色を管理。知覚的に均一な階調と色相設計が可能。

#### レイヤーごとのカラー範囲

| レイヤー | 役割 | L範囲 | C範囲 | Hue戦略 |
|---------|------|------|------|---------|
| **Background** | 暗背景 | 0.05–0.15 | 0.02–0.08 | Fill のHue ±180（補色） |
| **Fill（図）** | 手の塗り、温度グラデ | 0.5–0.95 | 0.15–0.32 | 基準Hue ±20 |
| **Contour（輪郭図）** | 手のアウトライン | 0.85–1.0 | 0.05–0.20 | 基準Hue ±60 or 白系 |
| **Ember** | 火の粉 | 0.7–1.0 | 0.18–0.30 | 基準Hue ±90（アクセント） |
| **Ghost** | 登録手の残像 | 0.3–0.5 | 0.05–0.12 | 基準Hue（馴染ませる） |

#### ランダム配色

- 起動時に基準Hueを 0–360° からランダム選択
- 各レイヤーのHueは基準からの相対オフセット
- L・Cは上記範囲内でランダム
- 結果として「統一感のあるトーン」が毎回生成

#### 配色GUI

- **🎲 Re-roll**ボタン — 全レイヤー再生成
- **Variation スライダー**（0–100%） — 「現在からどれくらい変えるか」
- **Base Hue スライダー**（0–360°） — 全体回転
- **Hue Spread スライダー**（0–180） — レイヤー間のHue差の広さ
- **Chroma スライダー**（0–0.4） — 全体彩度
- **Lightness Range** — 明度範囲

### 3.7 パラメトリックGUI

`leva` を採用。すべての主要パラメータをライブ操作可能。

#### 全パラメータ群

```
[Motion]
- Density              (30 – 300)
- Upward Speed         (0.1 – 3.0)
- Curl Strength        (0.0 – 2.0)
- 1/f Amount           (0.0 – 1.0)
- 1/f Octaves          (3 – 8)

[Pose Morphing]   🆕
- Morph Speed          (0.05 – 0.5)    # サイクル/秒
- Morph Variance       (0 – 1.0)       # インスタンス間のスピード差
- Morph Pause          (0 – 2 sec)     # サイクル完了後の停滞時間
- Morph Easing         (linear / sin / quad)

[Shape]
- Hand Scale Min       (0.3 – 1.0)
- Hand Scale Max       (0.5 – 2.0)
- Contour Width        (0.5 – 4.0 px)
- Posterize Levels     (2 – 8)

[Color (OKLCH)]
- Base Hue             (0 – 360)
- Hue Spread           (0 – 180)
- Chroma               (0 – 0.4)
- Lightness Min        (0 – 1)
- Lightness Max        (0 – 1)
- [🎲 Re-roll] button
- Variation            (0 – 100%)
- Hue Shift            (-180 – 180)

[Ghost Layer]
- Opacity              (0 – 0.3)
- Drift Speed          (0 – 1)
- Visibility           (toggle)

[Background]
- Grain Amount         (0 – 0.1)
- Vignette             (0 – 0.5)
- Pulse                (0 – 0.05)

[Ember]
- Count                (0 – 150)
- Speed                (0.5 – 4.0)
- Sharpness            (0 – 1)

[Camera & Hand Registration]
- Camera               (on/off)
- Auto-register        (on/off)
- Auto-register Delay  (1 – 5 sec)
- [📷 Register Now] button
- Registered count     (read-only)
- [🗑 Clear All] button

[Export]
- [📸 Screenshot] button
- [⏺ Record / Stop] button
- Resolution           (720p / 1080p / 1440p)

[Display]
- [⛶ Fullscreen] button
- Hide GUI             (H key)
```

### 3.8 録画 / スクリーンショット

- **Screenshot** — 現在のフレームをPNGで保存（`canvas.toBlob`）
- **Record** — WebM 1080p 30fps（`MediaRecorder` API）
  - 録画中インジケータ（赤丸 + 経過秒数）
  - 最大録画長：60秒
  - 録画中は自動でDensityを80%にスロットル
- **ファイル名**：`flame_{YYYYMMDD-HHmmss}.{png|webm}`

### 3.9 フルスクリーン展示モード

- `F`キー or 専用ボタンで切替
- すべてのGUIを非表示
- マウスカーソル自動非表示（3秒非アクティブ）
- `ESC` で抜ける

---

## 4. 非機能要件

| 項目 | 基準 |
|------|------|
| FPS | M1 MacBook Air上で **60fps安定** |
| 手検出レイテンシ | **< 100ms**（30fps相当） |
| ポーズモーフィングのGPUコスト | フラグメントごとに2 SDF サンプル + 1 mix + smoothstep（軽量） |
| ブラウザ対応 | 最新版 Chrome / Safari / Firefox / Edge |
| モバイル対応 | しない |
| HTTPS | 必須 |
| 永続化 | IndexedDB（登録した手のSDFテクスチャ） |
| 初回ロード | < 5秒 |
| アクセシビリティ | フォトセンシティビティ警告、`prefers-reduced-motion` 尊重 |

---

## 5. 技術スタック

| 領域 | 技術 |
|-----|------|
| ビルド | Vite |
| 言語 | TypeScript (strict mode) |
| UIフレームワーク | React 18 |
| 3D / Canvas | Three.js + `@react-three/fiber` + `@react-three/drei` |
| シェーダ | カスタムGLSL（vertex/fragment） |
| ポストプロセス | `@react-three/postprocessing`（Bloom + Vignette） |
| 手検出 | `@mediapipe/tasks-vision`（Hand Landmarker） |
| パラメトリックGUI | `leva` |
| 色空間操作 | `culori`（OKLCH変換用） |
| **SDF生成** | **自前実装（EDT: Euclidean Distance Transform）** 🆕 |
| 永続化 | `idb-keyval`（IndexedDB薄ラッパー） |
| 状態管理 | Zustand |
| スタイリング | Tailwind CSS（最小限） |
| 録画 | MediaRecorder API |
| 開発補助 | ESLint + Prettier + Vitest |

---

## 6. アーキテクチャ

```
visual-machine-flame/
├── public/
│   ├── hand-silhouettes/             # 同梱手シルエットSVG（30種）
│   ├── mediapipe/                    # MediaPipe wasm assets
│   └── references/                   # Ref-1, Ref-2 画像
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── FlameCanvas.tsx       # R3F Canvasラッパー（16:9固定）
│   │   │   ├── FlameField.tsx        # InstancedMesh — メイン炎の手
│   │   │   ├── EmberField.tsx        # 直線シャード粒子
│   │   │   ├── GhostLayer.tsx        # 登録手の残像
│   │   │   ├── Background.tsx        # 暗背景 + grain + vignette
│   │   │   └── Postprocessing.tsx    # Bloom
│   │   ├── hand/
│   │   │   ├── HandTracker.tsx       # MediaPipe実行ラッパー
│   │   │   ├── handToSilhouette.ts   # ランドマーク → ポリゴン
│   │   │   ├── handRegistry.ts       # 登録/読込（IndexedDB）
│   │   │   └── CameraConsent.tsx     # カメラ許可UI
│   │   └── ui/
│   │       ├── LevaPanel.tsx         # leva設定の中央集約
│   │       ├── RecordingIndicator.tsx
│   │       ├── HandCounter.tsx
│   │       └── PrivacyOverlay.tsx
│   ├── shaders/
│   │   ├── flame.vert.glsl
│   │   ├── flame.frag.glsl           # SDF補間 + Fill/Contour 2レイヤー
│   │   ├── ember.vert.glsl
│   │   ├── ember.frag.glsl
│   │   ├── ghost.frag.glsl
│   │   └── background.frag.glsl
│   ├── lib/
│   │   ├── handLibrary.ts            # シルエット読込/管理
│   │   ├── sdfGenerator.ts           # 🆕 ポリゴン → SDFテクスチャ（EDT）
│   │   ├── handAtlas.ts              # 🆕 SDFテクスチャアトラス管理
│   │   ├── poseMorphController.ts    # 🆕 各インスタンスのモーフィング状態管理
│   │   ├── curlNoise.ts              # GPU Curl Noise utility
│   │   ├── oneOverFNoise.ts          # 1/fゆらぎ生成器
│   │   ├── oklchPalette.ts           # OKLCHパレット生成 + 操作
│   │   ├── recorder.ts               # MediaRecorder ラッパー
│   │   └── screenshot.ts
│   ├── store/
│   │   └── useVisualStore.ts         # Zustand
│   ├── hooks/
│   │   ├── useHandDetection.ts
│   │   ├── useFullscreen.ts
│   │   └── useRecorder.ts
│   └── styles/
│       ├── globals.css
│       └── tokens.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── package.json
└── README.md
```

---

## 7. 1/fゆらぎ実装詳細

### 7.1 何を再現するか

1/fゆらぎ = pink noise = パワースペクトルが周波数 f に反比例。  
自然界に普遍的：ロウソクの炎、心拍間隔、小川のせせらぎ、クラシック音楽のテンポ。  
**白色雑音より秩序があり、純粋なsin波より生命感がある**領域。

### 7.2 生成アルゴリズム

**Voss-McCartney法**（軽量、CPU生成→GPUへuniform送信）：

```typescript
function oneOverFNoise(seed: number, t: number, octaves = 6): number {
  let sum = 0
  for (let k = 0; k < octaves; k++) {
    const rate = Math.pow(2, k)
    const phase = Math.floor(t * rate)
    sum += hash(seed + k * 1000 + phase) * (1 / Math.pow(2, k * 0.5))
  }
  return sum
}
```

### 7.3 適用先

各インスタンスごとに独立した seed を持ち、以下を変調：
- 微細位置オフセット（curl noise の上に重ねる）
- スケール wobble（呼吸感）
- アルファ wobble（明滅感）
- 回転 wobble

`1/f Amount` パラメータで強度を一括制御。

---

## 8. SDFポーズ・モーフィング実装詳細 🆕

### 8.1 SDFとは

Signed Distance Field（符号付き距離場）= 各画素について「最も近い境界線までの距離」を符号付きで保持したフィールド。

- マスク内部：負の値
- 境界上：0
- マスク外部：正の値

**この表現の利点**：2つのSDFの線形補間結果も、ちゃんと「シャープな境界を持つ正しい形」になる。これがクロスフェードと決定的に違う点。

### 8.2 SDF生成（CPU側、登録時 or バンドル時）

**EDT（Euclidean Distance Transform）アルゴリズム**で2-pass:

```
1. ポリゴン → 2値マスク（128×128）にラスタライズ
2. EDTで各画素の境界までの距離を計算
3. マスク内は負号反転
4. 結果を Float32Array → DataTexture でGPUへ
```

128×128 で 1ハンドあたり 64KB。200個アトラスで 12.8MB（GPU上、許容範囲）。

### 8.3 アトラス管理

- 全SDFを **2048×2048 のテクスチャアトラス**に配置（16×16グリッド = 256スロット）
- 各インスタンスは uniform で `currentSlotIdx` と `nextSlotIdx` を保持
- 登録時はアトラスの空きスロットに追記
- 削除時はスロットを再利用

### 8.4 シェーダでの補間

```glsl
// 入力 uniforms（per-instance）
uniform sampler2D uSDFAtlas;
uniform vec2 uCurrentSlotUV;       // アトラス内のオフセット
uniform vec2 uNextSlotUV;
uniform float uMorphFactor;         // 0 → 1 でアニメート
uniform float uContourWidth;

void main() {
  vec2 localUV = vUv;
  
  // 2つのSDFをアトラスからサンプル
  float sdf1 = texture2D(uSDFAtlas, uCurrentSlotUV + localUV * SLOT_SIZE).r;
  float sdf2 = texture2D(uSDFAtlas, uNextSlotUV    + localUV * SLOT_SIZE).r;
  
  // 補間：これがSDF表現の魔法、中間形状もシャープなまま
  float morphedSDF = mix(sdf1, sdf2, uMorphFactor);
  
  // Fillマスク：SDFが負なら内部
  float fillMask = smoothstep(0.005, -0.005, morphedSDF);
  
  // Contourマスク：SDFが境界付近
  float contourMask = smoothstep(uContourWidth + 0.005, 
                                  uContourWidth - 0.005, 
                                  abs(morphedSDF));
  
  // 以下、温度・OKLCH・ポスタライズ処理...
}
```

### 8.5 モーフィング・タイミング制御（`poseMorphController.ts`）

各インスタンスが独立に保持する状態：

```typescript
interface MorphState {
  currentSlot: number       // アトラス内インデックス
  nextSlot: number
  factor: number            // 0..1
  speed: number             // サイクル/秒（個別ランダム）
  pauseUntil: number        // 完了後の停滞終了時刻
  easing: 'linear' | 'sin' | 'quad'
}
```

毎フレーム：
1. `factor += speed * deltaTime`
2. `factor >= 1` なら：
   - `currentSlot = nextSlot`
   - `nextSlot = ライブラリからランダム抽選`
   - `factor = 0`
   - `pauseUntil = now + pauseDuration`
3. shaderへeasing後の値を流し込み

---

## 9. シェーダ設計詳細

### 9.1 Flame Fragment Shader（SDF補間 + 2レイヤー）

§8.4 を参照。Fill色とContour色は別系統のOKLCH値、最終合成は Fill → Contour の順。

### 9.2 Background Fragment Shader

- ベース色：OKLCH指定の暗色
- 中央に微かなRadial Gradient
- フィルムグレイン：`noise(uv * resolution + time * 0.5) * uGrainAmount`
- ヴィネット：画面端を `uVignette` 分暗く

### 9.3 Ghost Fragment Shader

- 低alpha（5–15%）
- 緩慢な drift
- ポスタライズ無し（連続階調）
- モーフィングなし（静止したSDFをサンプル）

---

## 10. 並列開発タスク分割（Claude Code Agent Teams用）

### Track A — Foundation
- プロジェクト初期化（Vite + React + TS + Tailwind）
- 16:9固定レイアウト
- Zustand store の骨格
- ESLint / Prettier / Vitest セットアップ

### Track B — Flame Core (Rendering + Morphing) 🔄
- R3F Canvas 設定
- `FlameField` — InstancedMesh of hand silhouettes
- 2レイヤー描画（Fill + Contour）
- Curl Noise + 1/fゆらぎの統合
- **SDFポーズモーフィング（`poseMorphController` + シェーダ実装）**
- ポスタライズ
- `EmberField`（Ref-1スタイルの直線シャード）

### Track C — Hand Detection & SDF Pipeline 🔄
- MediaPipe Hand Landmarker 統合
- ランドマーク → ポリゴン → **SDFテクスチャ生成（EDT実装）**
- **`handAtlas` アトラス管理**
- IndexedDB永続化（`handRegistry`）
- カメラ許可UI、自動登録ロジック
- `GhostLayer` の実装

### Track D — Color & GUI
- OKLCH パレット生成器（`oklchPalette.ts`）
- ランダム配色 + Re-roll + Variation
- `leva` 統合（全パラメータ、**Pose Morphing含む**）
- 配色のシェーダ uniform への流し込み（OKLab経由）

### Track E — Export & Display
- Screenshot（PNG）
- MediaRecorder ラッパー（WebM録画、自動Densityスロットル）
- フルスクリーンモード（カーソル自動非表示）
- キーボードショートカット（`F`, `H`, `R`, `S`, `ESC`）

### Track F — Polish
- Postprocessing（Bloom）
- Background grain + vignette
- パフォーマンス計測 + 最適化
- README執筆 + デモGIF

**統合フェーズ**：各Trackがmainにmerge後、Art Director（大川）と最終調整セッション。

---

## 11. 受け入れ基準（Definition of Done）

- [ ] M1 MacBook Airで60fps、最大インスタンス300本でも45fps以上
- [ ] 16:9レイアウトで炎が美しく成立する
- [ ] 1/fゆらぎが視認できる（純粋curl noiseとの差を体感できる）
- [ ] **SDFポーズモーフィングで、近接視聴時に各手の指がゆっくり動き、別の手の形に溶けて変わるのが視認できる** 🆕
- [ ] **モーフィングがクロスフェードではなく「形そのものの遷移」として見える（中間形状がシャープ）** 🆕
- [ ] Fill + Contour の2レイヤー描画が機能している（漫画的な輪郭線が見える）
- [ ] OKLCH配色のRe-rollボタンで、毎回統一感のある配色が生成される
- [ ] 手をかざすと200ms以内に炎に反映され、SDFが生成・登録されて永続化される
- [ ] ゴーストレイヤーに登録された手がうっすら漂っている
- [ ] アイドル時、カメラOFFでも炎が美しく揺らぐ
- [ ] 録画WebMがブラウザ標準プレイヤーで再生できる
- [ ] スクリーンショットPNGが完全な解像度で保存される
- [ ] フルスクリーンモードでカーソルとUIが完全に消える
- [ ] **「マクロは炎、メゾは手、ミクロは指」の三層スケール構造が体感できる** 🆕
- [ ] 「使うほど豊かになる」記憶性の演出が成立する

---

## 12. 開発の優先順位

### Phase 1 — MVP
- [ ] 16:9キャンバス
- [ ] 同梱SVGライブラリで100本の手の炎
- [ ] Curl Noise のみ
- [ ] OKLCH配色（固定パレット）
- [ ] 暗背景

### Phase 2 — Motion & Color
- [ ] 1/fゆらぎ統合
- [ ] Fill + Contour 2レイヤー
- [ ] OKLCHランダム配色 + Re-roll + Variation
- [ ] leva GUI

### Phase 3 — SDF Pose Morphing 🆕
- [ ] SDF生成パイプライン（EDT）
- [ ] アトラス管理
- [ ] シェーダSDF補間
- [ ] `poseMorphController` 実装
- [ ] 同梱SVGをバンドル時にSDF化

### Phase 4 — Hand Interaction
- [ ] MediaPipe統合
- [ ] 登録時のSDF生成
- [ ] IndexedDB永続化
- [ ] ゴーストレイヤー

### Phase 5 — Output
- [ ] スクリーンショット
- [ ] WebM録画
- [ ] フルスクリーン展示モード

### Phase 6 — Polish
- [ ] Bloom + Vignette + Grain
- [ ] パフォーマンスチューニング
- [ ] デモ動画作成

---

## 13. 開発開始時の指示テンプレート（Claude Code Agent Teams用）

```
このリポジトリは Visual Machine "Hands of Flame" の開発リポジトリです。

本要件定義書 (REQUIREMENTS.md) を読み、Track [A-F] のうちあなたが担当する
セクションを実装してください。

ガイドライン：
- 不明点は要件書を再読し、芸術的な意図を最優先に判断
- shaderは美しさを最優先。動きは数値で詰める
- パフォーマンス（60fps）は妥協しない
- インターフェイスはアートを邪魔しない最小限のクロムで
- levaパネルは折りたたみ可能、Hキーで完全非表示にできること
- SDF補間によるポーズモーフィングは本作品のアイデンティティ。妥協しない
- コミットメッセージは Conventional Commits

完了後、`Definition of Done` の該当項目をチェックし、PRを作成してください。
PRには Before/After の **動画** を必ず添付（モーフィングは静止画では伝わらない）。
```

---

## 14. リスクと考慮事項

| リスク | 対策 |
|-------|------|
| MediaPipe wasm が重い（2-3MB） | Lazy load + ローディングインジケータ |
| GPU負荷（100本のインスタンス × 2レイヤー × SDFサンプル） | InstancedBufferGeometry + 単一drawcall。録画中はDensityスロットル |
| **EDT処理がメインスレッドをブロック** 🆕 | **Web Worker で非同期実行**。登録時1回だけなので許容 |
| **SDFアトラスのGPUメモリ** 🆕 | **2048×2048 R32F = 16MB。許容範囲。圧縮Float（R16F）も検討余地あり** |
| **モーフィング中の中間形状が崩れる** 🆕 | **2つのSDFが極端に異なる場合に発生。ペアリング時に類似度フィルタを軽く入れる選択肢あり** |
| 1/f計算がCPU負荷高 | Voss-McCartney法で軽量化 |
| OKLCHシェーダ補間 | OKLab経由で線形補間 → 最終的にRGB変換 |
| IndexedDB容量 | 登録上限200個、各SDFは128×128 R32F = 64KB |
| カメラ拒否時 | アイドル炎が美しく成立すれば問題なし |
| モバイルアクセス | 非対応を明示。警告表示 |

---

## 15. 将来スコープ（v2以降）

- 9:16 縦長 / 3:4 縦長 / フルサイズ対応
- 音声リアクティブ（マイク入力）
- 複数手同時検出（両手で違う炎）
- 手のポーズによる炎挙動の変化（パー＝広がる、グー＝集まる）
- **ライブハンド連動モード**：カメラに映る手をリアルタイムでSDF化し、その手自身が炎に変化
- 登録手のシェア機能（QRコード等）
- 展示用キオスクモード
- モーフィングのペアリング戦略改善（似た形同士を優先的にペアにして、よりオーガニックな articulate を演出）

---

## 16. ライセンス・クレジット

- **コンセプト & Art Direction**：大川 大空翔
- **共同設計**：Claude (Anthropic)
- **依存ライブラリ**：各オープンソースライセンス
- **MediaPipe**：Apache 2.0

---

*v0.3 — 2026-05-06*
