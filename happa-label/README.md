# happa-label

> 正多角形を Voronoi 爆破することで生成する、ラベル背景のためのジェネラティブ
> ビジュアル VM。出力された PNG / SVG / GIF は VM 発のブランドが用いる
> **ラベル本体（ロゴ・銘柄・規格表示）の背景**として組み合わせて使う。

`happa` = 発破（ダイナマイトの破裂音）+ 葉（若芽・発酵・ホップ）。
姉妹プロジェクト [`happa designtool v1.1`](../happa/) からの分岐。
テキスト・混植・warped silhouette を取り除き、**純粋な造形マシン**として
再構築したライン。

## Development

```bash
pnpm install         # 依存インストール
pnpm dev             # 開発サーバ（http://localhost:5173）
pnpm build           # 本番ビルド
pnpm preview         # ビルド結果の確認
pnpm check           # Biome でのチェック
pnpm check:fix       # Biome で自動修正
pnpm typecheck       # TypeScript 型チェックのみ
```

## Stack

- **Vite 8** + **TypeScript 5.7** (strict)
- **Vanilla DOM**（UI フレームワーク不使用、単一ストアの pub/sub）
- **Canvas 2D** + **d3-delaunay**（Voronoi 分割）
- **culori**（OKLCH 補色ペア生成）
- **gifenc**（GIF エンコード）
- **Biome 2**（lint + format）

## Output

3 形式で書き出し:

- **PNG** — outer canvas サイズ × `×1 / ×2 / ×4` の倍率（例: 1:1 / gutter 12% / bleed ×1.0 で outer ≈ 1339px、×4 で約 5356px）。
- **SVG** — 現フレームをベクター（Voronoi cells を結合 `<path>` + innerPoly の `clipPath` + Overlay は `<image>` で base64 埋め込み）。Illustrator 等で path 単位編集可能。
- **GIF** — 30fps × 3 秒 = 90 frames、最大辺 900px。Overlay は GIF でも静止。

<!-- 出力例: `docs/samples/` に PNG/SVG/GIF サンプルを将来追加 -->

## Documentation

- 主仕様書: [`docs/happa-label-spec.md`](docs/happa-label-spec.md)
- Agent Teams エントリポイント: [`AGENTS.md`](AGENTS.md)
- 実装キックオフ: [`happa-label-kickoff.md`](happa-label-kickoff.md)

## Parent との関係

| 項目 | happa designtool v1.1 (parent) | happa-label v0.1 |
| ---- | ------------------------------ | ---------------- |
| 主目的 | ジェネラティブビジュアル + テキスト | ラベル背景生成 |
| テキスト | 外周混植テキスト | **無し** |
| 色 | Surface / Inner / Text の 3 色 | Surface / Inner の 2 色 |
| 出力 | PNG / GIF | PNG (×1/×2/×4) / SVG / GIF |
| シルエット | warped silhouette でテキストが追従 | **削除** |

parent (`happa/`) は read-only な継承元として monorepo 内に並存する。
詳細は主仕様書 §0.2 / §0.3。

## Agent Team

[`happa-label/AGENTS.md`](AGENTS.md) のとおり 5 エージェント体制で並列開発。

- `@state-agent` — `AppState`、変更伝播、`main.ts`
- `@core-agent` — polygon / voronoi / color / types
- `@render-agent` — scene、二相 render、Unified Path2D、overlay、guides
- `@ui-agent` — controls、colorPicker、overlayPicker、Export UI
- `@export-agent` — PNG（倍率指定）/ SVG（新規）/ GIF（gifenc）

## License

Private. All rights reserved.
