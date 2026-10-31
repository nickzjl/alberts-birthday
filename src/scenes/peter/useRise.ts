import { animate } from 'motion/react'
import { useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * The video screen rises out of the opened present (a FLIP from the box's interior). Plays once,
 * as soon as `ready` turns true; a plain fade without a source rect or with reduced motion.
 */
export function useRiseFrom(frameRef: RefObject<HTMLElement | null>, from: DOMRect | null | undefined, reduced: boolean, ready: boolean) {
  const rose = useRef(false)
  useLayoutEffect(() => {
    const el = frameRef.current
    if (!el || rose.current || !ready) return
    rose.current = true
    if (!from || reduced) {
      animate(el, { opacity: [0, 1], scale: [0.96, 1] }, { duration: 0.6 })
      return
    }
    const r = el.getBoundingClientRect()
    const dx = from.left + from.width / 2 - (r.left + r.width / 2)
    const dy = from.top + from.height / 2 - (r.top + r.height / 2)
    const s = Math.max(0.08, Math.min(1, (from.width * 0.7) / r.width))
    const lift = Math.min(160, from.height * 0.7)
    animate(
      el,
      { x: [dx, dx, 0], y: [dy + lift * 0.3, dy - lift, 0], scale: [s * 0.5, s, 1], opacity: [0, 1, 1] },
      { duration: 1.5, times: [0, 0.38, 1], ease: [[0.2, 0.9, 0.3, 1], [0.6, 0, 0.2, 1]] },
    )
  }, [frameRef, from, reduced, ready])
}
