import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { BigButton, type BigButtonVariant } from './BigButton'

export interface NextCtaProps {
  show: boolean
  label: string
  onClick: () => void
  variant?: BigButtonVariant
  /** small line above the button */
  note?: string
}

/**
 * "NEXT: … →" call to action that springs in when an experience is finished.
 * Keyboard users whose focused control just disappeared (focus fell back to <body>) land on it.
 */
export function NextCta({ show, label, onClick, variant = 'acid', note }: NextCtaProps) {
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!show) return
    const id = window.setTimeout(() => {
      const a = document.activeElement
      if (!a || a === document.body || a.classList.contains('app__stage')) btn.current?.focus({ preventScroll: true })
    }, 400)
    return () => window.clearTimeout(id)
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="next-cta"
          initial={{ y: 60, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 20, delay: 0.25 }}
        >
          {note && <span className="next-cta__note">{note}</span>}
          <BigButton ref={btn} variant={variant} size="lg" wiggle onClick={onClick} sound="whoosh" trailing={<span aria-hidden="true">→</span>}>
            {label}
          </BigButton>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
