import { motion } from 'motion/react'
import type { CSSProperties } from 'react'
import { BigButton } from '../../components/ui/BigButton'
import type { PhaseNo } from './constants'
import { Key } from './Controls'
import type { HintKey } from './engine'
import { PixelHeart } from './Props'

const PHASE_NAME: Record<PhaseNo, string> = { 1: 'TUNG', 2: 'TUNG TUNG', 3: 'TUNG TUNG TUNG SAHUR!!!' }

export type Banner = { id: number; kind: 'phase'; phase: PhaseNo; round: number } | { id: number; kind: 'ko' }

/** Fighting-game title card that slams across the stage. */
export function PhaseBanner({ banner }: { banner: Banner }) {
  if (banner.kind === 'ko') {
    return (
      <motion.div className="tg-banner tg-banner--ko" initial={{ scale: 3, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }}>
        <span className="tg-banner__big">K.O.!</span>
        <span className="tg-banner__small">BOSS DEFEATED</span>
      </motion.div>
    )
  }
  const { phase, round } = banner
  return (
    <motion.div className={`tg-banner tg-banner--p${phase}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
      <motion.div className="tg-banner__strip" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ scaleX: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} />
      <motion.span className="tg-banner__small" initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.12, type: 'spring', stiffness: 400, damping: 24 }}>
        {round > 1 && phase === 1 ? `ROUND ${round} · ` : ''}PHASE {phase}/3
      </motion.span>
      <motion.span
        className="tg-banner__big"
        initial={{ scale: 2.4, opacity: 0, rotate: -6 }}
        animate={{ scale: 1, opacity: 1, rotate: -3 }}
        transition={{ delay: 0.18, type: 'spring', stiffness: 380, damping: 15 }}
      >
        {PHASE_NAME[phase]}
      </motion.span>
      <motion.span className="tg-banner__fight" initial={{ y: 30, opacity: 0, scale: 0.6 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.75, type: 'spring', stiffness: 500, damping: 14 }}>
        {phase === 1 ? 'FIGHT!' : phase === 2 ? 'HE’S GETTING FASTER' : 'MAXIMUM BRAINROT'}
      </motion.span>
    </motion.div>
  )
}

const HINTS: Record<HintKey, { mouse: string; touch: string }> = {
  slam: { mouse: 'RED ZONE = BAT INCOMING. MOVE!', touch: 'RED ZONE = BAT INCOMING. MOVE!' },
  bonk: { mouse: 'HE’S DIZZY → CLICK HIM (OR PRESS E) TO BONK!', touch: 'HE’S DIZZY → TAP HIM TO BONK!' },
  wave: { mouse: 'SLAMS MAKE SHOCKWAVES NOW → WAIT FOR "JUMP!"', touch: 'SLAMS MAKE SHOCKWAVES NOW → WAIT FOR "JUMP!"' },
  swing: { mouse: 'LOW SWING → WAIT FOR "JUMP!", THEN JUMP', touch: 'LOW SWING → WAIT FOR "JUMP!", THEN JUMP' },
  throw: { mouse: 'BAT BOOMERANG → JUMP IT TWICE!', touch: 'BAT BOOMERANG → JUMP IT TWICE!' },
  rain: { mouse: 'KENTONGAN RAIN! WATCH THE SHADOWS!', touch: 'KENTONGAN RAIN! WATCH THE SHADOWS!' },
  mercy: { mouse: 'HE WORE HIMSELF OUT BONKING YOU → BONK HIM BACK!', touch: 'HE WORE HIMSELF OUT BONKING YOU → TAP HIM!' },
}

export function HintBanner({ hint, touch, style }: { hint: HintKey; touch: boolean; style?: CSSProperties }) {
  return (
    <motion.div
      className={`tg-hint tg-hint--${hint}`}
      style={style}
      initial={{ y: 24, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 16, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
      role="status"
    >
      {touch ? HINTS[hint].touch : HINTS[hint].mouse}
    </motion.div>
  )
}

export function RespawnCard() {
  return (
    <motion.div className="tg-respawn" initial={{ scale: 0.5, opacity: 0, rotate: 6 }} animate={{ scale: 1, opacity: 1, rotate: -2 }} exit={{ scale: 1.2, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }} role="status">
      <span className="tg-respawn__big">YOU GOT BONKED INTO NEXT WEEK</span>
      <motion.span className="tg-respawn__but" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
        …but it’s your birthday, so
      </motion.span>
      <motion.span className="tg-respawn__heal" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: -4 }} transition={{ delay: 1.5, type: 'spring', stiffness: 500, damping: 12 }}>
        +5 ♥
        <span className="tg-respawn__hearts">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.7 + i * 0.08, type: 'spring', stiffness: 600, damping: 14 }}>
              <PixelHeart full />
            </motion.span>
          ))}
        </span>
      </motion.span>
    </motion.div>
  )
}

export function HowToCard({ touch, onStart }: { touch: boolean; onStart: () => void }) {
  return (
    <motion.div
      className="tg-card"
      initial={{ y: 60, opacity: 0, rotate: -3, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, rotate: -1, scale: 1 }}
      exit={{ y: 40, opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
    >
      <div className="tg-card__tape" aria-hidden="true">
        <span>⚠ BOSS APPROACHING ⚠ BOSS APPROACHING ⚠ BOSS APPROACHING ⚠</span>
      </div>
      <p className="tg-card__eyebrow">BOSS FIGHT</p>
      <h2 className="tg-card__title">Tung Tung Tung Sahur</h2>
      <p className="tg-card__kicker">wakes you up for sahur. violently.</p>
      <ul className="tg-howto">
        {touch ? (
          <>
            <li>
              <span className="tg-howto__keys">
                <Key>◀</Key>
                <Key>▶</Key>
              </span>
              <span>move (or tap the ground)</span>
            </li>
            <li>
              <span className="tg-howto__keys">
                <Key wide>jump</Key>
              </span>
              <span>jump over shockwaves &amp; bats</span>
            </li>
            <li>
              <span className="tg-howto__keys">
                <Key wide>tap tung</Key>
              </span>
              <span>bonk him while he’s dizzy</span>
            </li>
          </>
        ) : (
          <>
            <li>
              <span className="tg-howto__keys">
                <Key>←</Key>
                <Key>→</Key>
                <Key>A</Key>
                <Key>D</Key>
              </span>
              <span>move (or click the ground)</span>
            </li>
            <li>
              <span className="tg-howto__keys">
                <Key wide>space</Key>
                <Key>W</Key>
              </span>
              <span>jump over shockwaves &amp; bats</span>
            </li>
            <li>
              <span className="tg-howto__keys">
                <Key wide>click tung</Key>
                <Key>E</Key>
              </span>
              <span>bonk him while he’s dizzy</span>
            </li>
          </>
        )}
      </ul>
      <p className="tg-card__rules">
        Dodge = he tires himself out. Bonk = he sees stars. <strong>You can’t lose — it’s your birthday.</strong>
      </p>
      <BigButton variant="acid" size="xl" wiggle autoFocus sound="vineBoom" onClick={onStart} trailing={<span aria-hidden="true">→</span>}>
        Start the fight
      </BigButton>
    </motion.div>
  )
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Results bar — takes the HUD's slot once the fight is won. */
export function VictoryStats({ stats }: { stats: { dodges: number; bonks: number; hits: number; time: number; downs: number } }) {
  const items = [
    ['DODGES', stats.dodges],
    ['BONKS', stats.bonks],
    ['OUCHES', stats.hits],
    ['TIME', fmt(stats.time)],
  ] as const
  return (
    <motion.div
      className="tg-stats"
      role="status"
      initial={{ y: -18, opacity: 0, scale: 0.92 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
    >
      <span className="tg-stats__title">
        BOSS
        <br />
        DEFEATED
      </span>
      <span className="tg-stats__row">
        {items.map(([k, v], i) => (
          <motion.span
            key={k}
            className="tg-stats__item"
            initial={{ y: 10, opacity: 0, scale: 0.6 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 14, delay: 0.25 + i * 0.09 }}
          >
            <b>{v}</b>
            <small>{k}</small>
          </motion.span>
        ))}
      </span>
    </motion.div>
  )
}
