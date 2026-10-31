import { motion, type HTMLMotionProps } from 'motion/react'
import { forwardRef, useState, type ReactNode } from 'react'
import { sfx, type SfxName } from '../../audio/sfx'

export type BigButtonVariant = 'acid' | 'hot' | 'lavender' | 'cyan' | 'sun' | 'ghost' | 'danger'

export interface BigButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: BigButtonVariant
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** idle attention wiggle */
  wiggle?: boolean
  /** click sound (default 'click'); false for silent */
  sound?: SfxName | false
  /** hover tick */
  hoverSound?: boolean
  icon?: ReactNode
  /** text after the label, e.g. an arrow */
  trailing?: ReactNode
  children?: ReactNode
}

/**
 * The chunky, sticker-ish button used everywhere: thick ink outline, hard 3D shadow
 * that squashes on press, spring hover. Pass `wiggle` to make it beg for attention.
 *
 * `disabled` is "soft" while the button has focus: it stays focusable (aria-disabled, clicks and
 * sounds blocked, disabled look) so a keyboard user isn't dropped to <body> when a scene disables
 * the button they're on. Once focus leaves, it becomes a real disabled button.
 */
export const BigButton = forwardRef<HTMLButtonElement, BigButtonProps>(function BigButton(
  { variant = 'acid', size = 'md', wiggle, sound = 'click', hoverSound = true, icon, trailing, children, className = '', onClick, onPointerEnter, onFocus, onBlur, disabled, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false)
  const off = !!disabled
  return (
    <motion.button
      ref={ref}
      type="button"
      className={`bb bb--${variant} bb--${size} ${wiggle && !off ? 'bb--wiggle' : ''} ${className}`}
      whileHover={off ? undefined : { y: -3, scale: 1.035, rotate: -1 }}
      whileTap={off ? undefined : { y: 4, scale: 0.96, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 520, damping: 22 }}
      disabled={off && !focused}
      aria-disabled={off || undefined}
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        onBlur?.(e)
      }}
      onPointerEnter={(e) => {
        // a tap fires pointerenter right before pointerdown: no hover tick on touch
        if (hoverSound && !off && e.pointerType === 'mouse') sfx.play('hover')
        onPointerEnter?.(e)
      }}
      onClick={(e) => {
        if (off) {
          e.preventDefault()
          return
        }
        if (sound) sfx.play(sound)
        onClick?.(e)
      }}
      {...rest}
    >
      <span className="bb__face">
        {icon && <span className="bb__icon">{icon}</span>}
        <span className="bb__label">{children}</span>
        {trailing && <span className="bb__trailing">{trailing}</span>}
      </span>
    </motion.button>
  )
})
