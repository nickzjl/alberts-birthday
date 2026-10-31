import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from 'react'
import { sfx } from '../../audio/sfx'
import { BigButton } from '../../components/ui/BigButton'
import { useRiseFrom } from './useRise'

export const VIDEO_SRC = `${import.meta.env.BASE_URL}video/birthday.mp4`
export const POSTER_SRC = `${import.meta.env.BASE_URL}video/birthday-poster.jpg`

type Status = 'probing' | 'ready' | 'starting' | 'playing' | 'paused' | 'buffering' | 'ended' | 'missing' | 'error'

export interface VideoPlayerHandle {
  /** Restart from the top. Call inside a click handler so playback counts as a user gesture. */
  replay: () => void
  pause: () => void
}

interface VideoPlayerProps {
  /** where the screen rises from (the open present), in viewport px */
  from?: DOMRect | null
  onEnded: () => void
  /** placeholder / error "continue" */
  onContinue: () => void
  /** hide (finale) without unmounting the element (keeps replay a direct user gesture) */
  hidden?: boolean
  /** false once we know there's no video file at all (the finale then drops "Replay video") */
  onAvailable?: (available: boolean) => void
}

/**
 * HEAD-probes a file. true = exists, false = definitely missing (404, or the dev server's
 * SPA fallback answering with HTML), null = can't tell (offline, HEAD not allowed…).
 */
async function probe(url: string, kind: 'video' | 'image'): Promise<boolean | null> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' })
    if (res.status === 405 || res.status === 501) return null
    if (!res.ok) return false
    const type = (res.headers.get('content-type') ?? '').toLowerCase()
    if (type.includes('text/html')) return false
    if (kind === 'image' && type && !type.startsWith('image/')) return false
    return true
  } catch {
    return null
  }
}

/**
 * The birthday video: rises out of the present, waits for a big PLAY tap (a real user gesture,
 * so sound works everywhere), then hands over to native controls. Missing file → friendly
 * placeholder card; decode/network failure → error card. Both offer a way to the finale.
 */
export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer({ from, onEnded, onContinue, hidden, onAvailable }, ref) {
  const reduced = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('probing')
  const [exists, setExists] = useState<boolean | null>(null)
  const [poster, setPoster] = useState<string | undefined>()
  const [meta, setMeta] = useState(false)
  const [started, setStarted] = useState(false)
  /** the quiet "skip" link only shows up after a few seconds of each playthrough */
  const [skipReady, setSkipReady] = useState(false)
  const skipTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(skipTimer.current), [])
  const [aspect, setAspect] = useState(16 / 9)
  const statusRef = useRef(status)
  statusRef.current = status
  const cbs = useRef({ onEnded, onAvailable })
  useEffect(() => {
    cbs.current = { onEnded, onAvailable }
  })
  useEffect(() => {
    if (status !== 'probing') cbs.current.onAvailable?.(status !== 'missing')
  }, [status])

  // probe the files once
  useEffect(() => {
    let alive = true
    void probe(VIDEO_SRC, 'video').then((ok) => {
      if (!alive) return
      setExists(ok)
      setStatus(ok === false ? 'missing' : 'ready')
    })
    void probe(POSTER_SRC, 'image').then((ok) => {
      if (alive && ok) setPoster(POSTER_SRC)
    })
    return () => {
      alive = false
    }
  }, [])

  // couldn't probe and metadata never arrives → treat as missing
  useEffect(() => {
    if (exists !== null || status !== 'ready' || meta) return
    const id = window.setTimeout(() => {
      if (statusRef.current === 'ready') setStatus('missing')
    }, 15000)
    return () => window.clearTimeout(id)
  }, [exists, status, meta])

  // rise out of the box (FLIP from the present's interior)
  useRiseFrom(frameRef, from, !!reduced, status !== 'probing')

  const play = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setStarted(true)
    setStatus('starting')
    setSkipReady(false)
    window.clearTimeout(skipTimer.current)
    skipTimer.current = window.setTimeout(() => setSkipReady(true), 4000)
    v.play().catch((e: DOMException) => {
      if (e?.name === 'AbortError') return
      if (e?.name === 'NotAllowedError') {
        setStarted(false)
        setStatus('ready')
        return
      }
      setStatus('error')
    })
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      replay: () => {
        const v = videoRef.current
        const s = statusRef.current
        if (!v || s === 'missing' || s === 'error' || s === 'probing') return
        try {
          v.currentTime = 0
        } catch {
          /* ignore */
        }
        play()
      },
      pause: () => videoRef.current?.pause(),
    }),
    [play],
  )

  // pause if hidden (finale) — e.g. "skip to finale"
  useEffect(() => {
    if (hidden) videoRef.current?.pause()
  }, [hidden])

  const retry = () => {
    const v = videoRef.current
    setStarted(false)
    setMeta(false)
    setStatus('ready')
    v?.load()
  }

  const showVideo = status !== 'missing' && status !== 'probing'
  const card = status === 'missing' || status === 'error'
  const spinning = status === 'starting' || status === 'buffering' || (status === 'ready' && !meta)

  return (
    <div className={`pt-player ${hidden ? 'is-hidden' : ''}`} style={{ '--ar': aspect } as CSSProperties}>
      <div ref={frameRef} className={`pt-frame ${card ? 'pt-frame--card' : ''}`} style={{ opacity: status === 'probing' ? 0 : undefined }}>
        <div className="pt-frame__halo" aria-hidden="true" />
        <div className="pt-frame__screen">
          {showVideo && (
            <video
              ref={videoRef}
              className="pt-video"
              src={VIDEO_SRC}
              poster={poster}
              preload="metadata"
              playsInline
              controls={started}
              aria-label="Birthday video from Albert's friends"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget
                setMeta(true)
                if (v.videoWidth && v.videoHeight) setAspect(Math.min(2.4, Math.max(0.5, v.videoWidth / v.videoHeight)))
              }}
              onError={() => {
                const s = statusRef.current
                if (s === 'missing') return
                // the file never existed (couldn't probe) vs. exists but won't play
                setStatus(exists === true || meta ? 'error' : 'missing')
              }}
              onWaiting={() => {
                if (statusRef.current === 'playing' || statusRef.current === 'starting') setStatus('buffering')
              }}
              onPlaying={() => setStatus('playing')}
              onPause={(e) => {
                if (!e.currentTarget.ended && statusRef.current !== 'error') setStatus(started ? 'paused' : 'ready')
              }}
              onEnded={() => {
                setStatus('ended')
                cbs.current.onEnded()
              }}
            />
          )}

          {/* shimmer while it loads */}
          {status === 'ready' && !meta && <div className="pt-frame__shimmer" aria-hidden="true" />}

          <AnimatePresence>
            {status === 'ready' && !started && (
              <motion.div
                key="play"
                className="pt-play"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
                transition={{ delay: 1.2, duration: 0.6 }}
              >
                <BigButton
                  variant="lavender"
                  size="xl"
                  sound={false}
                  className="pt-play__btn"
                  autoFocus
                  onClick={() => {
                    sfx.play('pop', { volume: 0.5 })
                    play()
                  }}
                  icon={<span aria-hidden="true">▶</span>}
                >
                  Play
                </BigButton>
              </motion.div>
            )}
          </AnimatePresence>

          {spinning && started && (
            <div className="pt-spinner" role="status">
              <span className="pt-spinner__ring" aria-hidden="true" />
              <span className="u-visually-hidden">Loading video…</span>
            </div>
          )}

          {card && <MissingCard error={status === 'error'} onRetry={retry} onContinue={onContinue} />}
        </div>
      </div>

      <div className="pt-player__below">
        <AnimatePresence>
          {started && skipReady && !card && !hidden && (
            <motion.button
              key="skip"
              type="button"
              className="pt-skip"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              onClick={() => {
                videoRef.current?.pause()
                onContinue()
              }}
            >
              skip to the finale →
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})

function MissingCard({ error, onRetry, onContinue }: { error: boolean; onRetry: () => void; onContinue: () => void }) {
  return (
    <motion.div className="pt-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}>
      <TvDoodle error={error} />
      <div className="pt-card__text">
        {error ? (
          <>
            <h2 className="pt-card__title">The video hiccuped</h2>
            <p className="pt-card__body">It couldn&apos;t play in this browser. Give it another go — or skip ahead, the party&apos;s waiting.</p>
            {import.meta.env.DEV && (
              <p className="pt-card__dev">
                Dev tip: export it as an <code>H.264 / AAC .mp4</code> (iPhone HEVC clips won&apos;t play in Chrome or Firefox).
              </p>
            )}
          </>
        ) : import.meta.env.DEV ? (
          <>
            <h2 className="pt-card__title">The birthday video goes here</h2>
            <p className="pt-card__body">
              Add <code>public/video/birthday.mp4</code> and refresh — your friends&apos; message will play right here.
            </p>
          </>
        ) : (
          <>
            <h2 className="pt-card__title">Your friends&apos; video is on its way</h2>
            <p className="pt-card__body">It&apos;ll play right here as soon as it lands. Meanwhile, the party&apos;s waiting.</p>
          </>
        )}
        <div className="pt-card__actions">
          {error && (
            <BigButton variant="ghost" size="md" onClick={onRetry} icon={<span aria-hidden="true">↻</span>}>
              Try again
            </BigButton>
          )}
          <BigButton variant="lavender" size="md" onClick={onContinue} sound="whoosh" autoFocus trailing={<span aria-hidden="true">→</span>}>
            Continue to the finale
          </BigButton>
        </div>
      </div>
    </motion.div>
  )
}

/** A sleepy little retro TV wearing a bow — the placeholder illustration. */
export function TvDoodle({ error }: { error: boolean }) {
  return (
    <svg className="pt-card__art" viewBox="0 0 160 150" aria-hidden="true">
      <path d="M58 22 L80 40 L102 18" stroke="#c9b3ff" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="58" cy="22" r="5" fill="#c9b3ff" stroke="#0e0620" strokeWidth="3" />
      <circle cx="102" cy="18" r="5" fill="#c9b3ff" stroke="#0e0620" strokeWidth="3" />
      <rect x="14" y="38" width="132" height="94" rx="20" fill="#6d36d6" stroke="#0e0620" strokeWidth="5" />
      <rect x="26" y="50" width="88" height="70" rx="12" fill="#1b0a3a" stroke="#0e0620" strokeWidth="4" />
      <path d="M32 58 h 76" stroke="#8b4dff" strokeWidth="3" opacity="0.4" />
      <path d="M32 68 h 76 M32 78 h 76 M32 88 h 76 M32 98 h 76 M32 108 h 76" stroke="#8b4dff" strokeWidth="2" opacity="0.18" />
      {error ? (
        <g stroke="#e9e0ff" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M50 78 l8 6 m0 -6 l-8 6 M82 78 l8 6 m0 -6 l-8 6" />
          <path d="M56 104 q14 -8 28 0" />
        </g>
      ) : (
        <g>
          <path d="M50 82 q5 -5 10 0 M80 82 q5 -5 10 0" stroke="#e9e0ff" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M62 98 q8 7 16 0" stroke="#e9e0ff" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="48" cy="94" r="5" fill="#ff3ea5" opacity="0.6" />
          <circle cx="92" cy="94" r="5" fill="#ff3ea5" opacity="0.6" />
        </g>
      )}
      <circle cx="130" cy="64" r="6" fill="#c8ff2e" stroke="#0e0620" strokeWidth="3" />
      <circle cx="130" cy="84" r="6" fill="#ff3ea5" stroke="#0e0620" strokeWidth="3" />
      <path d="M124 102 h12 M124 110 h12" stroke="#0e0620" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 132 l-6 12 M124 132 l6 12" stroke="#0e0620" strokeWidth="5" strokeLinecap="round" />
      {/* bow on top */}
      <path d="M120 40 c -14 -14 -26 -6 -18 6 c 6 6 14 0 18 -6z M120 40 c 14 -14 26 -6 18 6 c -6 6 -14 0 -18 -6z" fill="#ff3ea5" stroke="#0e0620" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="120" cy="40" r="5" fill="#c92281" stroke="#0e0620" strokeWidth="3" />
      {!error && (
        <text x="138" y="22" fontFamily="var(--font-marker)" fontSize="14" fill="#c9b3ff">
          z
        </text>
      )}
    </svg>
  )
}
