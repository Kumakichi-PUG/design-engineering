import paper from 'paper';

/**
 * 白オブジェクト（内側）
 * - 黒の60px内側オフセット
 * - パス全周に等間隔でジグザグポイントを配置
 * - 無音時でも微かに動くアンビエントモーション
 */

const OFFSET = 60;

/**
 * 直角ポリゴンの各辺を内側にオフセットし、白の頂点を算出する
 */
export function generateWhiteVertices(blackVertices, offset = OFFSET) {
  const n = blackVertices.length;

  const offsetEdges = [];
  for (let i = 0; i < n; i++) {
    const a = blackVertices[i];
    const b = blackVertices[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    let nx, ny;
    if (Math.abs(dx) > Math.abs(dy)) {
      nx = 0;
      ny = dx > 0 ? 1 : -1;
    } else {
      nx = dy > 0 ? -1 : 1;
      ny = 0;
    }

    offsetEdges.push({
      a: new paper.Point(a.x + nx * offset, a.y + ny * offset),
      b: new paper.Point(b.x + nx * offset, b.y + ny * offset),
      horizontal: Math.abs(dx) > Math.abs(dy),
    });
  }

  const whiteVertices = [];
  for (let i = 0; i < n; i++) {
    const prev = offsetEdges[(i - 1 + n) % n];
    const curr = offsetEdges[i];

    let x, y;
    if (prev.horizontal && !curr.horizontal) {
      y = prev.a.y;
      x = curr.a.x;
    } else if (!prev.horizontal && curr.horizontal) {
      x = prev.a.x;
      y = curr.a.y;
    } else {
      x = curr.a.x;
      y = curr.a.y;
    }

    whiteVertices.push(new paper.Point(x, y));
  }

  return whiteVertices;
}

/**
 * 辺の内向き法線（CWポリゴン、スクリーン座標系）
 */
function getInwardNormal(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    return { x: 0, y: dx > 0 ? 1 : -1 };
  } else {
    return { x: dy > 0 ? -1 : 1, y: 0 };
  }
}

/**
 * 擬似Perlinノイズ（サイン波の重ね合わせ）
 *
 * 2つの入力軸（ポイント位置 × 時間）に対して滑らかに変化する
 * -1〜+1 の値を返す。ポイント間で連続的に変化するため、
 * フレームごとにランダムが飛ぶことなく有機的に見える。
 *
 * @param {number} x - 空間軸（ポイントインデックスなど）
 * @param {number} t - 時間軸（秒）
 * @returns {number} -1〜+1
 */
function smoothNoise(x, t) {
  // 5オクターブの重ね合わせ（振幅が半減していく）
  let val = 0;
  val += Math.sin(x * 1.0 + t * 0.7) * 0.40;
  val += Math.sin(x * 2.3 + t * 1.1) * 0.25;
  val += Math.sin(x * 4.1 + t * 0.5) * 0.15;
  val += Math.sin(x * 7.7 + t * 1.7) * 0.12;
  val += Math.sin(x * 13.0 + t * 0.9) * 0.08;
  return val;
}

/**
 * アンビエントモーションのオフセットを計算する
 *
 * @param {number} index - ポイント番号
 * @param {number} time - 経過時間（秒）
 * @param {number} amount - アンビエント振幅（px）
 * @returns {number} 法線方向のオフセット量
 */
function ambientOffset(index, time, amount) {
  if (amount <= 0) return 0;
  return smoothNoise(index * 0.8, time) * amount;
}

/**
 * 白パスの全周長に対して等間隔でジグザグポイントを配置する
 *
 * 辺の境界をまたいでも均一な間隔を維持する。
 * - 偶数番ポイント（0始まり: 0,2,4...）: オフセット線上 + アンビエント
 * - 奇数番ポイント（0始まり: 1,3,5...）: 内側に引っ込む + アンビエント
 *
 * @param {paper.Point[]} whiteVertices - 白のフラット頂点配列
 * @param {number} totalPoints - パス全体のポイント総数
 * @param {number} indentAmount - 奇数番ポイントの引っ込み量（px）
 * @param {number} time - 経過時間（秒）アンビエントモーション用
 * @param {number} ambientAmount - アンビエント振幅（px）
 * @param {number} randomAmount - 引っ込み量のランダムばらつき（0=均一, 1=最大）
 * @param {number} spacingRandomAmount - 間隔のランダムばらつき（0=等間隔, 1=最大）
 * @returns {paper.Point[]} ジグザグ化されたポイント列
 */
export function generateZigzagPoints(whiteVertices, totalPoints, indentAmount, time = 0, ambientAmount = 0, randomAmount = 0, spacingRandomAmount = 0) {
  const n = whiteVertices.length;

  // 各辺の情報を構築
  const edges = [];
  let totalPerimeter = 0;
  for (let i = 0; i < n; i++) {
    const a = whiteVertices[i];
    const b = whiteVertices[(i + 1) % n];
    const len = a.getDistance(b);
    edges.push({
      a,
      b,
      len,
      normal: getInwardNormal(a, b),
      cumStart: totalPerimeter,
    });
    totalPerimeter += len;
  }

  const spacing = totalPerimeter / totalPoints;

  // --- 間隔ランダム化 ---
  // 各ポイントのペリメーター上の距離を算出
  // ノイズで前後にずらした後、順序が逆転しないよう単調増加を保証する
  const distances = new Array(totalPoints);
  if (spacingRandomAmount > 0) {
    const maxShift = spacing * 0.45 * spacingRandomAmount; // 最大でも間隔の45%までずらす
    for (let i = 0; i < totalPoints; i++) {
      const noise = smoothNoise(i * 0.7 + 200, time * 0.3);
      distances[i] = i * spacing + noise * maxShift;
    }
    // 単調増加を保証（前のポイントより最低1px先に）
    for (let i = 1; i < totalPoints; i++) {
      if (distances[i] <= distances[i - 1]) {
        distances[i] = distances[i - 1] + 1;
      }
    }
    // 周長を超えないようクランプ
    for (let i = 0; i < totalPoints; i++) {
      distances[i] = ((distances[i] % totalPerimeter) + totalPerimeter) % totalPerimeter;
    }
  } else {
    for (let i = 0; i < totalPoints; i++) {
      distances[i] = i * spacing;
    }
  }

  // --- パス1: 各ポイントのベース位置と所属辺を算出 ---
  const basePoints = new Array(totalPoints);
  const edgeIndices = new Array(totalPoints);

  for (let i = 0; i < totalPoints; i++) {
    const dist = distances[i];

    let ei = edges.length - 1;
    for (let e = 0; e < edges.length; e++) {
      const nextStart = e < edges.length - 1
        ? edges[e + 1].cumStart
        : totalPerimeter;
      if (dist >= edges[e].cumStart && dist < nextStart) {
        ei = e;
        break;
      }
    }

    const edge = edges[ei];
    const t = edge.len > 0 ? (dist - edge.cumStart) / edge.len : 0;
    basePoints[i] = {
      x: edge.a.x + (edge.b.x - edge.a.x) * t,
      y: edge.a.y + (edge.b.y - edge.a.y) * t,
    };
    edgeIndices[i] = ei;
  }

  // --- パス2: 引っ込み量を算出し、自己交差防止クランプを適用 ---
  const indents = new Array(totalPoints).fill(0);

  for (let i = 0; i < totalPoints; i++) {
    if (i % 2 !== 1) continue; // 偶数番はスキップ

    // ノイズで深さにばらつき
    const noise = smoothNoise(i * 1.3 + 100, time * 0.4);
    const multiplier = 1 + noise * randomAmount;
    let rawIndent = indentAmount * Math.max(0, multiplier);

    // --- 自己交差防止 ---
    // 隣接する偶数番ポイント間のペリメーター距離の半分を上限とする
    // これによりトゲの高さがトゲの幅を超えず、隣のトゲと交差しない
    const prevEven = i - 1;
    const nextEven = (i + 1) % totalPoints;
    let span = distances[nextEven] - distances[prevEven];
    if (span <= 0) span += totalPerimeter; // 周回ラップ対応
    const maxIndent = span * 0.48; // 幅の48%まで（安全マージン）

    indents[i] = Math.min(rawIndent, maxIndent);
  }

  // --- パス3: 最終ポイント座標を生成 ---
  const points = [];

  for (let i = 0; i < totalPoints; i++) {
    const edge = edges[edgeIndices[i]];
    const base = basePoints[i];
    const ambient = ambientOffset(i, time, ambientAmount);
    const totalOffset = indents[i] + ambient;

    points.push(new paper.Point(
      base.x + edge.normal.x * totalOffset,
      base.y + edge.normal.y * totalOffset,
    ));
  }

  return points;
}

/**
 * ジグザグ化された白パスを生成する
 */
export function createZigzagWhitePath(whiteVertices, totalPoints, indentAmount, time = 0, ambientAmount = 0, randomAmount = 0, spacingRandomAmount = 0) {
  const points = generateZigzagPoints(whiteVertices, totalPoints, indentAmount, time, ambientAmount, randomAmount, spacingRandomAmount);
  return new paper.Path({
    segments: points,
    closed: true,
    fillColor: '#ffffff',
    strokeColor: null,
  });
}

/**
 * デバッグ用: 頂点番号を表示する
 */
export function drawVertexLabels(blackVertices, whiteVertices) {
  const group = new paper.Group();

  blackVertices.forEach((pt, i) => {
    group.addChild(new paper.Path.Circle({
      center: pt, radius: 6, fillColor: '#ff3333',
    }));
    group.addChild(new paper.PointText({
      point: [pt.x + 10, pt.y - 10],
      content: `B${i}`,
      fontSize: 14, fontWeight: 'bold', fillColor: '#ff3333',
    }));
  });

  whiteVertices.forEach((pt, i) => {
    group.addChild(new paper.Path.Circle({
      center: pt, radius: 6, fillColor: '#3366ff',
    }));
    group.addChild(new paper.PointText({
      point: [pt.x + 10, pt.y + 16],
      content: `W${i}`,
      fontSize: 14, fontWeight: 'bold', fillColor: '#3366ff',
    }));
  });

  return group;
}
