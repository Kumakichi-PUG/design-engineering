/**
 * App — Hands of Flame ルートコンポーネント
 *
 * Track A は AspectFrame と "Hello flame" プレースホルダだけを置く。
 * 他 Track の枠は各 Track が main にマージされたタイミングでこの中に追加されていく。
 *
 * 最終形（イメージ）：
 *   AspectFrame > FlameCanvas             (Track B)
 *   CameraConsent / PrivacyOverlay        (Track C)
 *   LevaPanel                             (Track D)
 *   RecordingIndicator                    (Track E)
 */

import { AspectFrame } from '@/components/layout/AspectFrame'
import { useVisualStore } from '@/store/useVisualStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

function App(): JSX.Element {
  // Track A: H キー → GUI トグル、ESC → フルスクリーン解除（中身は store.toggleGui / setFullscreen）
  useKeyboardShortcuts()

  const isGuiHidden = useVisualStore((s) => s.isGuiHidden)
  const isCursorHidden = useVisualStore((s) => s.isCursorHidden)
  const canvasSize = useVisualStore((s) => s.canvasSize)

  return (
    <div className={isCursorHidden ? 'cursor-hidden h-full w-full' : 'h-full w-full'}>
      <AspectFrame>
        {/* プレースホルダ：他 Track が <FlameCanvas /> 等に置き換える */}
        <FlamePlaceholder width={canvasSize.width} height={canvasSize.height} />
      </AspectFrame>

      {/* GUI レイヤ — H キーで完全非表示にできる */}
      <div className={isGuiHidden ? 'gui-hidden' : ''}>
        {/* Track D: <LevaPanel />, Track E: <RecordingIndicator />, Track C: <CameraConsent /> 等 */}
      </div>
    </div>
  )
}

/**
 * 仮プレースホルダ。Track B の FlameCanvas が来たら削除する。
 */
function FlamePlaceholder({ width, height }: { width: number; height: number }): JSX.Element {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3"
      style={{
        // 背景は最終的にシェーダが描く。今は素直な暗色グラデで存在感だけ示す
        background:
          'radial-gradient(ellipse at center bottom, rgba(40, 14, 6, 1) 0%, rgba(10, 6, 6, 1) 70%)',
      }}
      role="img"
      aria-label="Hello flame placeholder"
    >
      <div
        className="text-white/50"
        style={{
          fontFamily: '"Tenor Sans", serif',
          fontSize: 'clamp(20px, 3vw, 36px)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        Hello flame
      </div>
      <div
        className="text-white/25"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '11px',
          letterSpacing: '0.08em',
        }}
      >
        {width} × {height} · 16:9
      </div>
    </div>
  )
}

export default App
