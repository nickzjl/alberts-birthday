import { anim, play, relBox } from '../fx'
import { INK, type PokeCtx, type StickerDef } from './types'

const POUCH = 'M24 32 H146 C150 86 155 140 158 190 C130 201 40 201 12 190 C15 140 20 86 24 32 Z'

const ZIG = (() => {
  let d = 'M22 36 V15'
  for (let x = 22; x < 148; x += 7) d += ` L${x + 3.5} 9 L${Math.min(148, x + 7)} 15`
  return `${d} V36 Z`
})()

type Kind = 'dark' | 'white' | 'blue'
const WINDOW_BERRIES: Array<[number, number, number, Kind]> = [
  [52, 168, 12, 'dark'],
  [74, 172, 12, 'white'],
  [98, 170, 12, 'dark'],
  [121, 166, 11, 'blue'],
  [62, 148, 11.5, 'white'],
  [86, 150, 12.5, 'dark'],
  [110, 147, 11.5, 'white'],
  [44, 145, 10, 'blue'],
  [130, 145, 10, 'dark'],
  [74, 131, 10.5, 'dark'],
  [98, 130, 10.5, 'blue'],
]

function Berry({ x, y, r, kind }: { x: number; y: number; r: number; kind: Kind }) {
  const fill = kind === 'dark' ? '#3d2318' : kind === 'white' ? '#fff3e0' : '#4f5fd8'
  const hl = kind === 'dark' ? '#8a5a42' : kind === 'white' ? '#ffffff' : '#9aa6ff'
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={fill} stroke={INK} strokeWidth="2.2" />
      {kind === 'white' && <path d={`M${x - r * 0.7} ${y + r * 0.35} A${r} ${r} 0 0 0 ${x + r * 0.75} ${y + r * 0.3}`} stroke="#e2c9a6" strokeWidth="2.2" fill="none" />}
      {kind === 'blue' && <path d={`M${x - 2.5} ${y - r + 2.5} l2.5 2.5 l2.5 -2.5`} stroke="#252f86" strokeWidth="1.6" fill="none" strokeLinecap="round" />}
      <ellipse cx={x - r * 0.35} cy={y - r * 0.38} rx={r * 0.32} ry={r * 0.2} fill={hl} opacity="0.9" transform={`rotate(-30 ${x - r * 0.35} ${y - r * 0.38})`} />
    </g>
  )
}

function TruFruArt() {
  return (
    <svg viewBox="0 0 170 210" className="stk-svg" aria-hidden="true">
      <defs>
        <linearGradient id="tf-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a3fe0" />
          <stop offset="1" stopColor="#24136b" />
        </linearGradient>
        <clipPath id="tf-clip">
          <path d={POUCH} />
        </clipPath>
        <clipPath id="tf-win">
          <rect x="32" y="122" width="106" height="62" rx="26" />
        </clipPath>
      </defs>
      {/* crimped top seal */}
      <g className="tf-top">
        <path d={ZIG} fill="#7d66f5" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M26 22 H144 M26 28 H144" stroke="#fff" strokeWidth="1.4" opacity="0.35" />
        <circle cx="85" cy="22" r="4.2" fill={INK} />
      </g>
      <path d={POUCH} fill="url(#tf-body)" />
      <g clipPath="url(#tf-clip)">
        <path d="M24 32 C20 90 18 140 14 192 L40 196 C42 140 44 90 46 32 Z" fill="#fff" opacity="0.12" />
        <path d="M130 32 C134 90 138 140 142 196 L160 196 C156 140 152 90 148 32 Z" fill="#000" opacity="0.18" />
        {/* logo */}
        <g transform="rotate(-7 85 82)">
          <text x="87" y="77" textAnchor="middle" className="stk-font" fontSize="33" fill="#ff3ea5" stroke={INK} strokeWidth="3" paintOrder="stroke">
            TRU
          </text>
          <text x="85" y="74" textAnchor="middle" className="stk-font" fontSize="33" fill="#fff" stroke={INK} strokeWidth="3" paintOrder="stroke">
            TRU
          </text>
          <text x="87" y="108" textAnchor="middle" className="stk-font" fontSize="33" fill="#ff3ea5" stroke={INK} strokeWidth="3" paintOrder="stroke">
            FRU
          </text>
          <text x="85" y="105" textAnchor="middle" className="stk-font" fontSize="33" fill="#fff" stroke={INK} strokeWidth="3" paintOrder="stroke">
            FRU
          </text>
        </g>
        {/* frozen badge */}
        <g transform="rotate(14 134 52)">
          <circle cx="134" cy="52" r="13" fill="#38e8ff" stroke={INK} strokeWidth="2.6" />
          <g stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M134 44 V60 M127 48 L141 56 M127 56 L141 48" />
          </g>
        </g>
        <text x="85" y="118" textAnchor="middle" className="stk-font" fontSize="7.2" fill="#e9e0ff" letterSpacing="1.4">
          DARK CHOCOLATE
        </text>
        {/* window */}
        <rect x="32" y="122" width="106" height="62" rx="26" fill="#140a33" />
        <g clipPath="url(#tf-win)">
          {WINDOW_BERRIES.map(([x, y, r, k], i) => (
            <Berry key={i} x={x} y={y} r={r} kind={k} />
          ))}
        </g>
        <rect x="32" y="122" width="106" height="62" rx="26" fill="none" stroke="#fff" strokeWidth="3" />
        <path d="M44 132 Q56 126 70 127" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
      </g>
      <path d={POUCH} fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      {/* spilled berries */}
      <Berry x={150} y={192} r={11} kind="dark" />
      <Berry x={131} y={199} r={9.5} kind="white" />
    </svg>
  )
}

function poke({ svg, stage, slot, reduced }: PokeCtx) {
  play('pop')
  play('chomp', { delay: 0.04, volume: 0.6 })
  anim(svg.querySelector('.tf-top'), [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-14%) rotate(-7deg)', offset: 0.3 }, { transform: 'translateY(0) rotate(0)' }], { duration: 500, easing: 'cubic-bezier(.3,1.6,.5,1)' })
  const root = stage.root()
  if (!root) return
  const top = relBox(svg.querySelector('.tf-top') ?? slot, root)
  stage.berries(top.cx, top.cy, reduced ? 5 : 16, Math.max(18, top.w * 0.25))
}

export const truFruSticker: StickerDef = {
  id: 'trufru',
  label: 'Tru Fru frozen chocolate blueberries',
  aspect: 170 / 210,
  depth: 1.4,
  Art: TruFruArt,
  poke,
}
