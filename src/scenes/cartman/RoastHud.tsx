import { AnimatePresence, motion } from 'motion/react'
import { Meter } from '../../components/ui/Meter'

export type AngerState = 'normal' | 'overload' | 'broken'

export interface RoastHudProps {
  apology: number
  apologyReadout: string
  anger: number
  angerReadout?: string
  angerState: AngerState
  /** short labels for narrow screens */
  compact: boolean
}

const ANGER_FILL = 'linear-gradient(90deg, var(--sun) 0%, var(--tangerine) 45%, var(--danger) 100%)'

const SHARDS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + (i % 3) * 0.4
  const v = 70 + ((i * 37) % 90)
  return {
    left: `${6 + ((i * 53) % 88)}%`,
    dx: Math.cos(a) * v,
    dy: Math.sin(a) * v * 0.6 - 40,
    rot: ((i * 97) % 360) - 180,
    w: 10 + ((i * 13) % 16),
    h: 7 + ((i * 7) % 10),
    color: i % 3 === 0 ? 'var(--sun)' : i % 3 === 1 ? 'var(--danger)' : 'var(--tangerine)',
  }
})

/** tiny white flag — the universal sign for "sorry" he will never wave */
function FlagIcon() {
  return (
    <svg className="cms-panel__icon" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M8,3 V30" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M9,5 C14,2 18,8 25,5 V17 C18,20 14,14 9,17 Z" fill="var(--white)" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

function AngryIcon({ broken }: { broken: boolean }) {
  return (
    <svg className="cms-panel__icon" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="17" r="13" fill={broken ? 'var(--sun)' : 'var(--danger)'} stroke="var(--ink)" strokeWidth="2.5" />
      {broken ? (
        <path d="M9,12 l4,4 m0,-4 l-4,4 M19,12 l4,4 m0,-4 l-4,4 M11,24 q5,-4 10,0" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M8,11 L14,14 M24,11 L18,14 M11,23 Q16,19 21,23" stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      )}
    </svg>
  )
}

export function RoastHud({ apology, apologyReadout, anger, angerReadout, angerState, compact }: RoastHudProps) {
  return (
    <div className="cms-hud">
      <div className="cms-panel cms-panel--apology">
        <FlagIcon />
        <Meter label={compact ? 'Apology' : 'Apology meter'} value={apology} readout={apologyReadout} color="var(--cyan)" segments={10} />
      </div>

      <motion.div
        className={`cms-panel cms-panel--anger cms-panel--${angerState}`}
        animate={angerState === 'overload' ? { scale: [1, 1.08, 1.04, 1.1], rotate: [0, -2, 2, -1] } : { scale: 1, rotate: 0 }}
        transition={angerState === 'overload' ? { duration: 0.6 } : { type: 'spring', stiffness: 400, damping: 18 }}
      >
        <AngryIcon broken={angerState === 'broken'} />
        {angerState === 'broken' ? (
          <div className="meter cms-broken">
            <div className="meter__top">
              <span className="meter__label">{compact ? 'Anger' : 'Anger meter'}</span>
              <span className="meter__readout cms-broken__readout">BROKEN</span>
            </div>
            <svg className="cms-broken__track" viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true">
              <path d="M2,4 L60,4 L66,12 L58,20 L2,20 Z" fill="var(--danger)" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M84,4 L120,4 L114,13 L124,20 L80,20 L88,12 Z" fill="var(--tangerine)" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M146,4 L198,4 L198,20 L150,20 L156,11 Z" fill="rgba(14,6,32,0.75)" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
          </div>
        ) : (
          <Meter
            label={compact ? 'Anger' : 'Anger meter'}
            value={anger}
            readout={angerReadout}
            color={ANGER_FILL}
            dangerAt={0.75}
            className={angerState === 'overload' ? 'cms-meter-overload' : ''}
          />
        )}
        <AnimatePresence>
          {angerState === 'broken' && (
            <motion.div key="shards" className="cms-shards" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {SHARDS.map((s, i) => (
                <motion.span
                  key={i}
                  className="cms-shard"
                  style={{ left: s.left, width: s.w, height: s.h, background: s.color }}
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                  animate={{ x: s.dx * 1.6, y: [0, s.dy, s.dy + 260], rotate: s.rot * 2, opacity: [1, 1, 0] }}
                  transition={{ duration: 1.25, ease: [0.2, 0.7, 0.4, 1], times: [0, 0.35, 1] }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
