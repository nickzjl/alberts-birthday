import { AnimatePresence, motion, type MotionValue } from 'motion/react'
import { forwardRef } from 'react'
import { audio } from '../../audio/engine'
import { sfx } from '../../audio/sfx'
import { soundtrack, trackInfo, TRACKS, type SoundtrackState } from '../../audio/soundtrack'
import { PLACEHOLDER_NAMES } from '../../audio/placeholderTracks'
import { LoopButton, IconButton, PlayButton, Progress, SfxSwitch, VolumeRow } from './Controls'
import { Disc } from './Disc'
import { Equalizer } from './Equalizer'
import { CloseIcon, NextIcon, NoteIcon, PrevIcon } from './icons'
import { Marquee } from './Marquee'

/**
 * Placeholder copy: in dev the panel says how to add the real songs; the shipped site stays in-world
 * (Albert should never read setup instructions inside his birthday present).
 */
const DEV = import.meta.env.DEV && !(typeof location !== 'undefined' && /[?&]prodcopy\b/.test(location.search)) // ?prodcopy previews the shipped copy
const PH_BADGE = DEV ? 'Placeholder beat' : 'Bootleg remix'
const PH_CHIP = DEV ? 'beat' : 'remix'
const phTitle = (basename: string, id: string) =>
  DEV ? `Placeholder beat ("${PLACEHOLDER_NAMES[id]}") — drop ${basename}.mp3 into public/music` : `"${PLACEHOLDER_NAMES[id]}" — Albert's off-brand cover. The real song is shy today.`

function statusText(s: SoundtrackState): string {
  if (s.playing) return s.loading ? 'Loading…' : 'Now spinning'
  if (s.blocked) return 'Tap play ▸'
  if (s.ducked) return 'Shh… video'
  if (!s.started) return 'Ready to spin'
  return 'Paused'
}

interface PanelProps {
  id: string
  s: SoundtrackState
  sfxOn: boolean
  spin: MotionValue<number>
  /** the panel drops down from the top-right disc (phones) instead of springing up from the bottom-left */
  mobile: boolean
  onClose: () => void
}

/**
 * The expanded player: hero disc, seek, transport, volume, track list, loop + SFX.
 * Two column groups ("now playing" + "tracklist") stack on tall screens and sit side by side
 * on short ones (see `.mp-panel__body` in musicPlayer.css), so the panel never needs to scroll
 * or climb over the top bar on a laptop / landscape phone.
 */
export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel({ id, s, sfxOn, spin, mobile, onClose }, ref) {
  const t = trackInfo(s.trackId)
  const isPlaceholder = (s.sources[s.trackId] ?? (s.source === 'pending' ? undefined : s.source)) === 'placeholder'
  const live = s.playing && !s.loading

  return (
    <motion.div
      ref={ref}
      id={id}
      className="mp-panel"
      role="dialog"
      aria-label="Soundtrack player"
      tabIndex={-1}
      initial={{ opacity: 0, scale: 0.55, y: mobile ? -24 : 24, rotate: mobile ? 3 : -3 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.7, y: mobile ? -16 : 16, rotate: mobile ? 2 : -2, transition: { duration: 0.16 } }}
      transition={{ type: 'spring', stiffness: 460, damping: 30, mass: 0.9 }}
    >
      <div className="mp-panel__head">
        <span className="mp-panel__kicker">
          <NoteIcon />
          Soundtrack
        </span>
        <span className={`mp-panel__status ${live ? 'is-live' : ''} ${s.blocked && !s.playing ? 'is-blocked' : ''}`}>{statusText(s)}</span>
        <IconButton label="Close music player" className="mp-ibtn--close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>

      <div className="mp-panel__body">
        <div className="mp-panel__col mp-panel__col--now">
          <div className="mp-panel__hero">
            <motion.div
              className="mp-panel__disc-wrap"
              // the record "flies out" of the collapsed player
              initial={mobile ? { x: 120, y: -90, scale: 0.45, rotate: 120 } : { x: -40, y: 150, scale: 0.6, rotate: -120 }}
              animate={{ x: 0, y: 0, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 19, delay: 0.04 }}
            >
              <Disc trackId={s.trackId} rotate={spin} size={mobile ? 84 : 96} className="mp-disc--hero" />
            </motion.div>
            <div className="mp-panel__info">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={t.id}
                  className="mp-panel__names"
                  initial={{ y: 18, opacity: 0, rotate: -3 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                >
                  <Marquee text={t.title} className="mp-panel__title" />
                  <span className="mp-panel__artist">{t.artist}</span>
                </motion.div>
              </AnimatePresence>
              {isPlaceholder && (
                <span className="mp-badge" title={phTitle(t.basename, t.id)}>
                  <span className="mp-badge__dot" />
                  {PH_BADGE}
                </span>
              )}
            </div>
          </div>

          <Progress s={s} />

          <div className="mp-transport">
            <IconButton
              label="Previous track"
              className="mp-ibtn--lg"
              onClick={() => {
                soundtrack.prev()
                sfx.play('recordScratch', { volume: 0.35, pitch: 1.15 })
              }}
            >
              <PrevIcon />
            </IconButton>
            <PlayButton s={s} size="lg" />
            <IconButton
              label="Next track"
              className="mp-ibtn--lg"
              onClick={() => {
                soundtrack.next()
                sfx.play('recordScratch', { volume: 0.35 })
              }}
            >
              <NextIcon />
            </IconButton>
          </div>

          <VolumeRow s={s} />
        </div>

        <div className="mp-panel__col mp-panel__col--list">
          <div className="mp-tracks-head">
            <span>Tracklist</span>
            <span className="mp-tracks-head__rule" />
          </div>
          <ol className="mp-tracks">
            {TRACKS.map((tr, i) => {
              const current = tr.id === s.trackId
              const ph = s.sources[tr.id] === 'placeholder'
              return (
                <motion.li key={tr.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30, delay: 0.1 + i * 0.05 }}>
                  <motion.button
                    type="button"
                    className={`mp-track ${current ? 'is-current' : ''}`}
                    style={{ ['--t-accent' as string]: tr.accent, ['--t-on' as string]: tr.id === 'purple-rain' ? '#fff' : 'var(--ink)' }}
                    aria-current={current ? 'true' : undefined}
                    aria-label={`${tr.title} by ${tr.artist}${ph ? `, ${PH_BADGE.toLowerCase()}` : ''}${current ? (s.playing ? ', playing' : ', selected') : ''}`}
                    onClick={() => {
                      if (current) {
                        if (!s.playing) soundtrack.play()
                        return
                      }
                      soundtrack.select(tr.id)
                      sfx.play('recordScratch', { volume: 0.35, pitch: 0.9 + i * 0.12 })
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="mp-track__num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="mp-track__meta">
                      <span className="mp-track__title">{tr.title}</span>
                      <span className="mp-track__artist">{tr.artist}</span>
                    </span>
                    {ph && (
                      <span className="mp-track__beat" title={phTitle(tr.basename, tr.id)}>
                        {PH_CHIP}
                      </span>
                    )}
                    {current && <Equalizer active={live} bars={4} className="mp-eq--row" />}
                  </motion.button>
                </motion.li>
              )
            })}
          </ol>

          <div className="mp-panel__foot">
            <LoopButton s={s} />
            <SfxSwitch
              on={sfxOn}
              onToggle={() => {
                audio.setSfxEnabled(!sfxOn)
                if (!sfxOn) sfx.play('sparkle', { volume: 0.6 })
              }}
            />
          </div>

          {isPlaceholder &&
            (DEV ? (
              <p className="mp-panel__hint">
                Drop <code>{t.basename}.mp3</code> into <code>public/music</code> for the real song.
              </p>
            ) : (
              <p className="mp-panel__hint">
                <b>&ldquo;{PLACEHOLDER_NAMES[t.id]}&rdquo;</b>: Albert&rsquo;s off-brand cover.
                <span className="mp-panel__hint-more"> The real song is shy today.</span>
              </p>
            ))}
        </div>
      </div>
    </motion.div>
  )
})
