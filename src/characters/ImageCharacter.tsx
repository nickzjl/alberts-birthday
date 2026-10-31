import { AnimatePresence, motion } from 'motion/react'
import type { CSSProperties } from 'react'

export interface ImageCharacterProps {
  images: Partial<Record<string, string>>
  expression: string
  alt: string
  talking?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Renders a character from user-supplied images (one per expression), cross-fading
 * between expressions with a little squash. Used when `characterArt.<name>.renderer === 'image'`.
 * The surrounding character rig still applies whole-body pose animation.
 */
export function ImageCharacter({ images, expression, alt, talking, className, style }: ImageCharacterProps) {
  const src = images[expression] ?? images.neutral ?? Object.values(images)[0]
  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <AnimatePresence initial={false}>
        {src && (
          <motion.img
            key={src}
            src={src}
            alt={alt}
            draggable={false}
            initial={{ opacity: 0, scaleY: 0.92, scaleX: 1.06 }}
            animate={{ opacity: 1, scaleY: talking ? [1, 1.025, 1] : 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={talking ? { scaleY: { repeat: Infinity, duration: 0.22 }, default: { duration: 0.2 } } : { duration: 0.2 }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: '50% 100%', transformOrigin: '50% 100%' }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
