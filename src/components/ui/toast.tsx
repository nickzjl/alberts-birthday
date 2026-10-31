import { AnimatePresence, motion } from 'motion/react'
import { useSyncExternalStore } from 'react'
import { sfx } from '../../audio/sfx'

export interface Toast {
  id: number
  title: string
  body?: string
  icon?: string
}

interface Queued extends Toast {
  duration: number
  sound: boolean
}

/** a waiting toast hurries the current one along, but it always gets at least this long */
const MIN_SHOW_MS = 1500
/** pause between two toasts so the exit can clear before the next one drops in */
const GAP_MS = 280
/** never keep more than this many waiting (the oldest waiting one is dropped) */
const MAX_WAITING = 2

// One toast at a time: a stack of notifications would grow down over the scene title and HUD.
let shown: Toast[] = []
const waiting: Queued[] = []
let hideTimer = 0
let gapTimer = 0
let shownAt = 0
let shownFor = 0
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function showNext() {
  gapTimer = 0
  const t = waiting.shift()
  if (!t) return
  shown = [{ id: t.id, title: t.title, body: t.body, icon: t.icon }]
  emit()
  if (t.sound) sfx.play('coin')
  shownAt = performance.now()
  shownFor = waiting.length ? MIN_SHOW_MS : t.duration
  hideTimer = window.setTimeout(hide, shownFor)
}

function hide() {
  hideTimer = 0
  shown = []
  emit()
  if (waiting.length) gapTimer = window.setTimeout(showNext, GAP_MS)
}

/** Achievement-style toast: toast('BRAINROT ACHIEVEMENT', { body: 'Poked every sticker', icon: '🏆' }) */
export function toast(title: string, opts: { body?: string; icon?: string; duration?: number; sound?: boolean } = {}) {
  waiting.push({ id: ++seq, title, body: opts.body, icon: opts.icon, duration: opts.duration ?? 3400, sound: opts.sound !== false })
  if (waiting.length > MAX_WAITING) waiting.splice(0, waiting.length - MAX_WAITING)
  if (!shown.length) {
    if (!gapTimer) showNext()
    return
  }
  // someone's waiting: let the current toast leave once it has had its minimum time
  const left = shownAt + shownFor - performance.now()
  const soonest = Math.max(0, shownAt + MIN_SHOW_MS - performance.now())
  if (left > soonest) {
    window.clearTimeout(hideTimer)
    shownFor = MIN_SHOW_MS
    hideTimer = window.setTimeout(hide, soonest)
  }
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
const getShown = () => shown

/**
 * Drops achievement toasts into the top-bar row like a phone notification, one at a time
 * (later ones queue). Compact enough to stay inside that row on every screen size.
 */
export function Toaster() {
  const list = useSyncExternalStore(subscribe, getShown, getShown)
  return (
    <div className="toaster" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div
            key={t.id}
            className="toast"
            initial={{ y: -48, opacity: 0, scale: 0.8, rotate: -4 }}
            animate={{ y: 0, opacity: 1, scale: 1, rotate: -1.2 }}
            exit={{ y: -36, opacity: 0, scale: 0.9, transition: { duration: 0.2, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          >
            {t.icon && (
              <span className="toast__icon" aria-hidden="true">
                {t.icon}
              </span>
            )}
            <span className="toast__text">
              <strong>{t.title}</strong>
              {t.body && <span>{t.body}</span>}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
