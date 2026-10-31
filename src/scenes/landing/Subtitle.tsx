import { AnimatePresence, motion } from 'motion/react'
import { memo, useEffect, useState, type CSSProperties } from 'react'

// *word* = highlighted
const LINES = [
  'Powered by *White Monster*, frozen blueberries & pure delusion.',
  '+1 year older. +0 years wiser. Aura: *immeasurable*.',
  'Professional yapper. Part-time guitarist. *Full-time brainrot.*',
  'Undefeated boxing record vs. his own *punching bag*.',
  'Caffeine-to-blood ratio: *legally concerning*.',
  'Can play Happy Birthday on piano. *Will not stop.*',
  'Brain is 40% *Tung Tung Tung Sahur*, 60% Peter Griffin clips.',
  'Warning: may spontaneously start a *guitar solo* at 2 AM.',
]

// keep hyphenated words ("Full-time") from breaking at the hyphen
const glue = (text: string) =>
  text.split(/(\S+-\S+)/).map((t, i) =>
    i % 2 ? (
      <span key={i} className="sub__nb">
        {t}
      </span>
    ) : (
      t
    ),
  )

function render(line: string) {
  return line.split('*').map((part, i) =>
    i % 2 ? (
      <em key={i} className="sub__em">
        {glue(part)}
      </em>
    ) : (
      <span key={i}>{glue(part)}</span>
    ),
  )
}

/** first line lingers while the title lands; after that a new one every few seconds */
const FIRST_HOLD = 6200
const HOLD = 4600

/**
 * Rotating ridiculous one-liners under the title.
 * The entrance is a CSS animation (compositor-driven, wall-clock timed) so the first joke is
 * readable within ~1s even while the main thread is busy loading the scenes.
 * Lines cross-flip in the same grid cell, so there's never an empty gap between jokes.
 */
export const Subtitle = memo(function Subtitle({ delay = 0.5 }: { delay?: number }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    let every = 0
    const first = window.setTimeout(() => {
      setI((n) => (n + 1) % LINES.length)
      every = window.setInterval(() => setI((n) => (n + 1) % LINES.length), HOLD)
    }, FIRST_HOLD)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(every)
    }
  }, [])
  return (
    <p className="sub" style={{ '--sub-d': `${delay}s` } as CSSProperties} aria-live="off">
      <AnimatePresence initial={false}>
        <motion.span
          key={i}
          className="sub__line"
          initial={{ opacity: 0, y: '45%', rotateX: -75 }}
          // the outgoing line is fully transparent (0.16s) before the incoming one starts (0.18s),
          // so the two never show up half-flipped on top of each other
          animate={{ opacity: 1, y: '0%', rotateX: 0, transition: { duration: 0.42, delay: 0.18, ease: [0.22, 1, 0.36, 1] } }}
          exit={{
            opacity: 0,
            y: '-45%',
            rotateX: 75,
            transition: { duration: 0.22, ease: [0.55, 0, 0.8, 0.4], opacity: { duration: 0.16, ease: 'easeIn' } },
          }}
        >
          {render(LINES[i])}
        </motion.span>
      </AnimatePresence>
    </p>
  )
})
