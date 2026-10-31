import type { SceneId } from '../../state/app'

/**
 * Site-wide backdrop: grape gradient, three drifting glow blobs (tinted per scene),
 * a faint grid and film grain. Pure CSS — cheap, and dims itself in calm mode.
 * Only the landing lets it show through; behind the experiences' opaque backdrops
 * the blobs stay put (paused) so they cost nothing.
 */
export function AmbientBackground({ scene }: { scene: SceneId }) {
  return (
    <div className={`ambient ambient--${scene}`} aria-hidden="true">
      <div className="ambient__blob ambient__blob--a is-ambient" />
      <div className="ambient__blob ambient__blob--b is-ambient" />
      <div className="ambient__blob ambient__blob--c is-ambient" />
      <div className="ambient__grid" />
      <div className="ambient__grain" />
      <div className="ambient__vignette" />
    </div>
  )
}
