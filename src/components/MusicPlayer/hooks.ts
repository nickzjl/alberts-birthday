import { useMotionValue, type MotionValue } from 'motion/react'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { soundtrack } from '../../audio/soundtrack'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/**
 * Record rotation (deg) shared by every disc: eases up to ~33rpm while playing and
 * coasts down to a stop on pause. Runs its own rAF only while moving.
 */
export function useSpin(playing: boolean, enabled: boolean): MotionValue<number> {
  const rot = useMotionValue(0)
  const vel = useRef(0)
  useEffect(() => {
    if (!enabled) {
      vel.current = 0
      return
    }
    if (!playing && vel.current === 0) return
    const target = playing ? 200 : 0
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const k = playing ? 2.6 : 1.25
      vel.current += (target - vel.current) * (1 - Math.exp(-k * dt))
      rot.set((rot.get() + vel.current * dt) % 360)
      if (!playing && vel.current < 3) {
        vel.current = 0
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playing, enabled, rot])
  return rot
}

/**
 * Calls `fn(position)` every frame while `active` (and once when it stops).
 * Pass `everyMs` for slow-moving readouts (e.g. the pill's progress ring creeps ~1px/s):
 * a cheap timer then replaces the per-frame loop, so the always-visible pill doesn't
 * cost a paint every frame during the scenes.
 */
export function usePlayhead(active: boolean, fn: (pos: number) => void, everyMs = 0) {
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })
  useEffect(() => {
    fnRef.current(soundtrack.getPosition())
    if (!active) return
    if (everyMs > 0) {
      const id = window.setInterval(() => fnRef.current(soundtrack.getPosition()), everyMs)
      return () => window.clearInterval(id)
    }
    let raf = 0
    const loop = () => {
      fnRef.current(soundtrack.getPosition())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active, everyMs])
}

export function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function spokenTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return m ? `${m} minute${m === 1 ? '' : 's'} ${s} second${s === 1 ? '' : 's'}` : `${s} second${s === 1 ? '' : 's'}`
}
