/**
 * App — メインコンポーネント
 *
 * Track A がこの中身を埋めます：
 * - <AspectFrame> で 16:9 を保ちつつ <FlameCanvas /> を中央配置
 * - <CameraConsent /> (Track C)
 * - <LevaPanel /> (Track D)
 * - <RecordingIndicator /> (Track E)
 * - <PrivacyOverlay /> (Track C)
 * - <PhotosensitivityWarning /> (Track F)
 */
function App() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-ink text-white/40 font-mono text-sm">
      <div
        className="flex items-center justify-center border border-white/10"
        style={{ aspectRatio: '16 / 9', width: 'min(90vw, 90vh * 16/9)' }}
      >
        🔥 Hello flame — Track A が AspectFrame に置き換える予定の場所
      </div>
    </div>
  )
}

export default App
