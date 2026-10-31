/** Small SVG props for the boss fight: kentongan, party hammer, shockwave, hearts. */
const INK = '#0e0620'

/** Kentongan — the hollow wooden slit drum hanging at every pos ronda. viewBox 40×84. */
export function Kentongan({ className, rope = true }: { className?: string; rope?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 40 84" width="100%" height="100%" aria-hidden="true">
      {rope && <path d="M20 0 V10" stroke="#e9d3a8" strokeWidth="3" />}
      <rect x="6" y="9" width="28" height="72" rx="12" fill="#8a4a3a" stroke={INK} strokeWidth="3" />
      <rect x="10" y="12" width="7" height="64" rx="3.5" fill="#b8704f" opacity="0.7" />
      <rect x="16" y="26" width="8" height="38" rx="4" fill="#2a0e1e" stroke={INK} strokeWidth="2" />
      <path d="M6 20 H34 M6 70 H34" stroke="#e9d3a8" strokeWidth="3" />
      <path d="M6 20 H34 M6 70 H34" stroke={INK} strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

/** Inflatable birthday bonk hammer. viewBox 120×70, handle pointing down-left. */
export function PartyHammer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
      <g transform="rotate(-45 60 60)">
        <rect x="54" y="44" width="12" height="74" rx="6" fill="#c8ff2e" stroke={INK} strokeWidth="3.5" />
        <path d="M54 62 l12 -6 M54 78 l12 -6 M54 94 l12 -6 M54 110 l12 -6" stroke={INK} strokeWidth="2.5" />
        <rect x="18" y="12" width="84" height="40" rx="18" fill="#ff3ea5" stroke={INK} strokeWidth="4" />
        <rect x="26" y="17" width="68" height="9" rx="4.5" fill="#fff" opacity="0.45" />
        <rect x="10" y="16" width="14" height="32" rx="6" fill="#ffd23f" stroke={INK} strokeWidth="3.5" />
        <rect x="96" y="16" width="14" height="32" rx="6" fill="#ffd23f" stroke={INK} strokeWidth="3.5" />
        <path d="M58 26 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#fff" />
      </g>
    </svg>
  )
}

/** Ground shockwave crest, travelling right. viewBox 80×60, sits on the floor. */
export function Shockwave({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 60" width="100%" height="100%" aria-hidden="true" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="tg-wave-g" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#8b4dff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#8b4dff" />
          <stop offset="1" stopColor="#ff3ea5" />
        </linearGradient>
      </defs>
      <path d="M-30 60 C 10 58 30 40 46 14 C 52 4 60 0 66 6 C 74 16 76 40 80 60 Z" fill="url(#tg-wave-g)" />
      <path d="M8 60 C 30 56 40 36 50 16 C 56 6 63 4 67 10 C 73 22 75 42 78 60" fill="none" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M52 22 C 56 14 60 12 63 16" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <rect x="58" y="-6" width="9" height="9" rx="2" fill="#c9b3ff" stroke={INK} strokeWidth="2.5" transform="rotate(20 62 -2)" />
      <rect x="40" y="2" width="7" height="7" rx="2" fill="#c9b3ff" stroke={INK} strokeWidth="2.5" transform="rotate(-25 43 5)" />
      <rect x="72" y="8" width="6" height="6" rx="1.5" fill="#ffd23f" stroke={INK} strokeWidth="2" />
    </svg>
  )
}

type Rows = Array<Array<[number, number]>>
const rowsPath = (rows: Rows, y0 = 0) =>
  rows.map((spans, i) => spans.map(([a, b]) => `M${a} ${i + y0}h${b - a + 1}v1h-${b - a + 1}z`).join('')).join('')
const HEART_OUTLINE = rowsPath([[[2, 3], [5, 6]], [[1, 7]], [[0, 8]], [[0, 8]], [[1, 7]], [[2, 6]], [[3, 5]], [[4, 4]]])
const HEART_FILL = rowsPath([[[2, 3], [5, 6]], [[1, 7]], [[1, 7]], [[2, 6]], [[3, 5]], [[4, 4]]], 1)

/** Chunky pixel heart for the HUD. */
export function PixelHeart({ full, className }: { full: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 9 8" width="100%" height="100%" shapeRendering="crispEdges" aria-hidden="true">
      <path d={HEART_OUTLINE} fill={INK} />
      <path d={HEART_FILL} fill={full ? '#ff3ea5' : '#2a1158'} />
      {full && <path d="M2 2h1v1H2z" fill="#fff" />}
    </svg>
  )
}
