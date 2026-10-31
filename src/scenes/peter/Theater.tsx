import { AnimatePresence, motion } from 'motion/react'
import { forwardRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { soundtrack } from '../../audio/soundtrack'
import { Finale } from './Finale'
import { VideoPlayer, type VideoPlayerHandle } from './VideoPlayer'
import { BIRTHDAY_VIDEO } from './videoSource'
import { YouTubePlayer } from './YouTubePlayer'

interface TheaterProps {
  mode: 'video' | 'finale'
  from: DOMRect | null
  onEnded: () => void
  onReplay: () => void
  onStartOver: () => void
}

/**
 * Full-viewport layer for the emotional payoff (portaled to <body> so it sits above the
 * scene's dock but under the top bar, music player, toasts and confetti).
 */
export const Theater = forwardRef<VideoPlayerHandle, TheaterProps>(function Theater({ mode, from, onEnded, onReplay, onStartOver }, ref) {
  const [available, setAvailable] = useState(true)
  // no video (file missing / YouTube won't load): don't leave Albert in silence behind the card — bring the music back softly
  useEffect(() => {
    if (mode === 'video' && !available) soundtrack.fadeIn(2500)
  }, [mode, available])
  return createPortal(
    <div className={`pt-theater pt-theater--${mode}`}>
      <motion.div className="pt-theater__bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.8, delay: 0.4 }} aria-hidden="true" />
      <div className="pt-theater__inner">
        <AnimatePresence>
          {mode === 'video' && (
            <motion.header
              key="title"
              className="pt-theater__head"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.4 } }}
              transition={{ delay: 1.4, duration: 1 }}
            >
              <span className="pt-theater__for">for Albert ♥</span>
              <h2 className="pt-theater__title">A message from your friends</h2>
            </motion.header>
          )}
        </AnimatePresence>

        {BIRTHDAY_VIDEO.youtube ? (
          <YouTubePlayer
            ref={ref}
            videoId={BIRTHDAY_VIDEO.youtube}
            aspect={BIRTHDAY_VIDEO.aspect}
            from={from}
            onEnded={onEnded}
            onContinue={onEnded}
            hidden={mode === 'finale'}
            onAvailable={setAvailable}
          />
        ) : (
          <VideoPlayer ref={ref} from={from} onEnded={onEnded} onContinue={onEnded} hidden={mode === 'finale'} onAvailable={setAvailable} />
        )}

        {mode === 'finale' && <Finale onReplay={available ? onReplay : undefined} onStartOver={onStartOver} />}
      </div>
    </div>,
    document.body,
  )
})
