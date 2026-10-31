import { AnimatePresence, motion, type MotionValue } from 'motion/react'
import { useRef, type Ref } from 'react'
import { sfx } from '../../audio/sfx'
import { soundtrack, trackInfo, type SoundtrackState } from '../../audio/soundtrack'
import { IconButton, PlayButton } from './Controls'
import { Disc } from './Disc'
import { Equalizer } from './Equalizer'
import { usePlayhead } from './hooks'
import { CaretIcon, NextIcon } from './icons'
import { Marquee } from './Marquee'

interface Props {
  s: SoundtrackState
  spin: MotionValue<number>
  open: boolean
  panelId: string
  onToggleOpen: () => void
  triggerRef: Ref<HTMLButtonElement>
}

function tagFor(s: SoundtrackState): { text: string; tone: 'idle' | 'blocked' | 'live' | 'paused' } {
  if (s.blocked) return { text: 'Tap to play', tone: 'blocked' }
  if (!s.started) return { text: 'Soundtrack', tone: 'idle' }
  if (s.playing) return { text: s.loading ? 'Loading…' : 'Now spinning', tone: 'live' }
  // faded out for the birthday video: it'll come back on its own
  if (s.ducked) return { text: 'Shh… video', tone: 'paused' }
  return { text: 'Paused', tone: 'paused' }
}

/** Desktop collapsed player: sticker pill, bottom-left. */
export function Pill({ s, spin, open, panelId, onToggleOpen, triggerRef }: Props) {
  const t = trackInfo(s.trackId)
  const tag = tagFor(s)
  const ringRef = useRef<SVGCircleElement>(null)
  usePlayhead(s.playing && s.duration > 0, (pos) => {
    const p = s.duration > 0 ? Math.min(1, pos / s.duration) : 0
    const ring = ringRef.current
    if (!ring) return
    ring.style.strokeDashoffset = String(1 - p)
    ring.style.opacity = p > 0.003 ? '1' : '0'
  }, 250)

  return (
    <motion.div
      className={`mp-pill tone-${tag.tone}`}
      initial={{ y: 110, rotate: -6 }}
      animate={{ y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.35 }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={tag.text}
          className={`mp-pill__tag tone-${tag.tone}`}
          initial={{ y: 10, opacity: 0, rotate: 4 }}
          animate={{ y: 0, opacity: 1, rotate: -4 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 24 }}
          aria-hidden="true"
        >
          {tag.tone === 'live' && <Equalizer active={!s.loading} bars={4} className="mp-eq--tag" />}
          {tag.text}
        </motion.span>
      </AnimatePresence>

      <button
        ref={triggerRef}
        type="button"
        className="mp-pill__main"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={s.blocked && !s.playing ? `Play music: ${t.title} by ${t.artist}` : `${open ? 'Close' : 'Open'} music player. ${t.title} by ${t.artist}${s.playing ? ', playing' : ''}`}
        onClick={() => {
          // the tag says "Tap to play": a tap on the pill plays (inside this gesture) and shows the controls
          if (s.blocked && !s.playing) {
            void soundtrack.play()
            if (!open) onToggleOpen()
            sfx.play('pop', { volume: 0.55, pitch: 1.2 })
            return
          }
          onToggleOpen()
          sfx.play(open ? 'click' : 'pop', { volume: 0.55, pitch: open ? 0.9 : 1.2 })
        }}
      >
        <span className="mp-pill__disc">
          <Disc trackId={s.trackId} rotate={spin} size={60} />
        </span>
        <span className="mp-pill__meta">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={t.id}
              className="mp-pill__names"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 28 }}
            >
              <Marquee text={t.title} className="mp-pill__title" />
              <span className="mp-pill__artist">{t.artist}</span>
            </motion.span>
          </AnimatePresence>
        </span>
        <span className={`mp-pill__caret ${open ? 'is-open' : ''}`} aria-hidden="true">
          <CaretIcon />
        </span>
      </button>

      <div className="mp-pill__ctrls">
        <span className="mp-pill__playwrap">
          <svg className="mp-ring" viewBox="0 0 56 56" aria-hidden="true">
            <circle className="mp-ring__bg" cx="28" cy="28" r="25.5" />
            <circle ref={ringRef} className="mp-ring__fg" cx="28" cy="28" r="25.5" pathLength={1} />
          </svg>
          <PlayButton s={s} />
        </span>
        <IconButton
          label="Next track"
          className="mp-ibtn--next"
          onClick={() => {
            soundtrack.next()
            sfx.play('recordScratch', { volume: 0.35 })
          }}
        >
          <NextIcon />
        </IconButton>
      </div>
    </motion.div>
  )
}
