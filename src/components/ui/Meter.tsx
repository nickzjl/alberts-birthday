import { motion } from 'motion/react'

export interface MeterProps {
  label: string
  /** 0..1 */
  value: number
  color?: string
  /** right-side readout, defaults to percentage */
  readout?: string
  /** pixel-font HUD style (boss fight) */
  pixel?: boolean
  /** shake when value is above this (0..1) */
  dangerAt?: number
  segments?: number
  className?: string
  /** reverse fill direction (fills from right) */
  reverse?: boolean
}

/** Chunky labelled bar — anger meters, health bars, apology meters. */
export function Meter({ label, value, color = 'var(--acid)', readout, pixel, dangerAt = 2, segments = 0, className = '', reverse }: MeterProps) {
  const v = Math.max(0, Math.min(1, value))
  const danger = v >= dangerAt
  return (
    <div className={`meter ${pixel ? 'meter--pixel' : ''} ${danger ? 'meter--danger' : ''} ${className}`}>
      <div className="meter__top">
        <span className="meter__label">{label}</span>
        <span className="meter__readout">{readout ?? `${Math.round(v * 100)}%`}</span>
      </div>
      <div className="meter__track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
        <motion.div
          className="meter__ghost"
          initial={false}
          animate={{ scaleX: v }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          style={{ originX: reverse ? 1 : 0 }}
        />
        <motion.div
          className="meter__fill"
          initial={false}
          animate={{ scaleX: v }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          style={{ background: color, originX: reverse ? 1 : 0 }}
        />
        {segments > 0 && (
          <div className="meter__segments">
            {Array.from({ length: segments - 1 }, (_, i) => (
              <span key={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
