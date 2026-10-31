import { motion } from 'motion/react'
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { sfx } from '../../audio/sfx'
import { Peter } from '../../characters/peter/Peter'
import { BigButton } from '../../components/ui/BigButton'
import { SpeechBubble } from '../../components/ui/SpeechBubble'
import { LINES } from './script'

interface FinaleProps {
  /** omitted when there's no video to replay */
  onReplay?: () => void
  onStartOver: () => void
}

const WORDS = [
  { text: 'HAPPY', cls: 'pt-fin__word' },
  { text: 'BIRTHDAY', cls: 'pt-fin__word' },
  { text: 'ALBERT', cls: 'pt-fin__word pt-fin__word--name' },
]

/** layouts where Peter stands in the bottom-right corner with his bubble above him (theater.css) */
const WIDE = '(min-width: 1240px) and (min-height: 640px), (orientation: landscape) and (max-height: 500px)'
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(WIDE)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}

/** "HAPPY BIRTHDAY ALBERT" — letters pop in one by one, then Peter pops back up. */
export function Finale({ onReplay, onStartOver }: FinaleProps) {
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => true)
  const [peterIn, setPeterIn] = useState(false)
  const [talking, setTalking] = useState(false)
  const total = WORDS.reduce((n, w) => n + w.text.length, 0)
  const rootRef = useRef<HTMLDivElement>(null)

  // the button that got us here just disappeared: give keyboard / screen-reader users the headline
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    // a rising "pop" per letter
    for (let i = 0; i < total; i++) sfx.play('pop', { pitch: 0.75 + i * 0.045, volume: 0.35, delay: 0.25 + i * 0.055 })
    const t = window.setTimeout(() => setPeterIn(true), 1700)
    return () => window.clearTimeout(t)
  }, [total])

  let n = 0
  return (
    <div ref={rootRef} className="pt-fin" tabIndex={-1}>
      <h2 className="pt-fin__title" aria-label="Happy birthday, Albert!">
        {WORDS.map((w, wi) => (
          <span key={wi} className={w.cls} aria-hidden="true">
            {w.text.split('').map((ch) => {
              const i = n++
              return (
                <motion.span
                  key={i}
                  className="pt-fin__letter"
                  style={{ '--i': i } as CSSProperties}
                  initial={{ y: 90, scale: 0.2, rotate: (i % 2 ? 1 : -1) * (14 + (i % 3) * 8), opacity: 0 }}
                  animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.25 + i * 0.055 }}
                >
                  {ch}
                </motion.span>
              )
            })}
          </span>
        ))}
      </h2>

      <motion.p className="pt-fin__note" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.7 }}>
        Love, all your friends <span className="pt-fin__amp">(and Peter)</span>
      </motion.p>

      <div className="pt-fin__peter-zone">
        <motion.div
          className="pt-fin__peter"
          initial={{ y: '110%', opacity: 0 }}
          animate={peterIn ? { y: '0%', opacity: 1 } : { y: '110%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          onAnimationStart={() => {
            if (peterIn) sfx.play('boing', { pitch: 1.1, volume: 0.6 })
          }}
        >
          <Peter pose="thumbsUp" expression={talking ? 'grin' : 'warm'} talking={talking} intensity={0.25} label="Peter Griffin giving a thumbs up" />
        </motion.div>
        <div className="pt-fin__bubble">
          <SpeechBubble
            visible={peterIn}
            text={LINES.finale}
            voice="peter"
            tail={wide ? 'bottom-right' : 'right'}
            speaker="Peter"
            onChar={() => setTalking(true)}
            onDone={() => setTalking(false)}
          />
        </div>
      </div>

      <motion.div className="pt-fin__actions" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2, type: 'spring', stiffness: 300, damping: 22 }}>
        {onReplay && (
          <BigButton variant="lavender" size="lg" onClick={onReplay} sound="pop" icon={<span aria-hidden="true">↺</span>}>
            Replay video
          </BigButton>
        )}
        <BigButton variant="acid" size="lg" onClick={onStartOver} sound="whoosh" wiggle icon={<span aria-hidden="true">★</span>}>
          Start over
        </BigButton>
      </motion.div>
    </div>
  )
}
