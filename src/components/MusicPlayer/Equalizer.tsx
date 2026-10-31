import { useEffect, useRef } from 'react'
import { soundtrack } from '../../audio/soundtrack'

// log-ish frequency bands over a 128-bin analyser (≈190 Hz per bin at 48 kHz)
const BANDS: Array<[number, number]> = [
  [0, 2],
  [2, 5],
  [5, 11],
  [11, 24],
  [24, 56],
]
const IDLE = 0.16

/**
 * Tiny live equalizer driven by the soundtrack's AnalyserNode (refs only, no re-renders).
 * Falls back to a CSS bounce when the analyser isn't available.
 */
export function Equalizer({ active, bars = 5, className = '' }: { active: boolean; bars?: number; className?: string }) {
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const els = Array.from(root.children) as HTMLElement[]
    const reset = () => els.forEach((el) => el.style.setProperty('--v', String(IDLE)))
    if (!active) {
      root.dataset.mode = 'idle'
      reset()
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.dataset.mode = 'static'
      return
    }
    const analyser = soundtrack.getAnalyser()
    if (!analyser) {
      root.dataset.mode = 'css'
      return
    }
    root.dataset.mode = 'live'
    const data = new Uint8Array(analyser.frequencyBinCount)
    const levels = els.map(() => IDLE)
    let raf = 0
    let frame = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (++frame % 2) return // 30fps is plenty for 5 bars
      analyser.getByteFrequencyData(data)
      els.forEach((el, i) => {
        const [a, b] = BANDS[Math.min(BANDS.length - 1, Math.round((i * (BANDS.length - 1)) / Math.max(1, els.length - 1)))]
        let sum = 0
        for (let k = a; k < b && k < data.length; k++) sum += data[k]
        const raw = sum / Math.max(1, b - a) / 255
        const target = IDLE + (1 - IDLE) * Math.min(1, Math.pow(raw, 1.4) * 1.25)
        levels[i] = target > levels[i] ? target : levels[i] * 0.86 + target * 0.14
        el.style.setProperty('--v', levels[i].toFixed(3))
      })
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      reset()
    }
  }, [active])

  return (
    <span ref={rootRef} className={`mp-eq ${className}`} aria-hidden="true" data-mode="idle">
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className="mp-eq__bar" style={{ animationDelay: `${i * -0.17}s` }} />
      ))}
    </span>
  )
}
