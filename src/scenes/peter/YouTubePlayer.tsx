import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from 'react'
import { sfx } from '../../audio/sfx'
import { BigButton } from '../../components/ui/BigButton'
import { useRiseFrom } from './useRise'
import { TvDoodle, type VideoPlayerHandle } from './VideoPlayer'
import { createEmbed, loadYouTubeApi, YT_STATE, type YTPlayer } from './youtube'

type Status = 'loading' | 'ready' | 'starting' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error'

interface YouTubePlayerProps {
  videoId: string
  /** width / height */
  aspect: number
  from?: DOMRect | null
  onEnded: () => void
  /** error card "continue" / skip */
  onContinue: () => void
  /** hidden during the finale (stays mounted so "Replay video" is a direct user gesture) */
  hidden?: boolean
  onAvailable?: (available: boolean) => void
}

/** If YouTube hasn't come up by then (blocked network, offline…), show the friendly error card. */
const LOAD_TIMEOUT_MS = 15000
/** iPhone won't let a page start a YouTube video: after this, point at YouTube's own ▶ instead. */
const STUCK_MS = 2600

/**
 * The friends' video from YouTube, in the same glowing frame as a self-hosted one: rises out of the
 * present, waits under a big PLAY button, hands over to YouTube's controls, and calls `onEnded` for
 * the finale. Same handle as VideoPlayer (replay / pause).
 */
export const YouTubePlayer = forwardRef<VideoPlayerHandle, YouTubePlayerProps>(function YouTubePlayer(
  { videoId, aspect, from, onEnded, onContinue, hidden, onAvailable },
  ref,
) {
  const reduced = useReducedMotion()
  const frameRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [started, setStarted] = useState(false)
  const [stuck, setStuck] = useState(false)
  const [skipReady, setSkipReady] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const timers = useRef(new Set<number>())
  const statusRef = useRef(status)
  statusRef.current = status
  const cbs = useRef({ onEnded, onAvailable })
  useEffect(() => {
    cbs.current = { onEnded, onAvailable }
  })

  const later = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, ms)
    timers.current.add(id)
  }, [])
  useEffect(() => {
    const t = timers.current
    return () => t.forEach((id) => window.clearTimeout(id))
  }, [])

  useRiseFrom(frameRef, from, !!reduced, true)

  useEffect(() => {
    if (status === 'ready') cbs.current.onAvailable?.(true)
    if (status === 'error') cbs.current.onAvailable?.(false)
  }, [status])

  // build the embed + hook YouTube's API to it (again on "Try again")
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let alive = true
    const iframe = createEmbed(videoId, 'Happy birthday, Albert — a video from your friends')
    host.replaceChildren(iframe)
    const timeout = window.setTimeout(() => {
      if (alive && statusRef.current === 'loading') setStatus('error')
    }, LOAD_TIMEOUT_MS)

    loadYouTubeApi()
      .then((YT) => {
        if (!alive) return
        playerRef.current = new YT.Player(iframe, {
          events: {
            onReady: () => {
              if (alive && statusRef.current === 'loading') setStatus('ready')
              // dev only: window.__ytPlayer.seekTo(window.__ytPlayer.getDuration() - 3, true) to test the finale
              if (import.meta.env.DEV) (window as unknown as { __ytPlayer?: YTPlayer | null }).__ytPlayer = playerRef.current
            },
            onStateChange: ({ data }) => {
              if (!alive) return
              if (data === YT_STATE.PLAYING) {
                setStarted(true)
                setStuck(false)
                setStatus('playing')
              } else if (data === YT_STATE.BUFFERING) {
                setStuck(false)
                if (statusRef.current !== 'loading') setStatus('buffering')
              } else if (data === YT_STATE.PAUSED) {
                if (statusRef.current !== 'loading' && statusRef.current !== 'ended') setStatus('paused')
              } else if (data === YT_STATE.ENDED) {
                setStatus('ended')
                cbs.current.onEnded()
              }
            },
            // 2 bad id · 5 can't play here · 100 removed/private · 101/150 embedding off · 153 no referrer
            onError: () => {
              if (alive) setStatus('error')
            },
          },
        })
      })
      .catch(() => {
        if (alive) setStatus('error')
      })

    return () => {
      alive = false
      window.clearTimeout(timeout)
      try {
        playerRef.current?.destroy()
      } catch {
        /* already gone */
      }
      playerRef.current = null
      host.replaceChildren()
    }
  }, [videoId, attempt])

  const play = useCallback(() => {
    setStarted(true)
    setStuck(false)
    setStatus('starting')
    setSkipReady(false)
    later(4000, () => setSkipReady(true))
    try {
      playerRef.current?.playVideo()
    } catch {
      /* the stuck hint below covers it */
    }
    // nothing happened (iPhone blocks a page from starting the player): the scrim is gone, so YouTube's
    // own play button is right there — say so
    later(STUCK_MS, () => {
      if (statusRef.current === 'starting') setStuck(true)
    })
  }, [later])

  useImperativeHandle(
    ref,
    () => ({
      replay: () => {
        const p = playerRef.current
        if (!p || statusRef.current === 'error' || statusRef.current === 'loading') return
        try {
          p.seekTo(0, true)
        } catch {
          /* ignore */
        }
        play()
      },
      pause: () => {
        try {
          playerRef.current?.pauseVideo()
        } catch {
          /* ignore */
        }
      },
    }),
    [play],
  )

  // finale (or "skip to the finale") hides the screen: stop the video too
  useEffect(() => {
    if (!hidden) return
    try {
      playerRef.current?.pauseVideo()
    } catch {
      /* ignore */
    }
  }, [hidden])

  const retry = () => {
    setStarted(false)
    setStuck(false)
    setStatus('loading')
    setAttempt((a) => a + 1)
  }

  const card = status === 'error'
  const watchUrl = `https://youtu.be/${encodeURIComponent(videoId)}`

  return (
    <div className={`pt-player ${hidden ? 'is-hidden' : ''}`} style={{ '--ar': aspect } as CSSProperties}>
      <div ref={frameRef} className={`pt-frame ${card ? 'pt-frame--card' : ''}`}>
        <div className="pt-frame__halo" aria-hidden="true" />
        <div className="pt-frame__screen">
          <div ref={hostRef} className="pt-yt" />

          {status === 'loading' && <div className="pt-frame__shimmer pt-yt__shimmer" aria-hidden="true" />}

          {/* until PLAY is pressed, a scrim keeps YouTube's own UI out of the way */}
          <AnimatePresence>
            {!started && !card && (
              <motion.div
                key="play"
                className="pt-play pt-play--yt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
                transition={{ delay: 1.2, duration: 0.6 }}
              >
                {status === 'ready' && (
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
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {card && (
            <motion.div className="pt-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}>
              <TvDoodle error />
              <div className="pt-card__text">
                <h2 className="pt-card__title">The video hiccuped</h2>
                <p className="pt-card__body">YouTube wouldn&apos;t load here. Watch it on YouTube, give it another go, or skip ahead — the party&apos;s waiting.</p>
                <div className="pt-card__actions">
                  <BigButton variant="ghost" size="md" onClick={retry} icon={<span aria-hidden="true">↻</span>}>
                    Try again
                  </BigButton>
                  <a className="pt-yt__watch" href={watchUrl} target="_blank" rel="noopener noreferrer">
                    Watch on YouTube ↗
                  </a>
                  <BigButton variant="lavender" size="md" onClick={onContinue} sound="whoosh" autoFocus trailing={<span aria-hidden="true">→</span>}>
                    Continue to the finale
                  </BigButton>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="pt-player__below">
        <AnimatePresence mode="wait">
          {stuck && !card && !hidden ? (
            <motion.p key="stuck" className="pt-yt__hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              Tap ▶ on the video to start it
            </motion.p>
          ) : started && skipReady && !card && !hidden ? (
            <motion.button
              key="skip"
              type="button"
              className="pt-skip"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              onClick={() => {
                try {
                  playerRef.current?.pauseVideo()
                } catch {
                  /* ignore */
                }
                onContinue()
              }}
            >
              skip to the finale →
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
})
