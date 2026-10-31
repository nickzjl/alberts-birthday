import { AnimatePresence, motion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import type { VoiceProfile } from '../../audio/voice'
import { Typewriter } from './Typewriter'

export type BubbleTail = 'left' | 'right' | 'bottom' | 'bottom-left' | 'bottom-right' | 'top' | 'top-left' | 'top-right' | 'none'

export interface SpeechBubbleProps {
  /** Text to type out. Supports *emphasis*. Changing it re-pops the bubble. */
  text?: string
  /** Or static children instead of typed text */
  children?: ReactNode
  voice?: VoiceProfile
  tail?: BubbleTail
  /** 0 calm … 3 screaming: shakes, reddens, gets jagged */
  intensity?: 0 | 1 | 2 | 3
  /** small name tag on the bubble */
  speaker?: string
  cps?: number
  skip?: boolean
  onDone?: () => void
  onChar?: (ch: string) => void
  className?: string
  style?: CSSProperties
  /** show/hide with pop animation */
  visible?: boolean
}

/**
 * Comic speech bubble that pops in, types its line with a character voice,
 * and escalates visually with `intensity`.
 */
export function SpeechBubble({
  text,
  children,
  voice,
  tail = 'bottom',
  intensity = 0,
  speaker,
  cps,
  skip,
  onDone,
  onChar,
  className = '',
  style,
  visible = true,
}: SpeechBubbleProps) {
  const key = text ?? 'static'
  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={key}
          className={`bubble bubble--tail-${tail} bubble--i${intensity} ${className}`}
          style={style}
          initial={{ scale: 0.3, opacity: 0, rotate: tail.includes('left') ? -8 : 8 }}
          animate={{ scale: 1, opacity: 1, rotate: intensity >= 2 ? [0, -1.5, 1.5, 0] : 0 }}
          exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.12 } }}
          transition={{ type: 'spring', stiffness: 520, damping: 24 }}
          role="status"
          aria-live="polite"
        >
          {speaker && <span className="bubble__speaker">{speaker}</span>}
          <div className="bubble__body">
            {text !== undefined ? (
              <Typewriter text={text} voice={voice} cps={cps} intensity={intensity / 3} skip={skip} onDone={onDone} onChar={onChar} />
            ) : (
              children
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
