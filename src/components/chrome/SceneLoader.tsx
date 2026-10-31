/** Suspense fallback while a scene chunk downloads (usually hidden behind the brain wipe). */
export function SceneLoader() {
  return (
    <div className="scene-loader" role="status" aria-live="polite">
      <span className="scene-loader__brain" aria-hidden="true">
        🧠
      </span>
      <span>loading brainrot…</span>
    </div>
  )
}
