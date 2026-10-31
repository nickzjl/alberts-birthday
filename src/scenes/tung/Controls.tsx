import { motion } from 'motion/react'
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode, type RefObject } from 'react'
import type { Game } from './engine'

export function Key({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return <kbd className={`tg-key ${wide ? 'tg-key--wide' : ''}`}>{children}</kbd>
}

type Btn = 'left' | 'right' | 'jump'
type Side = 'left' | 'right'

/**
 * Big thumb buttons. ◀ ▶ are one d-pad zone: a thumb can rock or slide between them and the
 * direction follows it (pointer captured by the zone, side picked from the pointer's x).
 * JUMP / BONK are separate so a second thumb can jump while the first keeps running.
 */
export function TouchPad({ game, dizzy }: { game: RefObject<Game | null>; dizzy: boolean }) {
  const [held, setHeld] = useState<Record<Btn, boolean>>({ left: false, right: false, jump: false })
  const dpadRef = useRef<HTMLDivElement>(null)
  /** pointers on the d-pad → the side each one is on */
  const ptrs = useRef(new Map<number, Side>())

  const set = (b: Btn, v: boolean) => {
    const g = game.current
    if (g) {
      if (b === 'jump') g.pressJump(v)
      else g.input[b] = v
    }
    setHeld((h) => (h[b] === v ? h : { ...h, [b]: v }))
  }

  const sideOf = (x: number): Side => {
    const r = dpadRef.current?.getBoundingClientRect()
    return !r || x < r.left + r.width / 2 ? 'left' : 'right'
  }
  const syncDpad = () => {
    const sides = [...ptrs.current.values()]
    // two thumbs on opposite arrows: the newest one wins
    const last = sides[sides.length - 1]
    set('left', last === 'left')
    set('right', last === 'right')
  }
  const dpad = {
    onPointerDown: (e: RPointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture?.(e.pointerId)
      ptrs.current.delete(e.pointerId)
      ptrs.current.set(e.pointerId, sideOf(e.clientX))
      syncDpad()
    },
    onPointerMove: (e: RPointerEvent<HTMLDivElement>) => {
      const cur = ptrs.current.get(e.pointerId)
      if (!cur) return
      const side = sideOf(e.clientX)
      if (side !== cur) {
        ptrs.current.set(e.pointerId, side)
        syncDpad()
      }
    },
    onPointerUp: (e: RPointerEvent<HTMLDivElement>) => {
      if (ptrs.current.delete(e.pointerId)) syncDpad()
    },
    onPointerCancel: (e: RPointerEvent<HTMLDivElement>) => {
      if (ptrs.current.delete(e.pointerId)) syncDpad()
    },
    onLostPointerCapture: (e: RPointerEvent<HTMLDivElement>) => {
      if (ptrs.current.delete(e.pointerId)) syncDpad()
    },
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  }
  const jump = {
    onPointerDown: (e: RPointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture?.(e.pointerId)
      set('jump', true)
    },
    onPointerUp: () => set('jump', false),
    onPointerCancel: () => set('jump', false),
    onLostPointerCapture: () => set('jump', false),
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  }

  // release everything if the pad unmounts mid-hold
  useEffect(
    () => () => {
      const g = game.current
      if (g) {
        g.input.left = g.input.right = false
        g.pressJump(false)
      }
    },
    [game],
  )

  return (
    <div className="tg-pad" role="group" aria-label="Touch controls">
      <div className="tg-pad__side tg-pad__dpad" ref={dpadRef} {...dpad}>
        <button type="button" tabIndex={-1} className={`tg-pad__btn ${held.left ? 'is-held' : ''}`} aria-label="Move left">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 4 L6 12 L16 20 Z" /></svg>
        </button>
        <button type="button" tabIndex={-1} className={`tg-pad__btn ${held.right ? 'is-held' : ''}`} aria-label="Move right">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4 L18 12 L8 20 Z" /></svg>
        </button>
      </div>
      <div className="tg-pad__side">
        <motion.button
          type="button"
          className={`tg-pad__btn tg-pad__btn--bonk ${dizzy ? 'is-ready' : ''}`}
          aria-label="Bonk"
          disabled={!dizzy}
          animate={dizzy ? { scale: [1, 1.12, 1] } : { scale: 0.92 }}
          transition={dizzy ? { repeat: Infinity, duration: 0.6 } : { duration: 0.2 }}
          onPointerDown={(e) => {
            e.preventDefault()
            game.current?.tryBonk('pointer')
          }}
        >
          BONK
        </motion.button>
        <button type="button" className={`tg-pad__btn tg-pad__btn--jump ${held.jump ? 'is-held' : ''}`} aria-label="Jump" {...jump}>
          JUMP
        </button>
      </div>
    </div>
  )
}

export function KeyLegend({ dizzy }: { dizzy: boolean }) {
  return (
    <div className="tg-legend" aria-label="Controls">
      <span className="tg-legend__item">
        <Key>←</Key>
        <Key>→</Key>
        <span>move</span>
      </span>
      <span className="tg-legend__item">
        <Key wide>space</Key>
        <span>jump</span>
      </span>
      <span className={`tg-legend__item ${dizzy ? 'is-hot' : ''}`}>
        <Key wide>click tung</Key>
        <span>/</span>
        <Key>E</Key>
        <span>bonk</span>
      </span>
    </div>
  )
}
