import paper from 'paper';

/**
 * 黒オブジェクト（外側）を生成する
 *
 * 結合ルール（3パターン）:
 * 1. ノッチ同士の重なり → 中間頂点を除去し1つの切り欠きに統合
 * 2. ノッチが上端に接触 → 右上角の頂点とノッチ入口を省略
 * 3. ノッチが下端に接触 → 右下角の頂点とノッチ出口を省略
 */

// 描画領域のマージン比率（短辺に対する比率）
const MARGIN_RATIO = 40 / 1080;

/**
 * 現在のビューサイズから描画領域を算出する
 * @param {number} viewW - ビュー幅
 * @param {number} viewH - ビュー高さ
 */
export function getDrawArea(viewW, viewH) {
  const margin = Math.round(Math.min(viewW, viewH) * MARGIN_RATIO);
  return {
    margin,
    drawX: margin,
    drawY: margin,
    drawW: viewW - margin * 2,
    drawH: viewH - margin * 2,
  };
}

/** 静音時の最小幅（描画領域に対する比率） */
const MIN_WIDTH_RATIO = 0.25;

// 白オブジェクトのオフセット比率（短辺に対する比率、元は60/1080）
const OFFSET_RATIO = 60 / 1080;

/**
 * 現在のビューサイズに応じたオフセット量(px)を返す
 */
export function getOffsetPx(area) {
  return Math.round(Math.min(area.drawW + area.margin * 2, area.drawH + area.margin * 2) * OFFSET_RATIO);
}

/** 端の接触判定しきい値 */
const EDGE_EPS = 1.0;

/**
 * ノッチ群を右辺プロファイルに変換し、重なりを結合する
 */
function buildMergedProfile(notches, notchCloseFactor, effectiveWidth, area) {
  const MIN_DEPTH = 10;
  const topY = area.drawY;
  const bottomY = area.drawY + area.drawH;
  // ノッチ深さの最大値（白のオフセット分を確保）
  const offsetPx = getOffsetPx(area);
  const maxDepth = effectiveWidth - offsetPx * 2;

  const rects = notches.map((n) => {
    // depthMin/depthMax がある場合はレンジ補間、なければ単一depth
    let rawDepth;
    if (n.depthMin != null && n.depthMax != null) {
      // notchCloseFactor: 0=静音→depthMax, 1=大音量→depthMin
      rawDepth = n.depthMax + (n.depthMin - n.depthMax) * notchCloseFactor;
    } else {
      rawDepth = n.depth * (1 - notchCloseFactor);
    }
    rawDepth = Math.max(MIN_DEPTH, rawDepth);
    const depth = Math.min(rawDepth, maxDepth);
    const top = Math.max(topY, area.drawY + n.yRatio * area.drawH);
    const bottom = Math.min(bottomY, top + n.heightRatio * area.drawH);
    return { top, bottom, depth };
  }).filter((r) => r.bottom > r.top);

  if (rects.length === 0) return [];

  const ySet = new Set();
  for (const r of rects) {
    ySet.add(r.top);
    ySet.add(r.bottom);
  }
  const ys = [...ySet].sort((a, b) => a - b);

  const bands = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const yMid = (ys[i] + ys[i + 1]) / 2;
    let maxD = 0;
    for (const r of rects) {
      if (yMid >= r.top && yMid < r.bottom) {
        maxD = Math.max(maxD, r.depth);
      }
    }
    if (maxD > 0) {
      bands.push({ yStart: ys[i], yEnd: ys[i + 1], depth: maxD });
    }
  }

  const merged = [];
  for (const band of bands) {
    const last = merged[merged.length - 1];
    if (last && last.depth === band.depth && Math.abs(last.yEnd - band.yStart) < 0.01) {
      last.yEnd = band.yEnd;
    } else {
      merged.push({ ...band });
    }
  }

  const groups = [];
  let currentGroup = [];
  for (const band of merged) {
    const last = currentGroup[currentGroup.length - 1];
    if (last && last.yEnd < band.yStart - 0.01) {
      groups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push(band);
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  return groups;
}

/**
 * 連続する重複頂点を除去する
 */
function deduplicateVertices(vertices) {
  if (vertices.length === 0) return vertices;
  const EPS = 0.01;
  const result = [vertices[0]];
  for (let i = 1; i < vertices.length; i++) {
    const prev = result[result.length - 1];
    if (Math.abs(vertices[i].x - prev.x) > EPS || Math.abs(vertices[i].y - prev.y) > EPS) {
      result.push(vertices[i]);
    }
  }
  if (result.length > 1) {
    const first = result[0];
    const last = result[result.length - 1];
    if (Math.abs(first.x - last.x) < EPS && Math.abs(first.y - last.y) < EPS) {
      result.pop();
    }
  }
  return result;
}

/**
 * ノッチ配列から黒オブジェクトの頂点を生成する
 *
 * @param {Array<{ yRatio: number, heightRatio: number, depth: number }>} notches
 * @param {number} notchCloseFactor - ノッチ閉じ具合（0=開, 1=閉）
 * @param {number} widthFactor - 幅の比率（0=最小幅, 1=フル幅）音量連動
 * @returns {paper.Point[]} 頂点配列（時計回り）
 */
export function generateBlackVertices(notches = [], notchCloseFactor = 0, widthFactor = 1, area = null) {
  if (!area) area = getDrawArea(1920, 1080);
  const effectiveWidth = area.drawW * MIN_WIDTH_RATIO + area.drawW * (1 - MIN_WIDTH_RATIO) * widthFactor;
  const rightEdge = area.drawX + effectiveWidth;
  const topY = area.drawY;
  const bottomY = area.drawY + area.drawH;

  if (notches.length === 0) {
    return [
      new paper.Point(area.drawX, topY),
      new paper.Point(rightEdge, topY),
      new paper.Point(rightEdge, bottomY),
      new paper.Point(area.drawX, bottomY),
    ];
  }

  const groups = buildMergedProfile(notches, notchCloseFactor, effectiveWidth, area);

  if (groups.length === 0) {
    return [
      new paper.Point(area.drawX, topY),
      new paper.Point(rightEdge, topY),
      new paper.Point(rightEdge, bottomY),
      new paper.Point(area.drawX, bottomY),
    ];
  }

  const firstGroup = groups[0];
  const touchesTop = firstGroup[0].yStart <= topY + EDGE_EPS;
  const lastGroup = groups[groups.length - 1];
  const touchesBottom = lastGroup[lastGroup.length - 1].yEnd >= bottomY - EDGE_EPS;

  const vertices = [];

  vertices.push(new paper.Point(area.drawX, topY));

  if (!touchesTop) {
    vertices.push(new paper.Point(rightEdge, topY));
  }

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    const groupTouchesTop = gi === 0 && touchesTop;
    const groupTouchesBottom = gi === groups.length - 1 && touchesBottom;

    if (!groupTouchesTop) {
      vertices.push(new paper.Point(rightEdge, group[0].yStart));
    }
    vertices.push(new paper.Point(rightEdge - group[0].depth, group[0].yStart));

    for (let i = 1; i < group.length; i++) {
      const prev = group[i - 1];
      const curr = group[i];
      vertices.push(new paper.Point(rightEdge - prev.depth, curr.yStart));
      if (Math.abs(prev.depth - curr.depth) > 0.01) {
        vertices.push(new paper.Point(rightEdge - curr.depth, curr.yStart));
      }
    }

    const last = group[group.length - 1];
    vertices.push(new paper.Point(rightEdge - last.depth, last.yEnd));
    if (!groupTouchesBottom) {
      vertices.push(new paper.Point(rightEdge, last.yEnd));
    }
  }

  if (!touchesBottom) {
    vertices.push(new paper.Point(rightEdge, bottomY));
  }

  vertices.push(new paper.Point(area.drawX, bottomY));

  return deduplicateVertices(vertices);
}

/**
 * 頂点配列からPaper.jsのPathを生成する
 */
export function createBlackPath(vertices, fillColor = '#1a1a1a') {
  return new paper.Path({
    segments: vertices,
    closed: true,
    fillColor,
    strokeColor: null,
  });
}

/**
 * 黒オブジェクトを生成する便利関数
 */
export function createBlackShape(notches = [], notchCloseFactor = 0, widthFactor = 1, fillColor = '#1a1a1a', area = null) {
  const vertices = generateBlackVertices(notches, notchCloseFactor, widthFactor, area);
  const path = createBlackPath(vertices, fillColor);
  return { path, vertices };
}
