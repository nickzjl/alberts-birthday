import { motion, type Transition } from 'motion/react'
import { forwardRef, useId } from 'react'

/**
 * idle      – breathing + the occasional "something's in here" hop (lid peeks, light leaks)
 * excited   – hops more often (when it's about to be opened / dancing along)
 * rumble    – violent shaking before the reveal
 * untied    – ribbon zips off, bow loops spring away, tag drops
 * launched  – lid rockets off, light rays burst out
 * unfolded  – front/side panels fall away
 * gone      – fades out entirely
 */
export type GiftPhase = 'idle' | 'excited' | 'rumble' | 'untied' | 'launched' | 'unfolded' | 'gone'

const ORDER: GiftPhase[] = ['idle', 'excited', 'rumble', 'untied', 'launched', 'unfolded', 'gone']
const past = (phase: GiftPhase, p: GiftPhase) => ORDER.indexOf(phase) >= ORDER.indexOf(p)

const INK = '#0e0620'
const RIBBON = '#ff3ea5'
const RIBBON_DARK = '#c92281'
const RIBBON_LIGHT = '#ff9bd0'

interface GiftBoxProps {
  phase: GiftPhase
  /** which side the "TO: ALBERT" tag hangs on (right when Peter overlaps the box on phones) */
  tagSide?: 'left' | 'right'
  className?: string
}

/** The giant present: layered SVG panels (so each can fly off on its own) on a square box. */
export const GiftBox = forwardRef<HTMLDivElement, GiftBoxProps>(function GiftBox({ phase, tagSide = 'left', className = '' }, ref) {
  const uid = 'gb' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const untied = past(phase, 'untied')
  const launched = past(phase, 'launched')
  const unfolded = past(phase, 'unfolded')
  const id = (s: string) => `${uid}-${s}`
  const paper = `url(#${id('paper')})`

  const fly: Transition = { duration: 0.75, ease: [0.2, 0.7, 0.3, 1] }

  return (
    <div ref={ref} className={`gift gift--${phase} gift--tag-${tagSide} ${className}`} data-untied={untied || undefined} aria-hidden="true">
      {/* shared paint */}
      <svg className="gift__defs" width="0" height="0" focusable="false">
        <defs>
          <pattern id={id('paper')} width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)">
            <rect width="13" height="13" fill="#7440e3" />
            <path d="M3.4 0.9 L4.1 3.1 L6.3 3.8 L4.1 4.5 L3.4 6.7 L2.7 4.5 L0.5 3.8 L2.7 3.1Z" fill="#efe6ff" />
            <circle cx="9.8" cy="9.6" r="1.25" fill="#ff8fcb" />
            <circle cx="10.2" cy="2.6" r="0.6" fill="#c9b3ff" />
            <circle cx="3.2" cy="10.6" r="0.6" fill="#c9b3ff" />
            <path d="M6.5 8.2 q1 -1 2 0" stroke="#b996ff" strokeWidth="0.55" fill="none" strokeLinecap="round" />
          </pattern>
          <linearGradient id={id('shade')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor={INK} stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id={id('sideShade')} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={INK} stopOpacity="0.32" />
            <stop offset="1" stopColor={INK} stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id={id('inner')} cx="0.5" cy="0.15" r="0.9">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.25" stopColor="#e9e0ff" />
            <stop offset="0.6" stopColor="#8b4dff" />
            <stop offset="1" stopColor="#1b0a3a" />
          </radialGradient>
          <linearGradient id={id('ribbon')} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={RIBBON_DARK} />
            <stop offset="0.25" stopColor={RIBBON} />
            <stop offset="0.75" stopColor={RIBBON} />
            <stop offset="1" stopColor={RIBBON_DARK} />
          </linearGradient>
        </defs>
      </svg>

      <div className="gift__shadow" />

      {/* light that pours out once the lid is gone */}
      <div className="gift__rays" />
      <div className="gift__bloom" />

      {/* inside of the box (seen once the lid/front are gone) */}
      <svg className="gift__piece gift__inside" viewBox="0 0 100 100">
        <polygon points="3,34 17,28 95,28 95,90 81,96 3,96" fill={`url(#${id('inner')})`} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
        <polyline points="17,28 17,90 95,90" fill="none" stroke="#c9b3ff" strokeOpacity="0.5" strokeWidth="0.6" />
        <line x1="17" y1="90" x2="3" y2="96" stroke="#c9b3ff" strokeOpacity="0.5" strokeWidth="0.6" />
      </svg>

      {/* right side face */}
      <motion.div
        className="gift__panel"
        style={{ originX: 0.81, originY: 0.96 }}
        animate={unfolded ? { rotate: 78, x: '4%', opacity: 0 } : { rotate: 0, x: 0, opacity: 1 }}
        transition={unfolded ? { duration: 0.55, ease: [0.5, 0, 0.75, 0], opacity: { delay: 0.3, duration: 0.25 } } : { duration: 0 }}
      >
        <svg className="gift__piece" viewBox="0 0 100 100">
          <polygon points="81,34 95,28 95,90 81,96" fill={paper} />
          <polygon points="81,34 95,28 95,90 81,96" fill={`url(#${id('sideShade')})`} />
          <polygon className="gift__band gift__band--h" points="81,58 95,52 95,63 81,69" fill={RIBBON_DARK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <polygon points="81,34 95,28 95,90 81,96" fill="none" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      </motion.div>

      {/* front face */}
      <motion.div
        className="gift__panel"
        style={{ originX: 0.5, originY: 0.96, transformPerspective: 520 }}
        animate={unfolded ? { rotateX: -86, opacity: [1, 1, 0] } : { rotateX: 0, opacity: 1 }}
        transition={unfolded ? { duration: 0.6, ease: [0.55, 0, 0.8, 0.2], opacity: { duration: 0.9, times: [0, 0.6, 1] } } : { duration: 0 }}
      >
        <svg className="gift__piece" viewBox="0 0 100 100">
          <rect x="3" y="34" width="78" height="62" rx="2" fill={paper} />
          <rect x="3" y="34" width="78" height="62" rx="2" fill={`url(#${id('shade')})`} />
          <rect x="70" y="34" width="11" height="62" fill={INK} opacity="0.13" />
          <g className="gift__band gift__band--h">
            <rect x="3" y="58" width="78" height="11" fill={RIBBON} stroke={INK} strokeWidth="1" />
            <rect x="3" y="62.4" width="78" height="2.2" fill={RIBBON_LIGHT} opacity="0.8" />
          </g>
          <g className="gift__band gift__band--v">
            <rect x="35.5" y="34" width="13" height="62" fill={`url(#${id('ribbon')})`} stroke={INK} strokeWidth="1" />
            <rect x="40.9" y="34" width="2.2" height="62" fill={RIBBON_LIGHT} opacity="0.8" />
          </g>
          {/* glossy shine */}
          <polygon points="7,38 17,38 7,55" fill="#fff" opacity="0.32" />
          <polygon points="20,38 23,38 7,62 7,57.5" fill="#fff" opacity="0.18" />
          <rect x="3" y="34" width="78" height="62" rx="2" fill="none" stroke={INK} strokeWidth="1.4" />
        </svg>
        <div className="gift__sheen" />
      </motion.div>

      {/* light leaking through the seam when the lid peeks */}
      <div className="gift__leak" />

      {/* lid (+ bow + tag ride along until they're untied) */}
      <motion.div
        className="gift__lid"
        style={{ originX: 0.49, originY: 0.25 }}
        animate={launched ? { y: '-290%', x: '30%', rotate: -460, scale: 0.85, opacity: [1, 1, 0] } : { y: 0, x: 0, rotate: 0, scale: 1, opacity: 1 }}
        transition={launched ? { duration: 1.1, ease: [0.12, 0.75, 0.35, 1], opacity: { duration: 1.1, times: [0, 0.75, 1] } } : { duration: 0 }}
      >
        <svg className="gift__piece" viewBox="0 0 100 100">
          {/* top face */}
          <polygon points="0,22 84,22 98,15 14,15" fill={paper} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          <polygon points="0,22 84,22 98,15 14,15" fill="#fff" opacity="0.16" />
          <polygon className="gift__band gift__band--v" points="35.5,22 48.5,22 62.5,15 49.5,15" fill={RIBBON} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          {/* side face */}
          <polygon points="84,22 98,15 98,29 84,36" fill={paper} />
          <polygon points="84,22 98,15 98,29 84,36" fill={`url(#${id('sideShade')})`} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          {/* front face */}
          <rect x="0" y="22" width="84" height="14" rx="1.5" fill={paper} />
          <rect x="0" y="22" width="84" height="14" rx="1.5" fill={INK} opacity="0.12" />
          <rect x="0" y="22" width="84" height="2" fill="#fff" opacity="0.22" />
          <g className="gift__band gift__band--v">
            <rect x="35.5" y="22" width="13" height="14" fill={`url(#${id('ribbon')})`} stroke={INK} strokeWidth="1" />
            <rect x="40.9" y="22" width="2.2" height="14" fill={RIBBON_LIGHT} opacity="0.8" />
          </g>
          <rect x="0" y="22" width="84" height="14" rx="1.5" fill="none" stroke={INK} strokeWidth="1.4" />
        </svg>

        {/* gift tag on a string, swinging */}
        <motion.div
          className="gift__tag-wrap"
          animate={untied ? { y: '120%', rotate: 38, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
          transition={untied ? { duration: 0.7, ease: [0.5, 0, 0.9, 0.5] } : { duration: 0 }}
        >
          <svg className="gift__piece" viewBox="0 0 100 100">
            {tagSide === 'left' ? (
              <path d="M47.5 19.5 C 42 26, 36 31, 31.5 40.5" fill="none" stroke="#e9e0ff" strokeWidth="0.8" strokeLinecap="round" />
            ) : (
              <path d="M50.5 19.5 C 55 26, 58 31, 61 40.5" fill="none" stroke="#e9e0ff" strokeWidth="0.8" strokeLinecap="round" />
            )}
          </svg>
          <div className="gift__tag">
            <svg viewBox="0 0 100 56" preserveAspectRatio="none" className="gift__tag-shape">
              <polygon points="3,3 80,3 97,28 80,53 3,53" fill="#fff8ec" stroke={INK} strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <circle cx="84" cy="28" r="4.5" fill="none" stroke={INK} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="gift__tag-text">
              <small>TO:</small> ALBERT
            </span>
            <span className="gift__tag-heart">♥</span>
          </div>
        </motion.div>

        {/* bow */}
        <motion.div
          className="gift__bow-part"
          style={{ originX: 0.49, originY: 0.18 }}
          animate={untied ? { x: '-34%', y: '-48%', rotate: -150, scale: 0.75, opacity: 0 } : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
          transition={untied ? fly : { duration: 0 }}
        >
          <svg className="gift__piece" viewBox="0 0 100 100">
            <BowLoop />
          </svg>
        </motion.div>
        <motion.div
          className="gift__bow-part"
          style={{ originX: 0.49, originY: 0.18 }}
          animate={untied ? { x: '36%', y: '-44%', rotate: 160, scale: 0.75, opacity: 0 } : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
          transition={untied ? { ...fly, delay: 0.06 } : { duration: 0 }}
        >
          <svg className="gift__piece" viewBox="0 0 100 100">
            <g transform="translate(98 0) scale(-1 1)">
              <BowLoop />
            </g>
          </svg>
        </motion.div>
        <motion.div
          className="gift__bow-part"
          style={{ originX: 0.49, originY: 0.2 }}
          animate={untied ? { y: '30%', rotate: 25, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
          transition={untied ? { duration: 0.55, ease: 'easeIn' } : { duration: 0 }}
        >
          <svg className="gift__piece" viewBox="0 0 100 100">
            {/* tails */}
            <path d="M47 19 C 44 23, 40.5 27.5, 37 31.5 L 40.2 31 L 41 34.4 C 44 29.5, 46.5 24.5, 49 20.5 Z" fill={RIBBON_DARK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
            <path d="M51 19 C 54 23.5, 57.2 28, 60.4 31.2 L 57.2 31.4 L 57.4 34.8 C 54.5 29.8, 52.2 24.8, 49.6 20.6 Z" fill={RIBBON} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
            {/* knot */}
            <rect x="44.6" y="12.8" width="8.8" height="8.4" rx="2.6" fill={RIBBON} stroke={INK} strokeWidth="1.1" />
            <path d="M46.2 14.6 q 2.8 -1.1 5.6 0" stroke={RIBBON_LIGHT} strokeWidth="0.9" fill="none" strokeLinecap="round" />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  )
})

function BowLoop() {
  return (
    <g>
      <path
        d="M47 19 C 40 22.5, 27 23.5, 21.5 16.5 C 17 10.5, 20.5 2, 28 2 C 36 2, 43 9, 47.5 14.5 Z"
        fill={RIBBON}
        stroke={INK}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M46.5 17.4 C 40 17.6, 32 15.2, 27 11 C 31.5 9.4, 38.5 11.5, 46.5 15.2 Z" fill={RIBBON_DARK} />
      <path d="M24.5 6.2 C 27.5 3.6, 33 3.8, 37.5 6.8" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </g>
  )
}
