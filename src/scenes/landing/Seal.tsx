import { motion } from 'motion/react'
import { memo, useRef } from 'react'
import { play, prefersReduced, spawn } from './fx'

const INK = '#0e0620'

/** Rotating "certified brainrot specialist" stamp. Poke it for aura. */
export const Seal = memo(function Seal({ delay = 1.4 }: { delay?: number }) {
  const ring = useRef<HTMLSpanElement>(null)
  const fx = useRef<HTMLDivElement>(null)
  return (
    <motion.div
      className="seal"
      initial={{ scale: 2.6, opacity: 0, rotate: -60 }}
      animate={{ scale: 1, opacity: 1, rotate: -12 }}
      transition={{ type: 'spring', stiffness: 300, damping: 14, delay, opacity: { duration: 0.1, delay } }}
    >
      <motion.button
        type="button"
        className="seal__btn"
        aria-label="Certified brainrot specialist seal"
        whileHover={{ scale: 1.1, rotate: 8 }}
        whileTap={{ scale: 0.88 }}
        onClick={() => {
          play('coin')
          play('sparkle', { delay: 0.08 })
          if (!prefersReduced()) ring.current?.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-720deg)' }], { duration: 900, easing: 'cubic-bezier(.2,.8,.3,1)' })
          const el = fx.current
          if (el)
            spawn(el, {
              className: 'lfx-pop lfx-pop--sun',
              text: '+1000 AURA',
              fit: true,
              x: el.clientWidth / 2,
              y: 0,
              keyframes: [
                { transform: 'translate(-50%,-50%) scale(0.3) rotate(10deg)', opacity: 0 },
                { transform: 'translate(-50%,-120%) scale(1.1) rotate(6deg)', opacity: 1, offset: 0.25 },
                { transform: 'translate(-50%,-200%) scale(1) rotate(6deg)', opacity: 1, offset: 0.8 },
                { transform: 'translate(-50%,-240%) scale(0.9)', opacity: 0 },
              ],
              duration: 1300,
            })
        }}
      >
        {/* static face: painted once */}
        <svg className="seal__face" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="58" fill="#c8ff2e" stroke={INK} strokeWidth="4" />
          <circle cx="60" cy="60" r="33" fill={INK} />
          <text x="60" y="58" textAnchor="middle" className="stk-font" fontSize="17" fill="#c8ff2e">
            100%
          </text>
          <text x="60" y="74" textAnchor="middle" className="stk-font" fontSize="10.5" fill="#fff" letterSpacing="1.5">
            AURA
          </text>
        </svg>
        {/* the lettering ring is its own HTML-level layer: the idle spin (CSS) and the poke spin (WAAPI)
            both rotate a box the compositor can move, so the text-on-a-path is laid out & rastered once */}
        <span className="seal__ring" ref={ring} aria-hidden="true">
          <svg className="seal__spin" viewBox="0 0 120 120">
            <defs>
              <path id="seal-path" d="M60 60 m-43 0 a43 43 0 1 1 86 0 a43 43 0 1 1 -86 0" />
            </defs>
            {/* textLength = the ring's circumference (2π·43), so the phrase wraps exactly once */}
            <text className="stk-font" fontSize="10.8" fill={INK} letterSpacing="0.4">
              <textPath href="#seal-path" textLength="268" lengthAdjust="spacing">
                CERTIFIED ✦ BRAINROT ✦ SPECIALIST ✦
              </textPath>
            </text>
          </svg>
        </span>
      </motion.button>
      <div className="seal__fx" ref={fx} />
    </motion.div>
  )
})
