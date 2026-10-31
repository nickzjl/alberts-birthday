import { anim, play, spawn } from '../fx'
import { CanShell } from './CanShell'
import { INK, type PokeCtx, type StickerDef } from './types'

const VEINS = [
  'M22 46 q7 8 2 16 q-4 8 4 15 q6 6 1 13',
  'M99 112 q-8 6 -3 14 q5 8 -3 15 q-5 6 0 13',
  'M24 146 q9 4 6 13 q-2 8 7 13',
  'M95 44 q-7 7 -2 13 q4 7 -3 13',
  'M58 112 q-6 6 0 12 q5 5 -1 11',
]

function GorillaCanArt() {
  return (
    <svg viewBox="0 0 120 220" className="stk-svg" aria-hidden="true">
      <defs>
        <linearGradient id="gm-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c2238" />
          <stop offset="1" stopColor="#120c1a" />
        </linearGradient>
      </defs>
      <CanShell id="gm" body="url(#gm-body)" rim="#cfc9dc">
        <rect x="12" y="36" width="96" height="10" fill="#ff8a2b" />
        <rect x="12" y="186" width="96" height="10" fill="#ff8a2b" />
        {/* emblem */}
        <circle cx="60" cy="84" r="29" fill="#ff8a2b" stroke={INK} strokeWidth="3.5" />
        <circle cx="60" cy="84" r="23" fill="none" stroke={INK} strokeWidth="1.6" strokeDasharray="3 3" opacity="0.5" />
        {/* gorilla head */}
        <path d="M40 94 C35 78 40 63 51 59 C55 55 65 55 69 59 C80 63 85 78 80 94 C76 106 44 106 40 94 Z" fill="#4a3d5c" stroke={INK} strokeWidth="2.6" />
        <path d="M45 74 Q60 64 75 74 Q60 70 45 74 Z" fill={INK} />
        <path d="M48 80 C48 73 72 73 72 80 C74 91 67 100 60 100 C53 100 46 91 48 80 Z" fill="#b7a5c9" stroke={INK} strokeWidth="2.2" />
        <circle cx="54" cy="78.5" r="2.4" fill="#fff" />
        <circle cx="66" cy="78.5" r="2.4" fill="#fff" />
        <circle cx="54.4" cy="78.8" r="1.2" fill={INK} />
        <circle cx="66.4" cy="78.8" r="1.2" fill={INK} />
        <g className="gm-eyes" opacity="0">
          <circle cx="54" cy="78.5" r="3.2" fill="#ff2d55" />
          <circle cx="66" cy="78.5" r="3.2" fill="#ff2d55" />
        </g>
        <ellipse cx="57" cy="87.5" rx="1.9" ry="1.3" fill={INK} />
        <ellipse cx="63" cy="87.5" rx="1.9" ry="1.3" fill={INK} />
        <path d="M54 93.5 Q60 97 66 93.5" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* wordmark */}
        <text x="60" y="137" textAnchor="middle" className="stk-font" fontSize="15.5" fill="#fff" letterSpacing="0.3">
          GORILLA
        </text>
        <text x="60" y="164" textAnchor="middle" className="stk-font" fontSize="25" fill="#ff8a2b" stroke={INK} strokeWidth="1.2" paintOrder="stroke">
          MIND
        </text>
        <text x="60" y="178" textAnchor="middle" className="stk-font" fontSize="7.6" fill="#c9b3ff" letterSpacing="2.2">
          ENERGY
        </text>
      </CanShell>
      {/* veins (hidden until poked) */}
      <g className="gm-veins">
        {VEINS.map((d, i) => (
          <g key={i}>
            <path className="gm-vein" d={d} stroke={INK} strokeWidth="6" fill="none" strokeLinecap="round" />
            <path className="gm-vein" d={d} stroke="#ff3b6b" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        ))}
      </g>
    </svg>
  )
}

function poke({ svg, act, fx, stage, reduced }: PokeCtx) {
  play('roar')
  play('heartbeat', { delay: 0.05, volume: 0.6 })

  anim(
    act,
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.16, 1.12)', offset: 0.14 },
      { transform: 'scale(0.98)', offset: 0.3 },
      { transform: 'scale(1.12, 1.09)', offset: 0.46 },
      { transform: 'scale(0.99)', offset: 0.62 },
      { transform: 'scale(1.07)', offset: 0.78 },
      { transform: 'scale(1)' },
    ],
    { duration: 1000, easing: 'ease-in-out' },
  )
  svg.querySelectorAll('.gm-vein').forEach((v, i) => {
    v.animate(
      [
        { strokeDashoffset: 60, opacity: 1 },
        { strokeDashoffset: 0, opacity: 1, offset: 0.25 },
        { strokeDashoffset: 0, opacity: 1, offset: 0.8 },
        { strokeDashoffset: 0, opacity: 0 },
      ],
      { duration: 1500, delay: Math.floor(i / 2) * 70, easing: 'ease-out', fill: 'backwards' },
    )
  })
  anim(svg.querySelector('.gm-eyes'), [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 1400 })

  const w = fx.clientWidth
  const h = fx.clientHeight
  spawn(fx, {
    className: 'lfx-pop',
    text: '+100 FOCUS',
    fit: true,
    x: w / 2,
    y: h * 0.12,
    style: { 'font-size': `${Math.max(16, w * 0.24)}px` },
    keyframes: [
      { transform: 'translate(-50%,-50%) scale(0.3) rotate(-10deg)', opacity: 0 },
      { transform: `translate(-50%,-50%) translateY(${-h * 0.18}px) scale(1.2) rotate(-6deg)`, opacity: 1, offset: 0.2 },
      { transform: `translate(-50%,-50%) translateY(${-h * 0.32}px) scale(1) rotate(-4deg)`, opacity: 1, offset: 0.75 },
      { transform: `translate(-50%,-50%) translateY(${-h * 0.42}px) scale(0.9) rotate(-4deg)`, opacity: 0 },
    ],
    duration: 1500,
    easing: 'cubic-bezier(.2,.8,.3,1)',
  })
  if (!reduced) stage.shake({ strength: 'small', duration: 0.5 })
}

export const gorillaSticker: StickerDef = {
  id: 'gorilla',
  label: 'Gorilla Mind energy drink can',
  aspect: 120 / 220,
  depth: 1,
  Art: GorillaCanArt,
  poke,
}
