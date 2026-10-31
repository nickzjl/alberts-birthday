import { motion } from 'motion/react'
import { useContext, useState, type CSSProperties, type ReactNode } from 'react'
import { AppContext } from '../../state/app'

export interface SceneShellProps {
  /** 1 | 2 | 3 */
  chapter: number
  title: string
  /** small joke line under the title */
  kicker?: string
  /** full-bleed scene background layer (behind everything) */
  backdrop?: ReactNode
  /** overlay HUD in the top area (meters, health bars) */
  hud?: ReactNode
  /** bottom control dock (buttons). Automatically clears the music player. */
  dock?: ReactNode
  /** the stage (characters, props) */
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** hide the chapter header (e.g. during the birthday video) */
  hideHeader?: boolean
}

/**
 * Shared layout for the three experiences:
 *
 *   ┌───────────── header (chapter chip + title) ─────────────┐
 *   │ hud                                                      │
 *   │                       stage (1fr)                        │
 *   │                                                          │
 *   └───────────────────── dock (controls) ────────────────────┘
 *
 * Fills the viewport below the top bar. Mobile-first; dock respects safe areas
 * and the floating music player.
 */
export function SceneShell({ chapter, title, kicker, backdrop, hud, dock, children, className = '', style, hideHeader }: SceneShellProps) {
  // the scene mounts under the brain-wipe goo: hold the header's entrance until the goo lifts,
  // so it drops in where people can see it (outside the app, e.g. dev sheets, it just plays)
  const covered = useContext(AppContext)?.transitioning ?? false
  const [entered, setEntered] = useState(!covered)
  if (!entered && !covered) setEntered(true)
  return (
    <section className={`shell ${className}`} style={style} aria-label={title}>
      {backdrop && <div className="shell__backdrop">{backdrop}</div>}
      <motion.header
        className="shell__header"
        initial={{ y: -20, opacity: 0 }}
        animate={entered ? { y: 0, opacity: hideHeader ? 0 : 1 } : { y: -20, opacity: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 26 }}
      >
        <span className="shell__chip">EXPERIENCE {String(chapter).padStart(2, '0')}</span>
        <h1 className="shell__title">{title}</h1>
        {kicker && <p className="shell__kicker">{kicker}</p>}
      </motion.header>
      {hud && <div className="shell__hud">{hud}</div>}
      <div className="shell__stage">{children}</div>
      {dock && <div className="shell__dock">{dock}</div>}
    </section>
  )
}
