import { motion } from 'motion/react'
import { useState } from 'react'
import { sfx } from '../../audio/sfx'
import { SCENE_ORDER, SCENES, useApp } from '../../state/app'

const CHAPTERS = SCENE_ORDER.filter((s) => s !== 'landing')

/**
 * Slim top bar: wordmark (→ start) + chapter pills. Mobile keeps the right corner free for the music disc.
 *
 * During the brain-wipe the buttons are aria-disabled rather than `disabled`, so a keyboard user
 * who just pressed one keeps their focus (a disabled button would drop it to <body>).
 * In calm mode (birthday video) the bar fades almost away and comes back on hover / focus.
 *
 * The scene swaps while the goo covers the screen, so everything that *moves* waits for the goo
 * to lift: the bar's slide-in (when it mounts on the way out of the landing) and the acid glow
 * gliding over to the new chapter's pill.
 */
export function TopBar() {
  const { scene, completed, go, calm, transitioning, wiping } = useApp()
  // mounted under the goo → stay tucked away until it lifts
  const [held, setHeld] = useState(transitioning)
  if (held && !transitioning) setHeld(false)
  // the pill that *looks* active lags behind the real scene until the reveal (aria-current doesn't)
  const [shown, setShown] = useState(scene)
  if (!transitioning && shown !== scene) setShown(scene)
  const allDone = CHAPTERS.every((id) => completed.has(id))

  return (
    <motion.nav
      className={`topbar ${calm ? 'topbar--calm' : ''} ${allDone ? 'topbar--complete' : ''}`}
      aria-label="Experiences"
      initial={{ y: -70 }}
      animate={{ y: held ? -70 : 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26, delay: held ? 0 : 0.08 }}
    >
      <button
        type="button"
        className="topbar__brand"
        onClick={() => !wiping && go('landing')}
        aria-disabled={wiping || undefined}
        aria-label="Back to start"
        title="Back to start"
      >
        <span className="topbar__brain" aria-hidden="true">
          🧠
        </span>
        <span className="topbar__name" aria-hidden="true">
          <span className="topbar__name-long">Albert's Birthday Brainrot Simulator</span>
          <span className="topbar__name-short">Brainrot Sim</span>
        </span>
      </button>
      <ol className="topbar__chapters">
        {CHAPTERS.map((id) => {
          const meta = SCENES[id]
          const current = id === scene
          const lit = id === shown
          const done = completed.has(id)
          return (
            <li key={id}>
              <button
                type="button"
                className={`chap ${lit ? 'chap--active' : ''} ${done ? 'chap--done' : ''}`}
                aria-current={current ? 'step' : undefined}
                aria-disabled={wiping || undefined}
                aria-label={`Experience ${meta.chapter}: ${meta.title}${done ? ' (done)' : ''}`}
                title={meta.title}
                onClick={() => !current && !wiping && go(id)}
                onPointerEnter={(e) => e.pointerType === 'mouse' && !wiping && !lit && sfx.play('hover')}
              >
                <ChapNum done={done} chapter={meta.chapter} />
                <span className="chap__label" aria-hidden="true">
                  {meta.short}
                </span>
                {lit && <motion.span layoutId="chap-glow" className="chap__glow" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
              </button>
            </li>
          )
        })}
      </ol>
    </motion.nav>
  )
}

/** Chapter number that flips to a ✓ with a little pop the moment the chapter is completed (also while you're still in it). */
function ChapNum({ done, chapter }: { done: boolean; chapter: number }) {
  // already done when the bar mounted (reload, coming back): no pop
  const [doneAtMount] = useState(done)
  return (
    <span className="chap__num" aria-hidden="true">
      {done ? (
        <motion.span
          key="done"
          className="chap__check"
          initial={doneAtMount ? false : { scale: 0.2, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 14 }}
        >
          ✓
        </motion.span>
      ) : (
        chapter
      )}
    </span>
  )
}
