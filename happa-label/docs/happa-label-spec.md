# happa-label — v0.1 Spec

## "Background-as-Substance" Edition

> Happo Visual Machine（happa designtool v1.1）からの分岐。
> テキストとシルエット追従を取り除き、**爆破された幾何形態それ自体**を主役にする。
> 出力は VM 発のブランドが用いる**ラベルの背景**として機能する。
> 本書は Claude Code Agent Teams がそのまま実装に着手できる詳細度で記述する。

---

## 0. Metadata

| Key              | Value                                                   |
| ---------------- | ------------------------------------------------------- |
| Spec Version     | **v0.1**                                                |
| Parent Spec      | happa designtool v1.1 (v0.4 spec)                       |
| Parent Repo      | `design-engineering/happa/`                             |
| Project Root     | `design-engineering/happa-label/`                       |
| Last Updated     | 2026-05-12                                              |
| Status           | Pre-implementation                                      |

### 0.1 命名由来

- **happa**: 発破 + 葉。Voronoi 爆破による形態生成。Happo Visual Machine からの継承語。
- **label**: 出力されたグラフィックは**ラベルそのものではない**。VM で生成されたブランドが用いる**ラベルの背景**となる、その一要素。

つまり `happa-label` は「ラベル背景生成 VM」であり、ラベル本体（ロゴ・銘柄名・規格表示等）は別工程で重ねる前提。Overlay レイヤーは、その重ね合わせをツール内でプレビューするための足場として残す。

### 0.2 happa designtool との関係

| 項目         | happa designtool v1.1                  | happa-label v0.1                          |
| ------------ | -------------------------------------- | ----------------------------------------- |
| 主目的       | ジェネラティブビジュアル + テキスト    | ラベル背景生成                            |
| テキスト     | 外周混植テキスト                       | **無し**                                  |
| 色           | Surface / Inner / Text の 3 色         | Surface / Inner の 2 色                   |
| 出力         | PNG / GIF                              | PNG (×1/×2/×4) / SVG / GIF                |
| シルエット   | warped silhouette でテキストが追従     | **削除**                                  |
| Repo         | `design-engineering/happa/`            | `design-engineering/happa-label/`         |

両者は独立した別ラインとして扱う。`happa-label` は将来的に B フェーズ（別レイヤーの追加 = テキストに代わる視覚要素の置換／拡張）に進化することを想定するが、v0.1 は引き算を徹底する。

### 0.3 Working Context（Claude Code Agent Teams 向け）

本プロジェクトは monorepo `design-engineering/` の一部として開発する。Claude Code は **monorepo ルート（`design-engineering/`）で起動**し、両 repo にアクセスできる状態で作業する。

#### 0.3.1 monorepo 構造

```
design-engineering/                       ← Claude Code 起動位置
├── happa/                                ← parent repo（v1.1 完成版）
│   ├── AGENTS.md                         ← v1.1 開発用（本プロジェクトとは独立）
│   ├── CLAUDE.md                         ← 同上
│   ├── happa-v1.1-kickoff.md             ← v1.1 実装キックオフ指示書（参考）
│   ├── docs/
│   │   ├── happa-designtool-v1.1-spec.md ← v1.1 spec（正本）
│   │   ├── happa-designtool.md           ← v1.0 spec（legacy 参考）
│   │   └── prototype.html                ← 旧プロトタイプ
│   ├── src/                              ← 継承元コード
│   ├── wireframes/
│   │   └── v0.10/wireframe.html          ← v1.1 reference implementation
│   ├── package.json / tsconfig.json / biome.json / vite.config.ts
│   └── index.html
└── happa-label/                          ← 本プロジェクト
    ├── AGENTS.md                         ← Agent Teams のエントリポイント
    ├── happa-label-kickoff.md            ← 実装キックオフ指示書
    ├── docs/
    │   └── happa-label-spec.md           ← 本書（主仕様書）
    ├── src/
    ├── public/
    └── README.md
```

#### 0.3.2 参照規約

| 種類                 | パス                                                       |
| -------------------- | ---------------------------------------------------------- |
| 主仕様書（本書）     | `happa-label/docs/happa-label-spec.md`                     |
| 本プロジェクトの kickoff | `happa-label/happa-label-kickoff.md`                       |
| parent v1.1 spec     | `happa/docs/happa-designtool-v1.1-spec.md`                 |
| parent v1.0 spec     | `happa/docs/happa-designtool.md` (legacy、参考用)         |
| parent prototype     | `happa/docs/prototype.html` (補助 reference)               |
| parent 実装          | `happa/src/`                                               |
| parent wireframe     | `happa/wireframes/v0.10/wireframe.html`                    |
| parent kickoff       | `happa/happa-v1.1-kickoff.md` (v1.1 実装フロー、参考)     |

- 本書で「v1.1 継承」と書かれたモジュールは、parent の対応ファイルを必ず参照
- 改変が必要な箇所は §6.1.5「継承モジュール対応表」に明記
- 矛盾が生じた場合、**本書が parent spec に優先**する

#### 0.3.3 Agent Teams 起動前提

- 起動前に `happa-label/AGENTS.md` を最初に読む（プロジェクト全体の前提・禁止事項・フロー）
- 本書（happa-label-spec.md）を主仕様書として参照
- 実装手順・受入テストは `happa-label/happa-label-kickoff.md` を参照
- parent への参照は read-only。parent のファイルは絶対に書き換えない

---

## 1. 設計の骨子

happa-label が継承する 5 機構と、削除する 3 機構、追加する 2 機構を明示する。

### 1.1 継承する設計（v1.1 から）

| 機構                            | 役割                                                          |
| ------------------------------- | ------------------------------------------------------------- |
| **正多角形 + Shape Jitter**     | 主形態の起点。3〜24 頂点、jitter で「毎回違うが毎回 happa」  |
| **二相レンダリング**            | progress=0 はソリッド、progress>0 で Voronoi 爆破が出現      |
| **Adaptive Phantom Offset**     | 破片数に応じて phantom 距離を自動調整、Voronoi 充填保証      |
| **Unified Path2D**              | 全セルを一つの Path2D に結合、AA シーム解消                  |
| **Overlay (clip 内描画)**       | ラベル本体（ロゴ等）を重ねる足場として維持。静止描画         |

### 1.2 削除する設計（v1.1 から）

| 機構                              | 削除理由                                                  |
| --------------------------------- | --------------------------------------------------------- |
| **外周テキスト**                  | プロジェクトの方針（テキストを取り除く）                  |
| **Warped Silhouette**             | テキスト経路として導入されたもの。経路用途が消滅          |
| **混植タイポグラフィ + Font Library** | テキスト関連の全削除に連動                            |

### 1.3 追加する設計（v0.1 で新規）

| 機構                            | 役割                                                       |
| ------------------------------- | ---------------------------------------------------------- |
| **PNG 倍率指定**                | ×1 / ×2 / ×4 で書き出し、印刷対応の解像度を確保            |
| **SVG エクスポート**            | ラベル印刷ワークフロー（ベクター入稿）対応                 |

---

## 2. 確定事項一覧

v1.1 spec の D-1〜D-20 から、テキスト関連を除いた継承事項に、`happa-label` 固有の DL-x を追加。

### 2.1 v1.1 から継承する決定

| #    | 論点                              | 決定                                                                 |
| ---- | --------------------------------- | -------------------------------------------------------------------- |
| D-1  | 破片分布                          | 均一分布（Lloyd 緩和）                                               |
| D-2  | 破片の飛距離                      | 画面内滞留（Inner Cell 短辺 10%、Perimeter Cell は ×2.5）           |
| D-3  | イージング                        | easeOutExpo                                                          |
| D-4  | カラー UI                         | HEX 入力、内部 OKLCH                                                  |
| D-5  | ランダム再配色                    | 補色ペア                                                              |
| D-11 | 書き出し範囲                      | 外周（padding 含む）まで                                             |
| D-12 | 主形態                            | 正多角形（vertex count picker + shape jitter）                       |
| D-13 | 二相レンダリング                  | progress=0 時は innerPoly をベタ塗り、>0 で分割                      |
| D-14 | Voronoi 充填保証                  | adaptive phantom offset                                              |
| D-15 | シーム描画                        | Unified Path2D                                                       |

### 2.2 失効した決定（テキスト関連）

D-6 / D-7 / D-8 / D-9 / D-10（外周テキスト関連）
D-16（warped silhouette）
D-17 / D-18 / D-19 / D-20（typography / 文字色）

### 2.3 happa-label 固有の決定（DL-x）

| #     | 論点                              | 決定                                                                  |
| ----- | --------------------------------- | --------------------------------------------------------------------- |
| DL-1  | 色体制                            | Surface / Inner の 2 色                                               |
| DL-2  | レイアウト                        | `pad = gutter + bleed`（textBand / textMargin / fontSize を削除）   |
| DL-3  | PNG 出力                          | 倍率 ×1 / ×2 / ×4 から選択                                            |
| DL-4  | SVG 出力                          | 静止フレーム（現 progress）をベクターで書き出し                       |
| DL-5  | GIF 出力                          | v1.1 を継承（最大辺 900px、30fps × 3 秒 = 90 frames）                |
| DL-6  | Overlay                           | innerPoly clip 内に画像を**静止**描画。state.showOverlay で ON/OFF   |
| DL-7  | UI アイデンティティ               | Happo VM 継承（dark theme + mono フォント + accent `#ff3300`）        |

---

## 3. レイアウト

物理キャンバスは 3 層の入れ子構造（v1.1 から 1 層減）：

```
┌──────────────────────────────────────────────────────┐ ← outer canvas (書き出し範囲)
│   pad (gutter + bleed)                                │
│  ┌────────────────────────────────────────────────┐  │
│  │                                                │  │
│  │                INNER CANVAS                    │  │
│  │             (正多角形 innerPoly を内接)         │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**各量**（innerShort = min(innerW, innerH) 比）:

| 名前          | 算出                                      | 役割                                  |
| ------------- | ----------------------------------------- | ------------------------------------- |
| `innerW/H`    | Aspect Ratio プリセット                   | 主被写体の領域（1080×1080 等）       |
| `gutter`      | `innerShort × gutterPct%` (default 12%)   | 破片の飛び出し余白（画面内滞留側）   |
| `bleed`       | `gutter × bleedMult` (default 1.0)        | さらなる余白（Perimeter 破片の到達） |
| `pad`         | `gutter + bleed`                          | 外周の合計余白                        |
| `outerW/H`    | `innerW + 2×pad / innerH + 2×pad`         | 物理キャンバスサイズ（= 書き出しサイズ） |

v1.1 にあった `textMargin`, `textBand`, `fontSize` は Layout 型から完全に削除。

---

## 4. 核となる設計モデル

v1.1 spec から継承（テキスト経路系を除く）。アルゴリズムの詳細は parent spec を参照することを推奨するが、本書だけで実装に着手できるよう要点を再掲する。

### 4.1 正多角形 + Shape Jitter（D-12）

vertex count picker: `[3, 4, 5, 6, 7, 8, 10, 12, 16, 24]`、default = 6。
shapeRandomness: 0–100%、default = 0。

```ts
function generateInitialPolygon(L, N, jitterPct, seed): Vec2[] {
  const [cx, cy] = [innerCenter.x, innerCenter.y];
  const [rx, ry] = [innerW/2, innerH/2];
  const rng = mulberry32(seed + 54321);
  const rAmp = jitterPct / 100;

  // 偶数面は頂点を斜めにずらし（四角形は軸平行）、奇数面は上向き
  const startAngle = N % 2 === 0
    ? -Math.PI/2 - Math.PI/N
    : -Math.PI/2;

  const poly: Vec2[] = [];
  for (let i = 0; i < N; i++) {
    const baseAngle = startAngle + (i/N) * 2*Math.PI;
    const angleJit  = (rng() - 0.5) * (2*Math.PI/N) * 0.4 * rAmp;
    const angle     = baseAngle + angleJit;
    const radMult   = 1 - rng() * rAmp * 0.45;
    poly.push([
      cx + Math.cos(angle) * rx * radMult,
      cy + Math.sin(angle) * ry * radMult,
    ]);
  }
  return poly;
}
```

### 4.2 二相レンダリング（D-13）

**progress = 0（未爆破）**:
```
1. Surface 色で innerPoly をそのままベタ塗り
2. Voronoi 分割は一切描かない
3. Overlay があれば innerPoly clip 内に描画（静止）
```

**progress > 0（爆破進行中・完了）**:
```
1. Inner 色で innerPoly をベタ塗り（後ろに見える色）
2. innerPoly で clip
3. Unified Path2D で全 cell を結合し Surface 色で fill（AA シーム撲滅）
4. Overlay があれば innerPoly clip 内に描画（静止 = 爆破に追従しない）
```

判定:
```ts
if (state.progress === 0) renderPreExplosion(...);
else                      renderExplosion(...);
```

v1.1 にあった「cell 単位 clip による Overlay 追従」は廃止。ラベル背景という用途では Overlay は静止しているべき（DL-6）。

### 4.3 Adaptive Phantom Offset（D-14）

Voronoi が innerPoly を完全に覆うために、innerPoly の外側に phantom 点を配置する。
phantom 距離は破片密度に比例：

```ts
const polyArea     = polygonArea(innerPoly);
const avgCellRad   = Math.sqrt(polyArea / fragmentCount / Math.PI);
const phantomOffset = clamp(
  avgCellRad * 1.4,
  innerShort * 0.04,
  innerShort * 0.25
);
```

| 破片数 | avgCellRad（正方形 1080² 想定） | phantomOffset                |
| ------ | ------------------------------- | ---------------------------- |
| 20     | ~136                            | ~190（上限 0.25 × innerShort で抑制） |
| 80     | ~68                             | ~95                          |
| 200    | ~43                             | ~60                          |

### 4.4 Unified Path2D（D-15）

```ts
const surfacePath = new Path2D();
for (const poly of displacedPolys) {
  if (poly.length < 3) continue;
  surfacePath.moveTo(poly[0][0], poly[0][1]);
  for (let j = 1; j < poly.length; j++) surfacePath.lineTo(poly[j][0], poly[j][1]);
  surfacePath.closePath();
}
ctx.fillStyle = state.surfaceColor;
ctx.fill(surfacePath);
```

セル間の共有エッジは内部的に重なり、AA のにじみが発生しない。

### 4.5 Voronoi セル分類と挙動（v1.0 継承）

```ts
const shrunkPoly = offsetPolygonRadial(innerPoly, -min(gutter*0.6, innerShort*0.08));
const isInner = pointInPolygon(cellCentroid, shrunkPoly);
```

| 分類           | 条件                                  | 変位上限                                      | 回転振幅 |
| -------------- | ------------------------------------- | --------------------------------------------- | -------- |
| Inner Cell     | centroid ∈ shrunkPoly                 | `innerShort × innerDispPct%` (default 10%)    | ×1.2     |
| Perimeter Cell | centroid ∉ shrunkPoly                 | 上記 × `perimMult` (default 2.5)             | ×4.8     |

### 4.6 Overlay レイヤー（DL-6）

innerPoly で clip した領域内に、ユーザーが指定した画像（PNG / 透過 PNG）を描画する。

- 二相のいずれでも `showOverlay = true` のとき描画
- 描画位置は innerPoly のバウンディングボックスに合わせ、aspect を維持してフィット
- 爆破に追従**しない**（cell 単位 clip 廃止）。背景の歪みとは独立して、ロゴが定位置に居続ける
- 用途: B フェーズで「ロゴ＋ラベル背景の組合せプレビュー」を実現するための足場

---

## 5. 機能要件

### 5.1 継承（v1.1 から）

- FR-01 〜 FR-08: Aspect ratio プリセット、DETONATE、RESET、シード
- FR-14: 3 秒アニメーション（easeOutExpo）
- FR-18/19: 拡張キャンバスで書き出し
- FR-21/22: vertex count picker、Shape Jitter スライダー
- FR-23/24: 二相レンダリング
- FR-25(部分)/26/27: 色（Surface / Inner / Randomize、Text 列は削除）
- FR-28〜32: Explosion パラメータ（Inner Disp / Perim Disp / Speed Variance / Direction Noise / Rotation）

### 5.2 失効（v1.1 から）

- FR-33〜FR-38: typography 関連を全削除
- FR-39〜40 の旧出力仕様: 後述の FR-L01〜L03 で再定義

### 5.3 新規（happa-label v0.1）

#### 出力（DL-3, DL-4, DL-5）

- **FR-L01**: PNG 出力。倍率 ×1 / ×2 / ×4 から選択。基準サイズは outer canvas size。
- **FR-L02**: SVG 出力。現 progress フレームをベクターで書き出し（Voronoi セル群を `<path>` として結合、Overlay は base64 `<image>` として埋め込み）。
- **FR-L03**: GIF 出力。最大辺 900px、30fps × 3 秒 = 90 frames。

#### Overlay（DL-6）

- **FR-L04**: 画像（PNG / 透過 PNG）を Overlay として読み込み、innerPoly clip 内に描画。
- **FR-L05**: Overlay の表示 ON/OFF トグル、画像クリアボタン。

---

## 6. コアロジック実装仕様

### 6.0 Phase 0: 準備工程（環境セットアップ + 継承コピー）

Phase A の前に実行する。`@state-agent` または `@core-agent` が単独で着手し、他 agent は完了を待つ。

#### 6.0.1 ディレクトリ雛形

```bash
cd design-engineering
mkdir -p happa-label/{docs,src/core,src/state,src/render,src/ui,src/export,public}
touch happa-label/{README.md,index.html,.gitignore}
```

#### 6.0.2 技術スタック設定（parent から流用）

| ファイル          | 扱い                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| `package.json`    | parent の依存を踏襲。`culori`, `d3-delaunay` は継続。テキスト系の不要パッケージは除外（v1.1 で webfontloader 等を使っていた場合は削除） |
| `tsconfig.json`   | parent をそのままコピー（TS strict）                                  |
| `biome.json`      | parent をそのままコピー                                              |
| `vite.config.ts`  | parent をそのままコピー、base path のみ調整                          |
| `pnpm-lock.yaml`  | `pnpm install` で再生成                                              |

#### 6.0.3 継承モジュール対応表（v1.1 → v0.1）

| v1.1 ファイル                     | v0.1 での扱い                                       | 担当 agent       |
| --------------------------------- | --------------------------------------------------- | ---------------- |
| `core/rng.ts`                     | そのままコピー                                       | @core-agent      |
| `core/easing.ts`                  | そのままコピー                                       | @core-agent      |
| `core/polygon.ts`                 | コピー後、`subdividePolygon` / `warpPolygonByCells` を削除。残り（`generateInitialPolygon`, `offsetPolygonRadial`, `pointInPolygon`, `polygonCentroid`, `polygonAABB`, `polygonArea`）を継承 | @core-agent      |
| `core/voronoi.ts`                 | そのままコピー                                       | @core-agent      |
| `core/color.ts`                   | コピー後、Text 色生成のロジック削除（v1.1 spec §5.6 にあれば）       | @core-agent      |
| `core/silhouette.ts`              | **コピーしない**                                     | —                |
| `core/typography.ts`              | **コピーしない**                                     | —                |
| `core/types.ts`                   | 本書 §6.2 に従い新規実装（`TextPathData` 系は持ち込まない） | @state-agent     |
| `state/store.ts`                  | 本書 §7 の `AppState` 定義に従い新規実装             | @state-agent     |
| `state/presets.ts`                | **コピーしない**                                     | —                |
| `state/fonts.ts`                  | **コピーしない**                                     | —                |
| `render/scene.ts`                 | コピー後、本書 §6.3 に微調整。adaptive phantom offset は維持 | @render-agent    |
| `render/preExplosion.ts`          | コピー後、末尾に Overlay 描画呼び出しを追加          | @render-agent    |
| `render/explosion.ts`             | コピー後、warped silhouette 関連を削除、Overlay 描画は innerPoly clip で静止 | @render-agent    |
| `render/text.ts`                  | **コピーしない**                                     | —                |
| `render/guides.ts`                | コピー後、text path guide 削除、innerPoly / cell edges のみ残す | @render-agent    |
| `ui/controls.ts`                  | 本書 §8 に従い書き換え（text / font UI 削除、Export UI 拡張） | @ui-agent        |
| `ui/colorPicker.ts`               | コピー後、Text 列を削除（2 色版に簡素化）            | @ui-agent        |
| `ui/fontPicker.ts`                | **コピーしない**                                     | —                |
| `export/png.ts`                   | コピー後、倍率指定（1/2/4）を追加                    | @export-agent    |
| `export/gif.ts`                   | そのままコピー                                       | @export-agent    |
| `main.ts`                         | parent を参考に書き直し（テキスト系 import / 初期化を除去） | @state-agent     |
| `index.html`                      | parent をベースに `<title>` 等を `happa-label` に変更 | @ui-agent        |

**新規作成ファイル**:

| 新規ファイル              | 担当 agent       | 仕様参照     |
| ------------------------- | ---------------- | ------------ |
| `src/render/overlay.ts`   | @render-agent    | 本書 §6.4    |
| `src/ui/overlayPicker.ts` | @ui-agent        | 本書 §8      |
| `src/export/svg.ts`       | @export-agent    | 本書 §6.5    |

#### 6.0.4 完了基準

- `pnpm install` が通る
- `pnpm dev` で空（または最小限の）Vite アプリが立ち上がる
- `src/` 配下に上記対応表どおりのファイルが配置されている
- 削除対象ファイルが**一切存在しない**ことを確認

Phase 0 完了後、Phase A 〜 C を §10.2 のとおり進める。

### 6.1 ファイル構成

```
design-engineering/happa-label/
├── docs/
│   └── happa-label-spec.md          [本書]
├── src/
│   ├── core/
│   │   ├── rng.ts                   [v1.1 継承]
│   │   ├── easing.ts                [v1.1 継承]
│   │   ├── polygon.ts               [縮小: generateInitialPolygon, offsetPolygonRadial, pointInPolygon, polygonCentroid, polygonAABB, polygonArea のみ。subdivide / warp 系は削除]
│   │   ├── voronoi.ts               [v1.1 継承: generatePhantomRing, lloydInPolygon, generatePointsInPolygon, buildCells]
│   │   └── color.ts                 [v1.1 継承: hexToOklch, oklchToHex, randomComplementaryPair]
│   ├── state/
│   │   └── store.ts                 [簡素化: テキスト・フォント関連フィールド削除]
│   ├── render/
│   │   ├── scene.ts                 [v1.1 継承: buildScene (adaptive phantom offset)]
│   │   ├── preExplosion.ts          [v1.1 継承 + Overlay 描画追加]
│   │   ├── explosion.ts             [簡素化: warped silhouette / text 関連削除、Overlay 静止描画]
│   │   ├── overlay.ts               [新規: 画像 Overlay 描画ロジック]
│   │   └── guides.ts                [簡素化: text path guide 削除、innerPoly / cell edges のみ]
│   ├── ui/
│   │   ├── controls.ts              [簡素化: text / font UI 削除、Export UI 拡張]
│   │   ├── colorPicker.ts           [簡素化: 2 色版（Text 列削除）]
│   │   └── overlayPicker.ts         [新規: 画像読み込み + クリア UI]
│   ├── export/
│   │   ├── png.ts                   [拡張: 倍率指定（1/2/4）]
│   │   ├── svg.ts                   [新規]
│   │   └── gif.ts                   [v1.1 継承]
│   └── main.ts
├── public/
└── README.md
```

### 6.2 型定義

```ts
// src/core/types.ts
export type Vec2 = [number, number];

export interface Layout {
  innerW: number; innerH: number; innerShort: number;
  gutter: number; bleed: number; pad: number;
  outerW: number; outerH: number;
  innerX0: number; innerY0: number;
  innerX1: number; innerY1: number;
}

export interface Cell {
  points: Vec2[];          // Voronoi セル頂点
  centroid: Vec2;          // seed 点
  isInner: boolean;
  vx: number; vy: number;  // 変位ベクトル
  rot: number;             // 回転（rad）
}

export interface Scene {
  innerPoly: Vec2[];       // 正多角形（未分割、subdivide しない）
  cells: Cell[];
}
```

v1.1 にあった `TextPathData` / `SilhouettePoint` / `FontSpec` は全て廃止。

### 6.3 Scene Build（adaptive phantom offset を含む）

```ts
// src/render/scene.ts
export function buildScene(L: Layout, state: AppState): Scene {
  const rng = mulberry32(Math.floor(state.seed * 1e9));
  const innerPoly = generateInitialPolygon(L, state.vertexCount, state.shapeRandomness, state.seed);

  // Adaptive phantom offset
  const area = polygonArea(innerPoly);
  const avgCellRadius = Math.sqrt(area / Math.max(1, state.fragmentCount) / Math.PI);
  const phantomOffset = Math.min(
    L.innerShort * 0.25,
    Math.max(L.innerShort * 0.04, avgCellRadius * 1.4)
  );

  const shrinkDist = Math.min(L.gutter * 0.6, L.innerShort * 0.08);
  const shrunkPoly = offsetPolygonRadial(innerPoly, -shrinkDist);

  // Seed 点: innerPoly 内に fragmentCount 個 + Lloyd 緩和 + jitter
  let realPoints = generatePointsInPolygon(innerPoly, state.fragmentCount, rng);
  realPoints = lloydInPolygon(realPoints, innerPoly, 3);
  const jAmp = (state.randomness / 100) * L.innerShort * 0.02;
  realPoints = realPoints.map(([x, y]) => [
    x + (rng() - 0.5) * jAmp,
    y + (rng() - 0.5) * jAmp,
  ]);

  // Phantom ring（外側リング）
  const phantoms = generatePhantomRing(innerPoly, phantomOffset, 6);
  const allPoints = [...realPoints, ...phantoms];
  const d = d3.Delaunay.from(allPoints);
  const [pMinX, pMinY, pMaxX, pMaxY] = polygonAABB(phantoms);
  const vPad = L.bleed + L.gutter;
  const v = d.voronoi([pMinX - vPad, pMinY - vPad, pMaxX + vPad, pMaxY + vPad]);

  // Cell を構築
  const [innerCX, innerCY] = [(L.innerX0 + L.innerX1)/2, (L.innerY0 + L.innerY1)/2];
  const noiseRad = (state.directionNoise / 180) * Math.PI;
  const V = state.speedVariance / 100;
  const rotAmp = state.rotation / 100;

  const cells: Cell[] = [];
  for (let i = 0; i < realPoints.length; i++) {
    const poly = v.cellPolygon(i);
    if (!poly) continue;
    const [px, py] = realPoints[i];
    const isInner = pointInPolygon([px, py], shrunkPoly);
    const dx = px - innerCX, dy = py - innerCY;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    const ux = dx/dist, uy = dy/dist;
    const aJ = (rng() - 0.5) * 2 * noiseRad;
    const [cosJ, sinJ] = [Math.cos(aJ), Math.sin(aJ)];
    const [vx, vy] = [ux*cosJ - uy*sinJ, ux*sinJ + uy*cosJ];
    const spd = 1 - V + rng() * 2*V;
    const innerMax = L.innerShort * (state.innerDispPct / 100);
    const maxDisp = isInner ? innerMax : innerMax * state.perimMult;
    cells.push({
      points: poly as Vec2[],
      centroid: [px, py],
      isInner,
      vx: vx * maxDisp * spd,
      vy: vy * maxDisp * spd,
      rot: (rng() - 0.5) * (isInner ? 1.2 : 4.8) * rotAmp,
    });
  }

  return { cells, innerPoly };
}
```

### 6.4 Overlay 描画（DL-6）

```ts
// src/render/overlay.ts
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  innerPoly: Vec2[],
  image: HTMLImageElement,
): void {
  ctx.save();
  // innerPoly で clip
  ctx.beginPath();
  ctx.moveTo(innerPoly[0][0], innerPoly[0][1]);
  for (let i = 1; i < innerPoly.length; i++) {
    ctx.lineTo(innerPoly[i][0], innerPoly[i][1]);
  }
  ctx.closePath();
  ctx.clip();
  // innerPoly の AABB に aspect 維持でフィット
  const [minX, minY, maxX, maxY] = polygonAABB(innerPoly);
  const w = maxX - minX, h = maxY - minY;
  const imgAspect = image.naturalWidth / image.naturalHeight;
  const boxAspect = w / h;
  let dw: number, dh: number;
  if (imgAspect > boxAspect) {
    dw = w; dh = w / imgAspect;
  } else {
    dh = h; dw = h * imgAspect;
  }
  const dx = minX + (w - dw) / 2;
  const dy = minY + (h - dh) / 2;
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.restore();
}
```

### 6.5 SVG エクスポート（DL-4）

```ts
// src/export/svg.ts
export function exportSVG(L: Layout, scene: Scene, state: AppState): string {
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.outerW} ${L.outerH}" width="${L.outerW}" height="${L.outerH}">`);

  // clipPath 定義
  out.push(`<defs><clipPath id="inner-clip"><path d="${polyToPathD(scene.innerPoly)}"/></clipPath></defs>`);

  if (state.progress === 0) {
    // innerPoly 単一 fill
    out.push(`<path d="${polyToPathD(scene.innerPoly)}" fill="${state.surfaceColor}"/>`);
  } else {
    // 1. Inner 色 base
    out.push(`<path d="${polyToPathD(scene.innerPoly)}" fill="${state.innerColor}"/>`);
    // 2. Voronoi cells を結合 path として Surface 色（innerPoly clip 内）
    const displacedPolys = scene.cells.map(c => transformPoly(c, state.progress));
    const combined = displacedPolys.map(polyToPathD).join(' ');
    out.push(`<path d="${combined}" fill="${state.surfaceColor}" clip-path="url(#inner-clip)"/>`);
  }

  // Overlay
  if (state.showOverlay && state.overlayDataUrl) {
    const [minX, minY, maxX, maxY] = polygonAABB(scene.innerPoly);
    out.push(`<image href="${state.overlayDataUrl}" x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" clip-path="url(#inner-clip)" preserveAspectRatio="xMidYMid meet"/>`);
  }

  out.push(`</svg>`);
  return out.join('\n');
}

function polyToPathD(poly: Vec2[]): string {
  if (poly.length < 3) return '';
  return `M${poly[0][0]} ${poly[0][1]} ${poly.slice(1).map(p => `L${p[0]} ${p[1]}`).join(' ')} Z`;
}
```

### 6.6 PNG 倍率出力（DL-3）

```ts
// src/export/png.ts
export async function exportPNG(state: AppState, scale: 1|2|4): Promise<Blob> {
  const L = computeLayout(state);
  const canvas = document.createElement('canvas');
  canvas.width = L.outerW * scale;
  canvas.height = L.outerH * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  render(ctx, state, L);  // 通常の render パイプラインを倍率付きで再実行

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
}
```

### 6.7 OKLCH 実装（D-4, D-5）

v1.1 spec 5.6 をそのまま継承。`culori` パッケージ利用。Text 色生成のロジックのみ削除。

```ts
// src/core/color.ts
import { oklch, formatHex, parse } from 'culori';

export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const c = oklch(parse(hex))!;
  return { l: c.l, c: c.c, h: c.h ?? 0 };
}

export function oklchToHex(l: number, c: number, h: number): string {
  return formatHex(oklch({ mode: 'oklch', l, c, h }))!;
}

export function randomComplementaryPair(): { surface: string; inner: string } {
  const hBase = Math.random() * 360;
  const hA = hBase;
  const hB = (hBase + 180 + (Math.random() - 0.5) * 30) % 360;
  const lHigh = 0.75 + Math.random() * 0.17;
  const lLow  = 0.18 + Math.random() * 0.22;
  const cA = 0.08 + Math.random() * 0.12;
  const cB = 0.08 + Math.random() * 0.12;
  const flip = Math.random() < 0.5;
  return {
    surface: oklchToHex(flip ? lHigh : lLow, cA, hA),
    inner:   oklchToHex(flip ? lLow  : lHigh, cB, hB),
  };
}
```

---

## 7. 状態設計

```ts
// src/state/store.ts
export interface AppState {
  // layout
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16';
  gutterPct: number;       // default 12
  bleedMult: number;       // default 1.0

  // shape
  vertexCount: number;     // default 6
  shapeRandomness: number; // default 0

  // animation
  progress: number;        // 0–1
  seed: number;

  // fragmentation
  fragmentCount: number;   // default 80
  randomness: number;      // default 50

  // explosion motion
  innerDispPct: number;    // default 10
  perimMult: number;       // default 2.5
  speedVariance: number;   // default 40
  directionNoise: number;  // default 13
  rotation: number;        // default 50

  // color (2 colors)
  surfaceColor: string;    // hex
  innerColor: string;      // hex

  // overlay
  showOverlay: boolean;
  overlayDataUrl: string | null;

  // export
  pngScale: 1 | 2 | 4;     // default 1

  // guides
  showCells: boolean;
  showHull: boolean;
}
```

### 7.1 変更伝播

| 変更フィールド                                                               | 再計算                                |
| ---------------------------------------------------------------------------- | ------------------------------------- |
| `aspectRatio`, `gutterPct`, `bleedMult`                                      | layout → scene → render               |
| `vertexCount`, `shapeRandomness`, `seed`                                     | scene → render                        |
| `fragmentCount`, `randomness`                                                | scene（Voronoi 再構築）              |
| `innerDispPct`, `perimMult`, `speedVariance`, `directionNoise`, `rotation`   | cell 変位のみ再計算（Voronoi 流用可）|
| `progress`                                                                   | render のみ                           |
| `surfaceColor`, `innerColor`                                                 | render のみ                           |
| `showOverlay`, `overlayDataUrl`                                              | render のみ                           |
| `pngScale`                                                                   | 出力時のみ                            |

---

## 8. UI 構成

Happo VM v1.1 の dark theme + mono フォント + accent `#ff3300` を**継承**（DL-7）。テキスト・フォント関連のセクションを削除し、Overlay と Export を強化。

```
1. Brand header (happa-label / v0.1)
2. Aspect Ratio            [16:9 | 4:3 | 1:1 | 9:16]
3. Animation
   - Progress slider
   - [DETONATE] [RESET]
4. Shape — Regular Polygon
   - Vertex count picker (3/4/5/6/7/8/10/12/16/24)
   - Shape Jitter slider
5. Colors
   - Surface (hex + picker)
   - Inner   (hex + picker)
   - [↻ RANDOMIZE COLORS]
6. Layout
   - Edge Band (%)
   - Bleed (×band)
7. Fragmentation — Voronoi
   - 破片数 Count
   - Cell Jitter (%)
8. Explosion — Fragment Motion
   - Inner Disp (%)
   - Perim Disp (×)
   - Speed Variance (%)
   - Direction Noise (°)
   - Rotation (%)
   - [↻ SHUFFLE SEED]
9. Overlay                          ← 新規セクション
   - Enable toggle
   - [↑ Load Image] (PNG / 透過 PNG)
   - [✕ Clear]
10. Guides
    - Show innerPoly
    - Cell Edges
11. Export                          ← 拡張
    - PNG Scale: [×1 | ×2 | ×4]
    - [Download PNG]
    - [Download SVG]
    - [Download GIF]
```

### 8.1 UI 視覚仕様（DL-7）

Happo VM v1.1 の wireframe v0.10 の CSS を継承する：

- **Background**: dark theme（near-black surface、`#0a0a0a` 系）
- **Accent**: `#ff3300`（happa ラインの統一カラー、発破の象徴）
- **Font**: mono（`ui-monospace, 'SF Mono', Menlo, Consolas, monospace`）
- **品質基準**: パネル、スライダー、ボタンの精度・余白・タイポグラフィを Happo VM 同等の洗練度で仕上げる。引き算の美学を担保するため、ラベル文字・補助テキストの最小化、グリッドの整合、コントロール間の余白の統一を徹底する。

---

## 9. レンダリングパイプライン

```ts
// src/render/main.ts（擬似コード）
function render(ctx: CanvasRenderingContext2D, state: AppState): void {
  const L = computeLayout(state);
  fitCanvas(ctx.canvas, L);
  const scene = buildScene(L, state);

  ctx.clearRect(0, 0, L.outerW, L.outerH);

  if (state.progress === 0) {
    renderPreExplosion(ctx, L, scene.innerPoly, state);
  } else {
    renderExplosion(ctx, L, scene, state);
  }

  // Overlay は二相のどちらでも、最後に重ねる（静止）
  if (state.showOverlay && state.overlayDataUrl) {
    const img = getCachedImage(state.overlayDataUrl);
    if (img) drawOverlay(ctx, L, scene.innerPoly, img);
  }

  drawGuides(ctx, scene, state);
}
```

v1.1 にあった `subdividePolygon` → `warpPolygonByCells` → `buildTextPath` → `drawTextAlongPath` のシーケンスは全削除。

---

## 10. Agent 責務とフェーズ

### 10.1 Agent 担当マトリクス

| Agent            | 主担当                                                                           |
| ---------------- | -------------------------------------------------------------------------------- |
| `@state-agent`   | `AppState` 定義（簡素化版）、変更伝播ルール                                       |
| `@core-agent`    | polygon.ts（縮小）、voronoi.ts、color.ts                                         |
| `@render-agent`  | scene.ts、preExplosion / explosion 二相化、Unified Path2D、overlay.ts、guides.ts |
| `@ui-agent`      | controls.ts、colorPicker.ts（2 色版）、overlayPicker.ts、Export UI               |
| `@export-agent`  | png.ts（倍率指定）、svg.ts（新規）、gif.ts                                       |

### 10.2 実装フェーズ

#### Phase 0 — 準備（state または core agent 単独）
詳細は §6.0 を参照。

- ディレクトリ雛形作成
- 技術スタック設定ファイルのコピー
- 継承モジュール対応表に従ったコピー
- 不要モジュールの除外確認

**完了基準**: §6.0.4 参照。

#### Phase A — 骨格（state + core + render）
- `@state-agent`: `AppState` 定義、デフォルト値、変更伝播
- `@core-agent`: polygon.ts（縮小版）、voronoi.ts、rng/easing は v1.1 から流用
- `@render-agent`: scene.ts、preExplosion / explosion 二相化、Unified Path2D

**完了基準**:
- 正多角形（3–24 頂点）が描画される
- DETONATE 前は innerPoly がソリッド、DETONATE で Voronoi 分割が現れる
- 破片数 20 でも progress>0 で Inner 色が透けない
- AA シームが解消している

#### Phase B — 色 + Overlay（core + render + ui）
- `@core-agent`: color.ts（OKLCH 補色ペア）
- `@render-agent`: overlay.ts（画像 clip 描画）
- `@ui-agent`: 2 色ピッカー、RANDOMIZE COLORS、Overlay 読み込み UI

**完了基準**:
- Surface / Inner が独立に変更可能、Randomize で補色ペア適用
- Overlay 画像が innerPoly clip 内に正しく描画される（aspect 維持）
- 爆破時に Overlay が静止する（追従しない）

#### Phase C — 書き出し（export + ui）
- `@export-agent`: png.ts（倍率 1/2/4）、svg.ts（新規）、gif.ts（v1.1 から流用）
- `@ui-agent`: PNG Scale picker、3 種類の Download ボタン

**完了基準**:
- PNG ×1 / ×2 / ×4 が正しく書き出される（×4 で 4320×4320 想定）
- SVG が現フレームをベクターで書き出す（Voronoi cells が結合 path として）
- SVG 内に Overlay が base64 image として埋め込まれる
- GIF で 3 秒アニメが保存される

### 10.3 並行性

```
Phase 0 ──► Phase A ──► Phase B ──► Phase C
```

Phase 0 は単一 agent で完結、A〜C は §10.1 のとおり複数 agent で並列実装。Phase B の Overlay は A の render パイプライン完成後、Phase C の SVG export は B の Overlay 完成後（SVG にも Overlay が必要なため）。

---

## 11. Open Questions

| ID    | Topic                                                  | 方針                                       | Owner         |
| ----- | ------------------------------------------------------ | ------------------------------------------ | ------------- |
| OQ-L1 | SVG 出力時の Overlay embed 方法                        | base64 data URL で `<image>` に埋め込む。サイズ肥大時は外部参照に切替検討 | @export-agent |
| OQ-L2 | PNG ×4 でのパフォーマンス（4320×4320 想定）            | 実走で計測。許容範囲なら採用、遅い場合はワーカー化検討 | @export-agent |
| OQ-L3 | Overlay 画像のキャッシュ戦略（state.overlayDataUrl）   | localStorage 不採用、メモリ（HTMLImageElement のマップ）のみ | @state-agent  |
| OQ-L4 | SVG での Voronoi セル数上限（200 cells × paths）       | 実走で確認、ファイルサイズが大きすぎる場合は警告表示 | @export-agent |
| OQ-L5 | aspect ratio プリセットにラベル比率を追加するか        | v0.1 は維持（16:9 / 4:3 / 1:1 / 9:16）、B フェーズで検討 | Takuto        |
| OQ-L6 | Overlay 画像サイズ上限（メモリ保護）                   | 4096×4096px / 10MB を上限とし、超過時は警告 | @ui-agent     |

---

## 12. v1.1 からの仕様継承（変更なし）

- 技術スタック: Vite + TypeScript strict + Biome + pnpm
- 依存方向ルール（core → render / state → ui）
- 5 エージェント体制（v1.1 と同構成）
- デザイントークン: dark theme, mono フォント, accent `#ff3300`
- 命名思想（happa = 発破 + 葉）

---

## Appendix

### A.1 デフォルト値一覧

```ts
export const DEFAULTS: AppState = {
  aspectRatio: '1:1',
  gutterPct: 12,
  bleedMult: 1.0,
  vertexCount: 6,
  shapeRandomness: 0,
  progress: 0,
  seed: 0.5,
  fragmentCount: 80,
  randomness: 50,
  innerDispPct: 10,
  perimMult: 2.5,
  speedVariance: 40,
  directionNoise: 13,
  rotation: 50,
  surfaceColor: '#0a0a0a',
  innerColor:   '#ff3300',
  showOverlay: false,
  overlayDataUrl: null,
  pngScale: 1,
  showCells: false,
  showHull: false,
};
```

### A.2 easeOutExpo 進捗テーブル

| t (秒/3秒中) | progress | displacement |
| ------------ | -------- | ------------ |
| 0.00         | 0.00     | 0.000        |
| 0.15 (0.45s) | 0.15     | 0.646        |
| 0.30 (0.90s) | 0.30     | 0.875        |
| 0.50 (1.50s) | 0.50     | 0.969        |
| 1.00 (3.00s) | 1.00     | 1.000        |

### A.3 Parent Spec 参照

実装中に数式・アルゴリズムの詳細を確認する場合、`design-engineering/happa/docs/happa-designtool-v1.1-spec.md` を参照する。継承部分は原典と同一。

### A.4 削除モジュール一覧（v1.1 → v0.1 で消えるもの）

| ファイル                      | 状態     |
| ----------------------------- | -------- |
| `core/silhouette.ts`          | 削除     |
| `core/typography.ts`          | 削除     |
| `state/presets.ts`            | 削除     |
| `state/fonts.ts`              | 削除     |
| `render/text.ts`              | 削除     |
| `ui/fontPicker.ts`            | 削除     |
| `polygon.ts` の subdivide/warp 系 | 削除（同ファイル内の他関数は継承） |
| `colorPicker.ts` の Text 列    | 削除（2 色版に簡素化） |

---

## 変更履歴

- **v0.1 (2026-05-12)**: 初版。happa designtool v1.1 (v0.4 spec) から分岐。
  - テキスト・混植・フォントライブラリ・warped silhouette を削除
  - 色を 2 色（Surface / Inner）に簡素化
  - レイアウトを `pad = gutter + bleed` に簡素化（textBand / textMargin / fontSize 削除）
  - SVG エクスポート（DL-4）と PNG 倍率指定（DL-3）を追加
  - Overlay は継承するが「静止描画」に変更（cell 単位 clip 廃止）
  - UI アイデンティティは Happo VM を継承（DL-7）
