import { AnimatePresence, motion } from 'motion/react'
import { Meter } from '../../components/ui/Meter'
import { BOSS_MAX_HP, HEARTS, type PhaseNo } from './constants'
import { PixelHeart } from './Props'

const PHASE_COLOR: Record<PhaseNo, string> = { 1: 'var(--tangerine)', 2: 'var(--hot)', 3: 'var(--danger)' }

/** Boss-fight HUD: Albert's hearts, Tung's pixel HP bar (thirds = phases), phase pips. */
export function Hud({ hp, hearts, phase }: { hp: number; hearts: number; phase: PhaseNo }) {
  const ko = hp <= 0
  return (
    <motion.div
      className="tg-hud"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -16, opacity: 0, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
    >
      <div className="tg-hud__player">
        <span className="tg-hud__name">ALBERT</span>
        <div className="tg-hearts" role="img" aria-label={`${hearts} of ${HEARTS} hearts`}>
          {Array.from({ length: HEARTS }, (_, i) => (
            <motion.span
              key={i}
              className="tg-heart"
              initial={false}
              animate={i < hearts ? { scale: 1, rotate: 0, opacity: 1, y: 0 } : { scale: 0.8, rotate: -14, opacity: 0.5, y: 2 }}
              transition={{ type: 'spring', stiffness: 600, damping: 12, delay: i < hearts ? i * 0.05 : 0 }}
            >
              <PixelHeart full={i < hearts} />
            </motion.span>
          ))}
        </div>
      </div>
      <div className="tg-hud__meter">
        <Meter pixel label="TUNG TUNG TUNG SAHUR" value={hp / BOSS_MAX_HP} color={PHASE_COLOR[phase]} readout={ko ? 'K.O.' : `HP ${hp}`} segments={3} />
      </div>
      <div className="tg-hud__pips" aria-label={`Phase ${phase} of 3`}>
        {!ko &&
          ([1, 2, 3] as const).map((p) => (
            <span key={p} className={`tg-pip ${p === phase ? 'is-on' : ''} ${p < phase ? 'is-done' : ''}`}>
              P{p}
            </span>
          ))}
        <AnimatePresence>
          {ko && (
            <motion.span className="tg-pip tg-pip--ko" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: -6 }} transition={{ type: 'spring', stiffness: 500, damping: 12 }}>
              KO!
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
