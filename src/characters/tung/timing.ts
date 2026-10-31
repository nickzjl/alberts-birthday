/**
 * Moments (ms after a pose starts) scenes can sync effects to. Lives in its own module so
 * Tung.tsx only exports components (keeps React Fast Refresh working).
 */
import { DROP_FALL, DROP_RELEASE, DROP_SETTLE, SLAM_IMPACT, THROW_RELEASE } from './poses'

export const TUNG_TIMING = {
  /** slam: bat hits the ground (shake / boom here) */
  slamImpactMs: SLAM_IMPACT * 1000,
  /** throw: the bat should leave the hand (set hasBat=false + spawn a TungBat projectile) */
  throwReleaseMs: THROW_RELEASE * 1000,
  /** dropBat: bat slips out of the hand… */
  dropReleaseMs: DROP_RELEASE * 1000,
  /** …clatters on the ground… */
  dropLandMs: (DROP_RELEASE + DROP_FALL) * 1000,
  /**
   * …and has stopped bouncing. After a dropBat, switching to any pose with hasBat=false leaves
   * the bat lying exactly where it landed (the rig keeps drawing it), so scenes never need to
   * swap in their own prop.
   */
  dropRestMs: (DROP_RELEASE + DROP_FALL + DROP_SETTLE) * 1000,
}
