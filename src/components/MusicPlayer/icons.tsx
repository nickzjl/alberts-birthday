/** Inline SVG icons for the player (24×24 grid, currentColor). */
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const base = (p: P) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  'aria-hidden': true as const,
  focusable: false as const,
  ...p,
})

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const PlayIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 5.2v13.6c0 .8.9 1.3 1.6.9l10.6-6.8a1.05 1.05 0 0 0 0-1.8L9.6 4.3C8.9 3.9 8 4.4 8 5.2Z" fill="currentColor" />
  </svg>
)

export const PauseIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="5.5" y="4.5" width="4.6" height="15" rx="1.4" fill="currentColor" />
    <rect x="13.9" y="4.5" width="4.6" height="15" rx="1.4" fill="currentColor" />
  </svg>
)

export const NextIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 6.2v11.6c0 .7.8 1.1 1.4.7l8.3-5.8a.9.9 0 0 0 0-1.4L6.4 5.5C5.8 5.1 5 5.5 5 6.2Z" fill="currentColor" />
    <rect x="16.4" y="5" width="3" height="14" rx="1.2" fill="currentColor" />
  </svg>
)

export const PrevIcon = (p: P) => (
  <svg {...base(p)} style={{ transform: 'scaleX(-1)', ...p.style }}>
    <path d="M5 6.2v11.6c0 .7.8 1.1 1.4.7l8.3-5.8a.9.9 0 0 0 0-1.4L6.4 5.5C5.8 5.1 5 5.5 5 6.2Z" fill="currentColor" />
    <rect x="16.4" y="5" width="3" height="14" rx="1.2" fill="currentColor" />
  </svg>
)

/** Repeat arrows; `mode` adds the "1" badge or the slash. */
export const LoopIcon = ({ mode, ...p }: P & { mode: 'all' | 'one' | 'off' }) => (
  <svg {...base(p)}>
    <g {...stroke} opacity={mode === 'off' ? 0.55 : 1}>
      <path d="M17 3.5 20 6.5 17 9.5" />
      <path d="M4 11.5v-1a4 4 0 0 1 4-4h12" />
      <path d="M7 20.5 4 17.5 7 14.5" />
      <path d="M20 12.5v1a4 4 0 0 1-4 4H4" />
    </g>
    {mode === 'one' && (
      <g>
        <circle cx="12" cy="12" r="5.2" fill="currentColor" />
        <path d="M11 10.6 12.5 9.6V14.6" fill="none" stroke="var(--mp-icon-cut, #12062a)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    )}
    {mode === 'off' && <path d="M4 3.5 20 20.5" {...stroke} />}
  </svg>
)

export const VolumeIcon = ({ level, ...p }: P & { level: 'mute' | 'low' | 'high' }) => (
  <svg {...base(p)}>
    <path d="M3.5 9.6v4.8c0 .6.5 1.1 1.1 1.1h3l4.6 3.9c.7.6 1.8.1 1.8-.8V5.4c0-.9-1.1-1.4-1.8-.8L7.6 8.5h-3c-.6 0-1.1.5-1.1 1.1Z" fill="currentColor" />
    {level === 'mute' ? (
      <g {...stroke}>
        <path d="m16.5 9.2 5 5.6" />
        <path d="m21.5 9.2-5 5.6" />
      </g>
    ) : (
      <g {...stroke}>
        <path d="M16.6 9.4a4 4 0 0 1 0 5.2" />
        {level === 'high' && <path d="M19.2 6.6a8 8 0 0 1 0 10.8" />}
      </g>
    )}
  </svg>
)

export const CloseIcon = (p: P) => (
  <svg {...base(p)}>
    <g {...stroke} strokeWidth={3}>
      <path d="M6.5 6.5 17.5 17.5" />
      <path d="M17.5 6.5 6.5 17.5" />
    </g>
  </svg>
)

export const CaretIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6.5 14.5 12 9l5.5 5.5" {...stroke} strokeWidth={3} />
  </svg>
)

export const NoteIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 17.5V6.2c0-.5.3-.9.8-1l8.4-2c.6-.2 1.3.3 1.3 1v11.3" {...stroke} />
    <ellipse cx="6.6" cy="17.6" rx="3.1" ry="2.6" fill="currentColor" />
    <ellipse cx="17.1" cy="15.6" rx="3.1" ry="2.6" fill="currentColor" />
  </svg>
)

export const SparkIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2.5c.4 4.6 2.4 6.9 7 7.5-4.6.6-6.6 2.9-7 7.5-.4-4.6-2.4-6.9-7-7.5 4.6-.6 6.6-2.9 7-7.5Z" fill="currentColor" />
    <path d="M19 15.5c.2 2 1 3 3 3.2-2 .3-2.8 1.2-3 3.3-.2-2.1-1-3-3-3.3 2-.2 2.8-1.2 3-3.2Z" fill="currentColor" />
  </svg>
)

/* ---- record label glyphs (one per track) ---- */

export const BoltGlyph = (p: P) => (
  <svg {...base(p)} viewBox="0 0 24 24">
    <path d="M13.8 2.5 5.5 13.4h5.4l-1.7 8.1 8.3-11h-5.4l1.7-8Z" fill="currentColor" stroke="var(--ink)" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
)

export const DropGlyph = (p: P) => (
  <svg {...base(p)} viewBox="0 0 24 24">
    <path d="M12 2.8c3.6 4.5 6.2 8.1 6.2 11.6a6.2 6.2 0 0 1-12.4 0c0-3.5 2.6-7.1 6.2-11.6Z" fill="currentColor" stroke="var(--ink)" strokeWidth="1.4" />
    <path d="M9.2 14.6a3 3 0 0 0 2.4 2.9" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

export const MoonGlyph = (p: P) => (
  <svg {...base(p)} viewBox="0 0 24 24">
    <path d="M15.8 3.2a8.6 8.6 0 1 0 5 13.9A7.2 7.2 0 0 1 15.8 3.2Z" fill="currentColor" stroke="var(--ink)" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="9.4" cy="11" r="1.3" fill="var(--ink)" opacity="0.35" />
    <circle cx="11.6" cy="16" r="0.9" fill="var(--ink)" opacity="0.35" />
  </svg>
)

export const StarGlyph = (p: P) => (
  <svg {...base(p)} viewBox="0 0 24 24">
    <path d="M12 2.6 14.6 9l6.8.4-5.3 4.3 1.8 6.6L12 16.6l-5.9 3.7 1.8-6.6-5.3-4.3L9.4 9 12 2.6Z" fill="currentColor" stroke="var(--ink)" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
)
