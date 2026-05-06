# Track F — Polish

> あなたは Track F 担当エージェントです。  
> 他のTrackがコア機能を作った後、**「ただの動くもの」を「作品」に昇華させる**仕上げを担当します。  
> ポストプロセス、テクスチャ、最終トーン、パフォーマンスチューニング、ドキュメント。

---

## 必読

1. `../REQUIREMENTS.md` 全体（特に §3.1 ポスタライズ・リム発光、§9.2 Background）
2. `../CLAUDE.md`
3. 他Trackの実装を読み、何が足りていないかを判断

---

## あなたが作るもの

### F-1. Postprocessing

```
src/components/canvas/Postprocessing.tsx
```

`@react-three/postprocessing` を使用：

```tsx
<EffectComposer>
  <Bloom 
    intensity={...}
    luminanceThreshold={...}
    luminanceSmoothing={...}
    mipmapBlur
  />
  <Vignette eskil={false} offset={0.1} darkness={0.5} />
  {/* Optional: SMAA / FXAA */}
</EffectComposer>
```

#### 重要ポイント
- Bloomは控えめに（Track Bが既に発光感を持っているので、過剰だと潰れる）
- 数値はlevaから受け取れるようにする（Track D連携）
- 録画中はBloom強度を一段下げる選択肢あり（パフォーマンス）

### F-2. Background レイヤー

```
src/components/canvas/Background.tsx
src/shaders/background.frag.glsl
```

REQUIREMENTS.md §9.2:
- ベース色（OKLCH指定の暗色、Track D 連携）
- 中央に微かなRadial Gradient（少し明るく）
- フィルムグレイン（時間で動くノイズ × 0.04）
- ヴィネット（Bloom側でかける場合は不要）
- オプション: 微かなpulse（呼吸するように明度が0.05波打つ）

### F-3. パフォーマンス計測 + 最適化

```
src/lib/perfMonitor.ts
src/components/ui/FPSDisplay.tsx (devtoolsモードのみ表示)
```

- FPS計測（過去1秒の平均）
- メモリ使用量（performance.memory 使えれば）
- インスタンス数あたりのフレーム時間
- 開発モードのみ右下に表示（本番は非表示）

#### チューニング着手項目
- InstancedBufferGeometry の活用確認
- Texture compression（必要なら）
- 描画コール数の最小化
- 不要なuniform更新の削減
- RAF の最適化

### F-4. ローディング演出

```
src/components/ui/LoadingScreen.tsx
```

- MediaPipe wasm のロード中に表示
- 控えめなアニメーション（小さな炎のSVG等）
- 「Initializing flame..." みたいなアートな文言
- 完了したらフェードアウト

### F-5. Photosensitivity 警告

```
src/components/ui/PhotosensitivityWarning.tsx
```

- 初回起動時にフルスクリーンオーバーレイで警告
- 「このコンテンツには明滅が含まれます」
- 「了解」ボタンで非表示（localStorageで記憶）
- `prefers-reduced-motion` を尊重して、その場合はDensity/CurlStrengthを自動で控えめにする

### F-6. README.md のデモGIF / 動画

`README.md` に：
- Hero animation（動画 or GIF）
- スクショ数枚
- コンセプト文章

実際の動画/GIF素材は Track E の録画機能を使って自分で撮る（あるいはその仕組みを作る）。

### F-7. 細かいポリッシュ項目

優先度順に：

1. **インスタンスのZ深度変動** — 全部同じ深度だと平面的。微妙にz軸方向にもばらつきを
2. **モーションブラー風表現** — 速い動きの時だけアルファ足跡を残す
3. **エンバーの弾道** — 重力 or 風で軌跡を描かせる
4. **コーナーcrop** — フルスクリーン時の画面端をわずかに角丸 or グラデで馴染ませる
5. **音** — オプション。マイクは使わないが、効果音として subtle な火の音を鳴らす機能（ON/OFFトグル）

これらは時間と相談して取捨選択。

---

## Track 間の依存

このトラックは**最後に走る**ことが多い。ただし、F-1（Bloom）とF-2（Background）は早めに入れた方が他Trackの開発体験が良くなるので、Phase 1 終了後すぐ着手推奨。

- **Track B**: Postprocessing は B のレンダ結果に乗る。B のintensityと噛み合わせる
- **Track D**: leva に Postprocessing folder を追加（intensity, threshold等）
- **Track E**: 録画中はBloomを一段下げる連携

---

## Definition of Done (Track F)

- [ ] Bloomが控えめだが効いている（炎の発光感が強化されている、潰れていない）
- [ ] Background がグレイン + ヴィネットで「絵」として完成している
- [ ] M1 で60fps（density=200）安定、density=300 で 50fps以上
- [ ] ローディング画面で「待たされてる感」が出ない
- [ ] photosensitivity警告 + reduced-motion対応
- [ ] README.md に hero画像/動画と説明文
- [ ] 全体トーンが「作品」のクオリティに達している

---

## 推奨進行順

1. F-2 Background（早めに入れる）
2. F-1 Postprocessing
3. F-4 LoadingScreen
4. F-5 Photosensitivity
5. F-3 PerfMonitor + 最適化
6. F-7 細かいポリッシュ
7. F-6 README

---

## 完了報告

```
✅ Track F: Polish — Done
- Bloom + Vignette + Grain で雰囲気完成
- M1 で60fps（density=200）安定
- READMEに hero動画
- 動画: <link to demo video>
```
