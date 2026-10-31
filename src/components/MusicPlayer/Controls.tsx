import { motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import { sfx } from '../../audio/sfx'
import { soundtrack, type LoopMode, type SoundtrackState } from '../../audio/soundtrack'
import { fmtTime, spokenTime, usePlayhead } from './hooks'
import { LoopIcon, PauseIcon, PlayIcon, VolumeIcon } from './icons'
import { Slider } from './Slider'

const press = { whileTap: { scale: 0.86, y: 2 }, whileHover: { y: -2 }, transition: { type: 'spring' as const, stiffness: 600, damping: 22 } }

export function IconButton({ label, onClick, children, className = '', pressed, buttonRef }: { label: string; onClick: () => void; children: ReactNode; className?: string; pressed?: boolean; buttonRef?: Ref<HTMLButtonElement> }) {
  return (
    <motion.button ref={buttonRef} type="button" className={`mp-ibtn ${className}`} aria-label={label} title={label} aria-pressed={pressed} onClick={onClick} {...press}>
      {children}
    </motion.button>
  )
}

/** The chunky accent play/pause button (with idle / blocked pulse rings). */
export function PlayButton({ s, size = 'md' }: { s: SoundtrackState; size?: 'md' | 'lg' }) {
  const label = s.playing ? 'Pause music' : s.blocked ? 'Tap to play music' : 'Play music'
  const invite = !s.playing && (!s.started || s.blocked)
  return (
    <motion.button
      type="button"
      className={`mp-play mp-play--${size} ${invite ? 'is-inviting' : ''} ${s.blocked ? 'is-blocked' : ''} ${s.loading && s.playing ? 'is-loading' : ''}`}
      aria-label={label}
      title={label}
      onClick={() => {
        soundtrack.toggle()
        sfx.play('toggle', { pitch: s.playing ? 0.8 : 1.1, volume: 0.6 })
      }}
      whileHover={{ scale: 1.06, rotate: -4 }}
      whileTap={{ scale: 0.84, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 600, damping: 18 }}
    >
      <motion.span key={s.playing ? 'pause' : 'play'} className="mp-play__glyph" initial={{ scale: 0.3, rotate: -60 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 700, damping: 18 }}>
        {s.playing ? <PauseIcon /> : <PlayIcon />}
      </motion.span>
    </motion.button>
  )
}

/** Seek bar: rAF-driven fill + times, drag to scrub (commits on release), arrow keys ±5s. */
export function Progress({ s }: { s: SoundtrackState }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const elapsedRef = useRef<HTMLSpanElement>(null)
  const [scrub, setScrub] = useState<number | null>(null)
  const scrubRef = useRef<number | null>(null)
  const dur = s.duration
  const lastSec = useRef(-1)

  const paint = (pos: number) => {
    const el = rootRef.current
    if (!el) return
    const p = scrubRef.current ?? (dur > 0 ? pos / dur : 0)
    el.style.setProperty('--p', String(Math.max(0, Math.min(1, p))))
    const shown = scrubRef.current !== null ? scrubRef.current * dur : pos
    const sec = Math.floor(shown)
    if (sec !== lastSec.current) {
      lastSec.current = sec
      if (elapsedRef.current) elapsedRef.current.textContent = fmtTime(shown)
      el.setAttribute('aria-valuenow', String(sec))
      el.setAttribute('aria-valuetext', `${spokenTime(shown)} of ${spokenTime(dur)}`)
    }
  }
  usePlayhead(s.playing && dur > 0, paint)
  // keep the bar honest while paused (track switch, external seek, duration discovered)
  useEffect(() => {
    if (s.playing) return
    lastSec.current = -1
    paint(s.position)
  })

  const setScrubBoth = (v: number | null) => {
    scrubRef.current = v
    setScrub(v)
    paint(soundtrack.getPosition())
  }

  const disabled = dur <= 0
  return (
    <div className={`mp-progress ${scrub !== null ? 'is-scrubbing' : ''}`}>
      <Slider
        rootRef={rootRef}
        className="mp-slider--seek"
        label="Seek"
        valueNow={s.position}
        valueMax={dur}
        valueText={`${spokenTime(s.position)} of ${spokenTime(dur)}`}
        getRatio={() => (dur > 0 ? soundtrack.getPosition() / dur : 0)}
        step={dur > 0 ? 5 / dur : 0.05}
        bigStep={dur > 0 ? 15 / dur : 0.1}
        disabled={disabled}
        onScrub={(r) => setScrubBoth(r)}
        onCommit={(r) => {
          soundtrack.seek(r * dur)
          setScrubBoth(null)
          lastSec.current = -1
          paint(r * dur)
        }}
      />
      <div className="mp-progress__times">
        <span ref={elapsedRef}>{fmtTime(s.position)}</span>
        <span>{dur > 0 ? fmtTime(dur) : '–:––'}</span>
      </div>
    </div>
  )
}

export function VolumeRow({ s }: { s: SoundtrackState }) {
  const level = s.muted || s.volume === 0 ? 'mute' : s.volume < 0.5 ? 'low' : 'high'
  const pct = Math.round(s.volume * 100)
  return (
    <div className="mp-volume">
      <IconButton
        label={s.muted ? 'Unmute all sound' : 'Mute all sound'}
        pressed={s.muted}
        className={`mp-ibtn--mute ${s.muted ? 'is-on' : ''}`}
        onClick={() => {
          if (s.muted) {
            soundtrack.setMuted(false)
            if (s.volume === 0) soundtrack.setVolume(0.5)
            window.setTimeout(() => sfx.play('pop', { volume: 0.5 }), 60)
          } else soundtrack.setMuted(true)
        }}
      >
        <VolumeIcon level={level} />
      </IconButton>
      <Slider
        className={`mp-slider--vol ${s.muted ? 'is-muted' : ''}`}
        label="Music volume"
        valueNow={pct}
        valueMax={100}
        valueText={s.muted ? `${pct} percent, muted` : `${pct} percent`}
        ratio={s.volume}
        getRatio={() => soundtrack.getState().volume}
        step={0.05}
        bigStep={0.2}
        onScrub={(r) => soundtrack.setVolume(r)}
        onCommit={(r) => soundtrack.setVolume(r)}
      />
      <span className="mp-volume__num" aria-hidden="true">
        {s.muted ? 'MUTE' : pct}
      </span>
    </div>
  )
}

const LOOP_TEXT: Record<LoopMode, { short: string; long: string }> = {
  all: { short: 'All', long: 'Repeat all tracks' },
  one: { short: 'One', long: 'Repeat this track' },
  off: { short: 'Off', long: 'Repeat off — stops after the last track' },
}
const NEXT_LOOP: Record<LoopMode, LoopMode> = { all: 'one', one: 'off', off: 'all' }

export function LoopButton({ s }: { s: SoundtrackState }) {
  const t = LOOP_TEXT[s.loop]
  return (
    <motion.button
      type="button"
      className={`mp-chip mp-chip--loop is-${s.loop}`}
      aria-label={`${t.long}. Switch to: ${LOOP_TEXT[NEXT_LOOP[s.loop]].long}`}
      title={t.long}
      onClick={() => {
        soundtrack.cycleLoop()
        sfx.play('click', { pitch: 1.2, volume: 0.6 })
      }}
      {...press}
    >
      <motion.span key={s.loop} className="mp-chip__icon" initial={{ rotate: -180, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
        <LoopIcon mode={s.loop} />
      </motion.span>
      <span className="mp-chip__text">
        <span className="mp-chip__k">Loop</span>
        <span className="mp-chip__v">{t.short}</span>
      </span>
    </motion.button>
  )
}

export function SfxSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={`mp-switch ${on ? 'is-on' : ''}`} onClick={onToggle} title={on ? 'Sound effects on' : 'Sound effects off'}>
      <span className="mp-switch__label">SFX</span>
      <span className="mp-switch__track" aria-hidden="true">
        <motion.span className="mp-switch__knob" layout transition={{ type: 'spring', stiffness: 700, damping: 30 }} />
      </span>
      <span className="mp-switch__state" aria-hidden="true">
        {on ? 'On' : 'Off'}
      </span>
    </button>
  )
}
