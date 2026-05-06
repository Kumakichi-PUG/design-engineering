/**
 * useKeyboardShortcuts — グローバルショートカットの登録口
 *
 * REQUIREMENTS.md §3.9 / §3.7 [Display] を踏まえ、最小ショートカットを束ねる：
 *
 *   F   — Fullscreen toggle  (Track E が実装)
 *   H   — Hide GUI toggle    (Track A：本フックが直接 store を操作)
 *   R   — Re-roll palette    (Track D が実装)
 *   S   — Screenshot         (Track E が実装)
 *   ESC — Exit fullscreen    (Track E が実装)
 *
 * 各 Track はこの hook の opts に handler を渡すだけで参加できる。
 * Track A は H キーだけ、本 hook 内部で完結させる（store にしか触らないので）。
 */

import { useEffect } from 'react'
import { useVisualStore } from '@/store/useVisualStore'

/** Track 横断で共有するキー定義 */
export type ShortcutKey = 'F' | 'H' | 'R' | 'S' | 'ESC'

export interface ShortcutHandlers {
  /** F: フルスクリーン切替 */
  onToggleFullscreen?: () => void
  /** R: パレット Re-roll */
  onRerollPalette?: () => void
  /** S: スクリーンショット保存 */
  onScreenshot?: () => void
  /** ESC: フルスクリーン終了 / モーダル閉じる */
  onEscape?: () => void
  /** H: GUI 非表示切替（未指定なら store の toggleGui を呼ぶ） */
  onToggleGui?: () => void
}

interface Options {
  /** 入力中（input/textarea/contenteditable）はショートカットを無効化する */
  ignoreWhenTyping?: boolean
}

/**
 * 一度だけ window に keydown を貼る。再レンダで listener が増えないよう ref はあえて使わない。
 */
export function useKeyboardShortcuts(
  handlers: ShortcutHandlers = {},
  options: Options = {},
): void {
  const toggleGui = useVisualStore((s) => s.toggleGui)
  const setFullscreen = useVisualStore((s) => s.setFullscreen)
  const ignoreWhenTyping = options.ignoreWhenTyping ?? true

  useEffect(() => {
    function isTyping(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (target.isContentEditable) return true
      return false
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (e.repeat) return
      if (ignoreWhenTyping && isTyping(e.target)) return
      // 修飾キー付きはユーザー操作（コピペ等）を尊重してスキップ
      if (e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key) {
        case 'f':
        case 'F': {
          e.preventDefault()
          handlers.onToggleFullscreen?.()
          break
        }
        case 'h':
        case 'H': {
          e.preventDefault()
          if (handlers.onToggleGui) {
            handlers.onToggleGui()
          } else {
            toggleGui()
          }
          break
        }
        case 'r':
        case 'R': {
          e.preventDefault()
          handlers.onRerollPalette?.()
          break
        }
        case 's':
        case 'S': {
          e.preventDefault()
          handlers.onScreenshot?.()
          break
        }
        case 'Escape': {
          e.preventDefault()
          // ESC は Track A も兼任：フルスクリーン即解除を保証
          setFullscreen(false)
          handlers.onEscape?.()
          break
        }
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    handlers,
    handlers.onToggleFullscreen,
    handlers.onToggleGui,
    handlers.onRerollPalette,
    handlers.onScreenshot,
    handlers.onEscape,
    toggleGui,
    setFullscreen,
    ignoreWhenTyping,
  ])
}
