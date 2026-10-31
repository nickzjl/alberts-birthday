import { AnimatePresence, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { audio } from '../../audio/engine'
import { soundtrack, trackInfo, TRACKS, useSoundtrack } from '../../audio/soundtrack'
import { useApp } from '../../state/app'
import { useMediaQuery, useSpin } from './hooks'
import { MobileDisc } from './MobileDisc'
import { Panel } from './Panel'
import { Pill } from './Pill'
import './musicPlayer.css'

const ON_ACCENT: Record<string, string> = { 'purple-rain': '#ffffff' }

/**
 * The persistent floating soundtrack player (mounted once in App).
 * Desktop ≥768px: sticker pill bottom-left, panel springs up above it.
 * Mobile <768px: spinning disc in the top-right corner (the top bar keeps that corner free), panel drops down below it.
 * Landscape phones (≥768px wide but ≤500px tall): the pill would eat a fifth of the screen, so the
 * disc docks bottom-left instead (inside the --player-clearance the scene docks already reserve).
 */
export function MusicPlayer() {
  const s = useSoundtrack()
  const engine = useSyncExternalStore(audio.subscribe, audio.getState, audio.getState)
  const { calm } = useApp()
  const narrow = useMediaQuery('(max-width: 767px)')
  const short = useMediaQuery('(max-height: 500px)')
  const layout = narrow ? 'mobile' : short ? 'dock' : 'desktop'
  const mobile = layout === 'mobile'
  const disc = layout !== 'desktop'
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  // the OS suspended audio (call, lock screen…): stop spinning until the next tap brings it back
  const interrupted = s.playing && engine.unlocked && !engine.running
  const spin = useSpin(s.playing && !s.loading && !interrupted, !reduced)
  const t = trackInfo(s.trackId)

  const toggleOpen = useCallback((force?: boolean) => setOpen((o) => (force === undefined ? !o : force)), [])
  const close = useCallback((refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus({ preventScroll: true })
  }, [])

  // the birthday video wants the stage to itself
  useEffect(() => {
    if (calm) setOpen(false)
  }, [calm])

  // resolve every track's source early so the track list can show "placeholder" badges
  useEffect(() => {
    const id = window.setTimeout(() => TRACKS.forEach((tr) => soundtrack.preload(tr.id)), 1500)
    return () => window.clearTimeout(id)
  }, [])

  // outside tap / Escape closes; focus moves into the panel when it opens
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const focusId = window.setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 60)
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(focusId)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const style = { '--accent': t.accent, '--on-accent': ON_ACCENT[t.id] ?? 'var(--ink)' } as CSSProperties

  return (
    <div
      ref={rootRef}
      className={`mp mp--${layout} ${calm ? 'mp--calm' : ''} ${open ? 'is-open' : ''} ${s.playing ? 'is-playing' : ''}`}
      style={style}
      role="region"
      aria-label="Music player"
      onKeyDown={(e) => {
        // Space/Enter on a player button shouldn't also jump / bonk in a scene
        if ((e.key === ' ' || e.key === 'Enter') && (e.target as HTMLElement).closest('button')) e.stopPropagation()
      }}
      onPointerUp={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        // don't leave focus parked on a mouse/touch-clicked control (scene keys must keep working)
        requestAnimationFrame(() => {
          const a = document.activeElement
          if (a instanceof HTMLElement && a !== panelRef.current && rootRef.current?.contains(a)) a.blur()
        })
      }}
    >
      {disc ? (
        <MobileDisc s={s} spin={spin} open={open} panelId={panelId} onToggleOpen={toggleOpen} triggerRef={triggerRef} />
      ) : (
        <Pill s={s} spin={spin} open={open} panelId={panelId} onToggleOpen={() => toggleOpen()} triggerRef={triggerRef} />
      )}
      <AnimatePresence>
        {open && <Panel key="panel" ref={panelRef} id={panelId} s={s} sfxOn={engine.sfxEnabled} spin={spin} mobile={mobile} onClose={() => close()} />}
      </AnimatePresence>
      <span className="u-visually-hidden" aria-live="polite">
        {s.started && s.playing ? `Now playing: ${t.title} by ${t.artist}` : ''}
      </span>
    </div>
  )
}
