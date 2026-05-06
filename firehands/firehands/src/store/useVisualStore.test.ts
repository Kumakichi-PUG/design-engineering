/**
 * useVisualStore — smoke tests
 *
 * Track A の責務は「全 Track が拡張できる安全な骨格」。ここでは
 *  - 初期値が想定通り入っていること
 *  - setter が状態を正しく更新すること
 *  - toggleGui が反転すること
 * を最小限カバーする。詳細な動作テストは各 Track が拡張時に足す想定。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useVisualStore } from './useVisualStore'

describe('useVisualStore', () => {
  beforeEach(() => {
    // store はモジュールスコープのシングルトン。各テスト前に手動でリセット。
    useVisualStore.setState({
      canvasSize: { width: 1280, height: 720 },
      isFullscreen: false,
      isGuiHidden: false,
      isCursorHidden: false,
    })
  })

  it('exposes sensible defaults', () => {
    const s = useVisualStore.getState()
    expect(s.canvasSize.width).toBeGreaterThan(0)
    expect(s.canvasSize.height).toBeGreaterThan(0)
    // 16:9 比率（初期値）
    expect(s.canvasSize.width / s.canvasSize.height).toBeCloseTo(16 / 9, 4)
    expect(s.density).toBe(100)
    expect(s.isGuiHidden).toBe(false)
    expect(s.isFullscreen).toBe(false)
  })

  it('updates canvasSize via setter', () => {
    useVisualStore.getState().setCanvasSize({ width: 1920, height: 1080 })
    const s = useVisualStore.getState()
    expect(s.canvasSize.width).toBe(1920)
    expect(s.canvasSize.height).toBe(1080)
  })

  it('toggleGui flips isGuiHidden', () => {
    expect(useVisualStore.getState().isGuiHidden).toBe(false)
    useVisualStore.getState().toggleGui()
    expect(useVisualStore.getState().isGuiHidden).toBe(true)
    useVisualStore.getState().toggleGui()
    expect(useVisualStore.getState().isGuiHidden).toBe(false)
  })

  it('partial setters merge correctly (setShape)', () => {
    useVisualStore.getState().setShape({ contourWidth: 2.5 })
    const s = useVisualStore.getState()
    expect(s.contourWidth).toBe(2.5)
    // 他のフィールドは元のまま
    expect(s.posterizeLevels).toBe(4)
  })
})
