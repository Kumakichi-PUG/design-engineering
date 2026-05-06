/**
 * useVisualStore — グローバル状態のハブ
 *
 * Track A はここに「全Trackが拡張するベース」を置く。
 * 各セクションは Track ごとにオーナーを分けてあるので、追加時は該当 Track セクション
 * にフィールドを足すこと。型を厳格に保ち、any は使わない。
 */

import { create } from 'zustand'

// ============================================================================
// Sub-types
// ============================================================================

export interface CanvasSize {
  /** AspectFrame の内側ピクセル幅 */
  width: number
  /** AspectFrame の内側ピクセル高さ */
  height: number
}

export type MorphEasing = 'linear' | 'sin' | 'quad'

export type RecordResolution = '720p' | '1080p' | '1440p'

// ============================================================================
// Store shape
// ============================================================================

export interface VisualStore {
  // --- Display (Track A) ---------------------------------------------------
  canvasSize: CanvasSize
  setCanvasSize: (size: CanvasSize) => void

  isFullscreen: boolean
  setFullscreen: (v: boolean) => void

  /** GUI 全体を H キーで非表示にする */
  isGuiHidden: boolean
  toggleGui: () => void
  setGuiHidden: (v: boolean) => void

  /** カーソル auto-hide フラグ（フルスクリーン時 Track E が制御） */
  isCursorHidden: boolean
  setCursorHidden: (v: boolean) => void

  // --- Motion (Track B が拡張) ---------------------------------------------
  density: number
  setDensity: (v: number) => void
  upwardSpeed: number
  setUpwardSpeed: (v: number) => void
  curlStrength: number
  setCurlStrength: (v: number) => void
  oneOverFAmount: number
  setOneOverFAmount: (v: number) => void
  oneOverFOctaves: number
  setOneOverFOctaves: (v: number) => void

  // --- Pose Morphing (Track B + C 共有) ------------------------------------
  morphSpeed: number
  setMorphSpeed: (v: number) => void
  morphVariance: number
  setMorphVariance: (v: number) => void
  morphPause: number
  setMorphPause: (v: number) => void
  morphEasing: MorphEasing
  setMorphEasing: (v: MorphEasing) => void

  // --- Shape (Track B + D が拡張) ------------------------------------------
  handScaleMin: number
  handScaleMax: number
  contourWidth: number
  posterizeLevels: number
  setShape: (
    p: Partial<{
      handScaleMin: number
      handScaleMax: number
      contourWidth: number
      posterizeLevels: number
    }>,
  ) => void

  // --- Color (Track D が拡張) ----------------------------------------------
  baseHue: number
  setBaseHue: (v: number) => void
  hueSpread: number
  setHueSpread: (v: number) => void
  chroma: number
  setChroma: (v: number) => void
  lightnessMin: number
  setLightnessMin: (v: number) => void
  lightnessMax: number
  setLightnessMax: (v: number) => void

  // --- Background (Track F) ------------------------------------------------
  grainAmount: number
  vignette: number
  pulseAmount: number
  setBackground: (
    p: Partial<{ grainAmount: number; vignette: number; pulseAmount: number }>,
  ) => void

  // --- Ghost Layer (Track C) -----------------------------------------------
  ghostOpacity: number
  ghostDriftSpeed: number
  ghostVisible: boolean
  setGhost: (
    p: Partial<{ ghostOpacity: number; ghostDriftSpeed: number; ghostVisible: boolean }>,
  ) => void

  // --- Ember (Track B) -----------------------------------------------------
  emberCount: number
  emberSpeed: number
  emberSharpness: number
  setEmber: (
    p: Partial<{ emberCount: number; emberSpeed: number; emberSharpness: number }>,
  ) => void

  // --- Camera & Hand Registration (Track C) --------------------------------
  cameraEnabled: boolean
  setCameraEnabled: (v: boolean) => void
  autoRegister: boolean
  setAutoRegister: (v: boolean) => void
  autoRegisterDelay: number
  setAutoRegisterDelay: (v: number) => void
  registeredHandsCount: number
  setRegisteredHandsCount: (v: number) => void

  // --- Export (Track E) ----------------------------------------------------
  isRecording: boolean
  setRecording: (v: boolean) => void
  recordResolution: RecordResolution
  setRecordResolution: (v: RecordResolution) => void
  recordingStartedAt: number | null
  setRecordingStartedAt: (v: number | null) => void
}

// ============================================================================
// Store implementation
// ============================================================================

/**
 * 初期値。全 Track の合意点。値域・単位は REQUIREMENTS.md §3.7 を参照。
 */
const INITIAL_STATE = {
  // Display
  canvasSize: { width: 1280, height: 720 } satisfies CanvasSize,
  isFullscreen: false,
  isGuiHidden: false,
  isCursorHidden: false,

  // Motion
  density: 100,
  upwardSpeed: 1.0,
  curlStrength: 0.8,
  oneOverFAmount: 0.45,
  oneOverFOctaves: 6,

  // Pose Morphing
  morphSpeed: 0.18,
  morphVariance: 0.4,
  morphPause: 0.4,
  morphEasing: 'sin' as MorphEasing,

  // Shape
  handScaleMin: 0.45,
  handScaleMax: 1.1,
  contourWidth: 1.4,
  posterizeLevels: 4,

  // Color
  baseHue: 22, // 起動時に Track D が再ロール、ここはオレンジ寄りの初期値
  hueSpread: 60,
  chroma: 0.22,
  lightnessMin: 0.5,
  lightnessMax: 0.95,

  // Background
  grainAmount: 0.04,
  vignette: 0.25,
  pulseAmount: 0.015,

  // Ghost
  ghostOpacity: 0.1,
  ghostDriftSpeed: 0.3,
  ghostVisible: true,

  // Ember
  emberCount: 50,
  emberSpeed: 1.8,
  emberSharpness: 0.7,

  // Camera & Hand Registration
  cameraEnabled: false,
  autoRegister: true,
  autoRegisterDelay: 2,
  registeredHandsCount: 0,

  // Export
  isRecording: false,
  recordResolution: '1080p' as RecordResolution,
  recordingStartedAt: null as number | null,
} as const

export const useVisualStore = create<VisualStore>((set) => ({
  // Display
  canvasSize: INITIAL_STATE.canvasSize,
  setCanvasSize: (size) => set({ canvasSize: size }),
  isFullscreen: INITIAL_STATE.isFullscreen,
  setFullscreen: (v) => set({ isFullscreen: v }),
  isGuiHidden: INITIAL_STATE.isGuiHidden,
  toggleGui: () => set((s) => ({ isGuiHidden: !s.isGuiHidden })),
  setGuiHidden: (v) => set({ isGuiHidden: v }),
  isCursorHidden: INITIAL_STATE.isCursorHidden,
  setCursorHidden: (v) => set({ isCursorHidden: v }),

  // Motion
  density: INITIAL_STATE.density,
  setDensity: (v) => set({ density: v }),
  upwardSpeed: INITIAL_STATE.upwardSpeed,
  setUpwardSpeed: (v) => set({ upwardSpeed: v }),
  curlStrength: INITIAL_STATE.curlStrength,
  setCurlStrength: (v) => set({ curlStrength: v }),
  oneOverFAmount: INITIAL_STATE.oneOverFAmount,
  setOneOverFAmount: (v) => set({ oneOverFAmount: v }),
  oneOverFOctaves: INITIAL_STATE.oneOverFOctaves,
  setOneOverFOctaves: (v) => set({ oneOverFOctaves: v }),

  // Pose Morphing
  morphSpeed: INITIAL_STATE.morphSpeed,
  setMorphSpeed: (v) => set({ morphSpeed: v }),
  morphVariance: INITIAL_STATE.morphVariance,
  setMorphVariance: (v) => set({ morphVariance: v }),
  morphPause: INITIAL_STATE.morphPause,
  setMorphPause: (v) => set({ morphPause: v }),
  morphEasing: INITIAL_STATE.morphEasing,
  setMorphEasing: (v) => set({ morphEasing: v }),

  // Shape
  handScaleMin: INITIAL_STATE.handScaleMin,
  handScaleMax: INITIAL_STATE.handScaleMax,
  contourWidth: INITIAL_STATE.contourWidth,
  posterizeLevels: INITIAL_STATE.posterizeLevels,
  setShape: (p) => set(p),

  // Color
  baseHue: INITIAL_STATE.baseHue,
  setBaseHue: (v) => set({ baseHue: v }),
  hueSpread: INITIAL_STATE.hueSpread,
  setHueSpread: (v) => set({ hueSpread: v }),
  chroma: INITIAL_STATE.chroma,
  setChroma: (v) => set({ chroma: v }),
  lightnessMin: INITIAL_STATE.lightnessMin,
  setLightnessMin: (v) => set({ lightnessMin: v }),
  lightnessMax: INITIAL_STATE.lightnessMax,
  setLightnessMax: (v) => set({ lightnessMax: v }),

  // Background
  grainAmount: INITIAL_STATE.grainAmount,
  vignette: INITIAL_STATE.vignette,
  pulseAmount: INITIAL_STATE.pulseAmount,
  setBackground: (p) => set(p),

  // Ghost
  ghostOpacity: INITIAL_STATE.ghostOpacity,
  ghostDriftSpeed: INITIAL_STATE.ghostDriftSpeed,
  ghostVisible: INITIAL_STATE.ghostVisible,
  setGhost: (p) => set(p),

  // Ember
  emberCount: INITIAL_STATE.emberCount,
  emberSpeed: INITIAL_STATE.emberSpeed,
  emberSharpness: INITIAL_STATE.emberSharpness,
  setEmber: (p) => set(p),

  // Camera & Hand Registration
  cameraEnabled: INITIAL_STATE.cameraEnabled,
  setCameraEnabled: (v) => set({ cameraEnabled: v }),
  autoRegister: INITIAL_STATE.autoRegister,
  setAutoRegister: (v) => set({ autoRegister: v }),
  autoRegisterDelay: INITIAL_STATE.autoRegisterDelay,
  setAutoRegisterDelay: (v) => set({ autoRegisterDelay: v }),
  registeredHandsCount: INITIAL_STATE.registeredHandsCount,
  setRegisteredHandsCount: (v) => set({ registeredHandsCount: v }),

  // Export
  isRecording: INITIAL_STATE.isRecording,
  setRecording: (v) => set({ isRecording: v }),
  recordResolution: INITIAL_STATE.recordResolution,
  setRecordResolution: (v) => set({ recordResolution: v }),
  recordingStartedAt: INITIAL_STATE.recordingStartedAt,
  setRecordingStartedAt: (v) => set({ recordingStartedAt: v }),
}))

/**
 * セレクタヘルパ — 高頻度更新フィールドの再レンダ防止に使う想定。
 */
export const selectCanvasSize = (s: VisualStore): CanvasSize => s.canvasSize
export const selectIsGuiHidden = (s: VisualStore): boolean => s.isGuiHidden
export const selectIsFullscreen = (s: VisualStore): boolean => s.isFullscreen
