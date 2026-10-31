import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState, type CSSProperties } from 'react'

export interface ComicBurstProps {
  /** e.g. "POW!", "BONK!" — changing `id` re-fires the burst */
  text: string
  id: number | string
  color?: string
  textColor?: string
  /** px */
  size?: number
  /** ms visible */
  duration?: number
  style?: CSSProperties
  className?: string
  rotate?: number
}

const STAR = (() => {
  const pts: string[] = []
  const n = 14
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? 34 + ((i * 7) % 5) : 50
    const a = (i / (n * 2)) * Math.PI * 2
    pts.push(`${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`)
  }
  return pts.join(' ')
})()

/** Comic-book starburst with text that slams in and pops out. Position it via style. */
export function ComicBurst({ text, id, color = 'var(--sun)', textColor = 'var(--ink)', size = 180, duration = 900, style, className = '', rotate = -8 }: ComicBurstProps) {
  const reduced = useReducedMotion()
  const [live, setLive] = useState<string | number | null>(id)
  useEffect(() => {
    setLive(id)
    const t = window.setTimeout(() => setLive(null), duration)
    return () => window.clearTimeout(t)
  }, [id, duration])

  return (
    <AnimatePresence>
      {live !== null && live === id && (
        <motion.div
          key={String(id)}
          className={`burst ${className}`}
          style={{ width: size, height: size, ...style }}
          initial={{ scale: 0, rotate: rotate - 30, opacity: 0 }}
          animate={{ scale: [0, 1.25, 1], rotate, opacity: 1 }}
          exit={reduced ? { opacity: 0, transition: { duration: 0.18 } } : { scale: 1.2, opacity: 0, transition: { duration: 0.18 } }}
          transition={{ duration: 0.32, ease: 'backOut' }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <polygon points={STAR} fill="var(--ink)" transform="translate(2.5 3.5)" />
            <polygon points={STAR} fill={color} stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
          <span className="burst__text" style={{ color: textColor, fontSize: size * 0.2 }}>
            {text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
