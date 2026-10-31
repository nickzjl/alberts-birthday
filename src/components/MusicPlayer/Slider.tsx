import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type Ref } from 'react'

export interface SliderProps {
  label: string
  valueNow: number
  valueMax: number
  valueText: string
  /** 0..1 fill (controlled). Omit to drive `--p` imperatively through `rootRef`. */
  ratio?: number
  /** current ratio, for keyboard steps */
  getRatio: () => number
  /** keyboard steps, in ratio units */
  step: number
  bigStep: number
  /** live while dragging */
  onScrub?: (r: number) => void
  /** on release / keyboard */
  onCommit: (r: number) => void
  disabled?: boolean
  className?: string
  rootRef?: Ref<HTMLDivElement>
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Chunky custom slider: pointer drag (with capture), full keyboard support, ARIA slider semantics. */
export function Slider({ label, valueNow, valueMax, valueText, ratio, getRatio, step, bigStep, onScrub, onCommit, disabled, className = '', rootRef }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const last = useRef(0)

  const fromEvent = (e: PointerEvent) => {
    const r = trackRef.current?.getBoundingClientRect()
    if (!r || r.width === 0) return 0
    return clamp01((e.clientX - r.left) / r.width)
  }

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    e.currentTarget.dataset.dragging = 'true'
    last.current = fromEvent(e)
    onScrub?.(last.current)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    last.current = fromEvent(e)
    onScrub?.(last.current)
  }
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    delete e.currentTarget.dataset.dragging
    if (e.type !== 'pointercancel') last.current = fromEvent(e)
    onCommit(last.current)
  }

  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const cur = getRatio()
    let next: number | null = null
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = cur + step
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        next = cur - step
        break
      case 'PageUp':
        next = cur + bigStep
        break
      case 'PageDown':
        next = cur - bigStep
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = 1
        break
    }
    if (next === null) return
    e.preventDefault()
    e.stopPropagation() // keep game controls (arrow keys) from also firing
    onCommit(clamp01(next))
  }

  const style = ratio === undefined ? undefined : ({ '--p': clamp01(ratio) } as CSSProperties)

  return (
    <div
      ref={rootRef}
      className={`mp-slider ${className}`}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(valueMax)}
      aria-valuenow={Math.round(valueNow)}
      aria-valuetext={valueText}
      aria-disabled={disabled || undefined}
      style={style}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
    >
      <div className="mp-slider__track" ref={trackRef}>
        <div className="mp-slider__fill" />
      </div>
      <div className="mp-slider__knob" />
    </div>
  )
}
