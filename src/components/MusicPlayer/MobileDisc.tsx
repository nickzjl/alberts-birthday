import { AnimatePresence, motion, type MotionValue } from 'motion/react'
import { useEffect, useState, type Ref } from 'react'
import { sfx } from '../../audio/sfx'
import { soundtrack, trackInfo, type SoundtrackState } from '../../audio/soundtrack'
import { Disc } from './Disc'
import { Equalizer } from './Equalizer'
import { PlayIcon } from './icons'

interface Props {
  s: SoundtrackState
  spin: MotionValue<number>
  open: boolean
  panelId: string
  onToggleOpen: (force?: boolean) => void
  triggerRef: Ref<HTMLButtonElement>
}

/** Mobile collapsed player: a spinning record button tucked into the top-right corner. */
export function MobileDisc({ s, spin, open, panelId, onToggleOpen, triggerRef }: Props) {
  const t = trackInfo(s.trackId)
  const invite = !s.playing && (!s.started || s.blocked)
  // the "tap to play" bubble shows for a few seconds; the hot pulse ring keeps nagging after that
  const [hint, setHint] = useState(false)
  useEffect(() => {
    if (!s.blocked) return
    setHint(true)
    const id = window.setTimeout(() => setHint(false), 6000)
    return () => {
      window.clearTimeout(id)
      setHint(false)
    }
  }, [s.blocked])
  return (
    <>
      <motion.button
        ref={triggerRef}
        type="button"
        className={`mp-mdisc ${invite ? 'is-inviting' : ''} ${s.blocked ? 'is-blocked' : ''} ${s.playing ? 'is-playing' : ''}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={invite ? `Play music: ${t.title} by ${t.artist}` : `${open ? 'Close' : 'Open'} music player. ${t.title} by ${t.artist}${s.playing ? ', playing' : ''}`}
        initial={{ scale: 0, rotate: -120 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.3 }}
        whileTap={{ scale: 0.86 }}
        onClick={() => {
          if (invite) {
            // first tap: start the music AND show the controls
            void soundtrack.play()
            onToggleOpen(true)
            sfx.play('pop', { volume: 0.55, pitch: 1.2 })
            return
          }
          onToggleOpen()
          sfx.play(open ? 'click' : 'pop', { volume: 0.55, pitch: open ? 0.9 : 1.2 })
        }}
      >
        <Disc trackId={s.trackId} rotate={spin} size={44} />
        <span className="mp-mdisc__badge" aria-hidden="true">
          {s.playing ? <Equalizer active={!s.loading} bars={3} className="mp-eq--badge" /> : <PlayIcon />}
        </span>
      </motion.button>
      <AnimatePresence>
        {hint && s.blocked && !open && (
          <motion.span
            className="mp-mdisc__hint"
            aria-hidden="true"
            initial={{ opacity: 0, y: -6, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
          >
            tap to play ♪
          </motion.span>
        )}
      </AnimatePresence>
    </>
  )
}
