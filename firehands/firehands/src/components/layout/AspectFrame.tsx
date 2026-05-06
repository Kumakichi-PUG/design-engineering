/**
 * AspectFrame — 16:9 を保ったままウィンドウに収まる中央配置フレーム
 *
 * 設計（REQUIREMENTS.md §3.5 / TRACK_A §A-2）：
 *  - v1 は **16:9 横長のみ**
 *  - ウィンドウサイズに合わせてレスポンシブ
 *  - 余白は OKLCH 暗色（`bg-ink`）
 *  - ResizeObserver で内側の実ピクセルサイズを Zustand に流し込む
 *
 * 計算規則：
 *   inner.width  = min(window.width,  window.height * 16/9)
 *   inner.height = inner.width / (16/9)
 *
 * このコンポーネント自身は children のサイズを CSS で固定し、
 * ResizeObserver は単純化のためフレーム内側の実測値をそのまま store へ送る。
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { useVisualStore } from '@/store/useVisualStore'
import { layout } from '@/styles/tokens'

interface AspectFrameProps {
  children: ReactNode
  /** 開発・デバッグ用。フレームの輪郭線を描画する */
  showOutline?: boolean
}

export function AspectFrame({ children, showOutline = false }: AspectFrameProps): JSX.Element {
  const innerRef = useRef<HTMLDivElement | null>(null)
  const setCanvasSize = useVisualStore((s) => s.setCanvasSize)

  useEffect(() => {
    const el = innerRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // contentBoxSize は配列を返す環境と単一を返す環境がある（仕様上は配列）
        const sizes: readonly ResizeObserverSize[] | undefined = entry.contentBoxSize
        const box = sizes && sizes.length > 0 ? sizes[0] : undefined

        let width: number
        let height: number
        if (box) {
          width = box.inlineSize
          height = box.blockSize
        } else {
          // 古い実装向けフォールバック
          const rect = entry.contentRect
          width = rect.width
          height = rect.height
        }

        // devicePixelRatio を掛けないのは、Three.js 側が自前で dpr を扱うため。
        // ここは CSS ピクセル基準で渡す。
        setCanvasSize({
          width: Math.max(1, Math.round(width)),
          height: Math.max(1, Math.round(height)),
        })
      }
    })

    ro.observe(el)

    // 初期同期：observer は最初の measure を保証するが、
    // 念のため 1 フレーム後に手動で 1 回流し込む
    const rect = el.getBoundingClientRect()
    setCanvasSize({
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    })

    return () => {
      ro.disconnect()
    }
  }, [setCanvasSize])

  // CSS で 16:9 を維持しつつ中央配置
  // - aspect-ratio: 16/9
  // - width / height はウィンドウに対して伸縮、ただし常に 16:9
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-ink">
      <div
        ref={innerRef}
        data-component="aspect-frame"
        style={{
          aspectRatio: `${layout.aspectRatio}`,
          // 横が支配的か縦が支配的かをCSSだけで決める
          // width = min(100vw, 100vh * 16/9)
          width: `min(100vw, 100vh * ${layout.aspectRatio})`,
          maxHeight: '100vh',
          maxWidth: '100vw',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#0a0606',
          outline: showOutline ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
