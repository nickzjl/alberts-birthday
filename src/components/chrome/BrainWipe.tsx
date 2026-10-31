import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { SCENES, type SceneId } from '../../state/app'

const QUIPS = [
  'Installing skibidi drivers…',
  'Defragmenting rizz…',
  'Shotgunning a White Monster…',
  'Thawing frozen blueberries…',
  'Tuning the guitar (badly)…',
  'Downloading more RAM…',
  'Consulting the group chat…',
  'Calibrating aura points…',
  'Charging Ghost energy…',
  'Removing last two brain cells…',
]

const DRIPS = 'M0,0 H1200 V40 C1170,40 1165,110 1140,110 C1115,110 1112,45 1080,45 C1050,45 1046,150 1015,150 C985,150 984,50 950,50 C920,50 915,80 890,80 C865,80 862,48 830,48 C800,48 795,175 765,175 C735,175 733,52 700,52 C670,52 668,95 645,95 C622,95 618,46 590,46 C560,46 556,130 528,130 C500,130 498,48 470,48 C440,48 437,72 415,72 C393,72 390,44 360,44 C330,44 326,160 296,160 C266,160 264,50 236,50 C206,50 204,100 180,100 C156,100 152,46 124,46 C94,46 90,120 64,120 C38,120 34,42 0,42 Z'

/** Never hold the goo longer than this waiting for a chunk: the Suspense loader takes over. */
const MAX_HOLD_MS = 8000

export interface BrainWipeProps {
  to: SceneId | null
  /** Called when the screen is fully covered. May return a promise (e.g. chunk loading). */
  onCovered: () => Promise<unknown> | void
  /** The goo starts lifting off the new scene: entrances can start playing in view. */
  onReveal?: () => void
  onDone: () => void
}

/** Purple brain-goo that drips down over the screen between experiences. */
export function BrainWipe({ to, onCovered, onReveal, onDone }: BrainWipeProps) {
  return <AnimatePresence>{to && <WipeLayer key={to} to={to} onCovered={onCovered} onReveal={onReveal} onDone={onDone} />}</AnimatePresence>
}

function WipeLayer({ to, onCovered, onReveal, onDone }: { to: SceneId } & Omit<BrainWipeProps, 'to'>) {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const reduced = useReducedMotion()
  const [quip] = useState(() => QUIPS[Math.floor(Math.random() * QUIPS.length)])
  const [pct, setPct] = useState(0)
  const cbs = useRef({ onCovered, onReveal, onDone })
  useEffect(() => {
    cbs.current = { onCovered, onReveal, onDone }
  })
  // decided once per wipe, so flipping the OS setting mid-wipe can't strand it half-way
  const calm = useRef(!!reduced).current
  const meta = SCENES[to]

  useEffect(() => {
    let alive = true
    let ticker = 0
    const timers = new Set<number>()
    const sleep = (ms: number) => new Promise<void>((r) => timers.add(window.setTimeout(r, ms)))
    const run = async () => {
      const el = scope.current
      if (!el) return
      // reduced motion: a soft cross-fade instead of goo sliding across the screen
      if (calm) await animate(el, { opacity: [0, 1] }, { duration: 0.22, ease: 'easeOut' })
      else await animate(el, { y: ['-115%', '0%'] }, { duration: 0.55, ease: [0.65, 0, 0.35, 1] })
      if (!alive) return
      sfx.play('splat', { volume: 0.6 })
      const started = performance.now()
      ticker = window.setInterval(() => setPct((p) => Math.min(99, p + Math.ceil(Math.random() * 23))), 90)
      try {
        await Promise.all([
          // the scene swap happens here, fully hidden behind the goo
          Promise.race([Promise.resolve(cbs.current.onCovered()), sleep(MAX_HOLD_MS)]),
          sleep(calm ? 450 : 850),
        ])
      } catch {
        /* a failed chunk shows the scene error card once the goo lifts */
      }
      window.clearInterval(ticker)
      if (!alive) return
      setPct(100)
      await sleep(Math.max(120, (calm ? 650 : 1000) - (performance.now() - started)))
      if (!alive) return
      sfx.play('swoosh')
      cbs.current.onReveal?.()
      if (calm) await animate(el, { opacity: 0 }, { duration: 0.3, ease: 'easeIn' })
      else await animate(el, { y: '115%' }, { duration: 0.6, ease: [0.65, 0, 0.35, 1] })
      if (alive) cbs.current.onDone()
    }
    void run()
    return () => {
      alive = false
      // the hold may never finish if we unmount mid-wipe (HMR): stop the % ticker here too
      window.clearInterval(ticker)
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [animate, scope, calm])

  return (
    <motion.div className="wipe" ref={scope} style={calm ? { y: '0%', opacity: 0 } : { y: '-115%' }} exit={{ opacity: 0 }}>
      {/* one calm announcement for screen readers — the jittery % counter stays visual-only */}
      <p className="u-visually-hidden" role="status" aria-live="polite">
        Loading {meta.title}…
      </p>
      <svg className="wipe__drips wipe__drips--top" viewBox="0 0 1200 180" preserveAspectRatio="none" aria-hidden="true">
        <path d={DRIPS} />
      </svg>
      <div className="wipe__body" aria-hidden="true">
        <span className="wipe__chip">{meta.chapter ? `EXPERIENCE ${String(meta.chapter).padStart(2, '0')}` : 'BACK TO START'}</span>
        <h2 className="wipe__title">{meta.title}</h2>
        <p className="wipe__quip">{meta.loading}</p>
        <div className="wipe__bar">
          <motion.div className="wipe__fill" animate={{ scaleX: pct / 100 }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
        </div>
        <p className="wipe__pct">
          {quip} <strong>{pct}%</strong>
        </p>
      </div>
      <svg className="wipe__drips" viewBox="0 0 1200 180" preserveAspectRatio="none" aria-hidden="true">
        <path d={DRIPS} />
      </svg>
    </motion.div>
  )
}
