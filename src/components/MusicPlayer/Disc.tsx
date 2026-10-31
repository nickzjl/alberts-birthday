import { AnimatePresence, motion, type MotionValue } from 'motion/react'
import type { CSSProperties } from 'react'
import type { TrackId } from '../../audio/soundtrack'
import { BoltGlyph, DropGlyph, MoonGlyph, StarGlyph } from './icons'

const GLYPH: Record<TrackId, typeof BoltGlyph> = {
  e85: BoltGlyph,
  'purple-rain': DropGlyph,
  'billie-jean': StarGlyph,
  thriller: MoonGlyph,
}

/** Vinyl record: grooves + accent label with per-track glyph. Spins with the shared `rotate` value; the sheen stays put. */
export function Disc({ trackId, rotate, size, className = '' }: { trackId: TrackId; rotate: MotionValue<number>; size: number; className?: string }) {
  const Glyph = GLYPH[trackId]
  return (
    // size goes through a custom property so layouts can resize a disc from CSS (see .mp-disc--hero)
    <span className={`mp-disc ${className}`} style={{ '--disc': `${size}px` } as CSSProperties} aria-hidden="true">
      <motion.span className="mp-disc__spin" style={{ rotate }}>
        <span className="mp-disc__vinyl" />
        <span className="mp-disc__tick" />
        <AnimatePresence initial={false}>
          <motion.span
            key={trackId}
            className="mp-disc__label"
            initial={{ scale: 0.2, rotate: -140, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 20 }}
          >
            <Glyph className="mp-disc__glyph" />
          </motion.span>
        </AnimatePresence>
      </motion.span>
      <span className="mp-disc__sheen" />
    </span>
  )
}
