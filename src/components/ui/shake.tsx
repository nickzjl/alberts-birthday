import { animate, useReducedMotion } from 'motion/react'
import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode, type RefObject } from 'react'

export type ShakeStrength = 'tiny' | 'small' | 'medium' | 'big' | 'huge'

const AMP: Record<ShakeStrength, number> = { tiny: 3, small: 6, medium: 12, big: 22, huge: 36 }

export interface ShakeOptions {
  strength?: ShakeStrength | number
  /** seconds */
  duration?: number
  /** include rotation wobble */
  rotate?: boolean
}

type ShakeFn = (opts?: ShakeOptions) => void

const ShakeContext = createContext<{ shake: ShakeFn; targetRef: RefObject<HTMLDivElement | null> } | null>(null)

/** Wrap the stage; `useShake()` anywhere below shakes it. */
export function ShakeProvider({ children }: { children: ReactNode }) {
  const targetRef = useRef<HTMLDivElement | null>(null)
  const reduced = useReducedMotion()

  const shake = useCallback<ShakeFn>(
    ({ strength = 'medium', duration = 0.45, rotate = false } = {}) => {
      const el = targetRef.current
      if (!el) return
      const amp = (typeof strength === 'number' ? strength : AMP[strength]) * (reduced ? 0.2 : 1)
      const n = Math.max(4, Math.round(duration * 22))
      const xs: number[] = [0]
      const ys: number[] = [0]
      const rs: number[] = [0]
      for (let i = 1; i < n; i++) {
        const decay = 1 - i / n
        xs.push((Math.random() * 2 - 1) * amp * decay)
        ys.push((Math.random() * 2 - 1) * amp * 0.7 * decay)
        rs.push(rotate ? (Math.random() * 2 - 1) * amp * 0.08 * decay : 0)
      }
      xs.push(0)
      ys.push(0)
      rs.push(0)
      animate(el, { x: xs, y: ys, rotate: rs }, { duration, ease: 'linear' })
    },
    [reduced],
  )

  const value = useMemo(() => ({ shake, targetRef }), [shake])
  return <ShakeContext.Provider value={value}>{children}</ShakeContext.Provider>
}

/** Returns `shake({ strength, duration, rotate })`. */
export function useShake(): ShakeFn {
  const ctx = useContext(ShakeContext)
  return ctx?.shake ?? (() => {})
}

export function useShakeTarget() {
  return useContext(ShakeContext)?.targetRef
}
