import { motion } from 'motion/react'
import { memo, useRef, type CSSProperties } from 'react'
import { play } from './fx'

const BOP: Keyframe[] = [
  { transform: 'translateY(0) scale(1, 1) rotate(0deg)' },
  { transform: 'translateY(4%) scale(1.25, 0.72) rotate(0deg)', offset: 0.18 },
  { transform: 'translateY(-34%) scale(0.86, 1.18) rotate(-8deg)', offset: 0.45 },
  { transform: 'translateY(3%) scale(1.12, 0.9) rotate(3deg)', offset: 0.72 },
  { transform: 'translateY(0) scale(1, 1) rotate(0deg)' },
]

function Letter({ ch, i, delay, pitch }: { ch: string; i: number; delay: number; pitch: number }) {
  const glyph = useRef<HTMLSpanElement>(null)
  const tilt = i % 2 ? 9 : -9
  // entrance is a CSS animation on the individual translate/scale/rotate properties,
  // so it composes with motion's hover transform instead of fighting it
  return (
    <motion.span
      className="ttl__l"
      style={{ '--d': `${delay}s`, '--tilt': `${tilt * 3}deg` } as CSSProperties}
      whileHover={{ y: '-14%', scale: 1.1, rotate: tilt }}
      transition={{ type: 'spring', stiffness: 520, damping: 11 }}
      onClick={() => {
        play('boing', { pitch, volume: 0.7 })
        glyph.current?.animate(BOP, { duration: 560, easing: 'ease-out' })
      }}
    >
      <span className="ttl__wave" style={{ '--i': i } as CSSProperties}>
        <span ref={glyph} className="ttl__glyph" data-c={ch}>
          {ch}
        </span>
      </span>
    </motion.span>
  )
}

function Word({ text, start, className, base }: { text: string; start: number; className: string; base: number }) {
  return (
    <span className={`ttl__word ${className}`}>
      {[...text].map((ch, k) => (
        <Letter key={k} ch={ch} i={start + k} delay={base + (start + k) * 0.045} pitch={0.8 + ((start + k) % 7) * 0.12} />
      ))}
    </span>
  )
}

/** "HAPPY BIRTHDAY ALBERT" — springy per-letter entrance, wavy idle float, tap to bop. */
export const Title = memo(function Title({ base = 0.15 }: { base?: number }) {
  return (
    <h1 className="ttl" aria-label="Happy Birthday Albert">
      <span className="ttl__row" aria-hidden="true">
        <Word text="HAPPY" start={0} className="ttl__happy" base={base} />
        <Word text="BIRTHDAY" start={5} className="ttl__birthday" base={base} />
      </span>
      <span className="ttl__row ttl__row--name" aria-hidden="true">
        <Word text="ALBERT" start={13} className="ttl__albert" base={base + 0.12} />
      </span>
    </h1>
  )
})
