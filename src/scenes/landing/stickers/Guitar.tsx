import { anim, play, rand, spawn } from '../fx'
import { INK, type PokeCtx, type StickerDef } from './types'

const BODY =
  'M40 152 C34 140 20 140 18 154 C16 168 26 176 24 190 C22 204 8 212 12 230 C16 250 38 256 60 254 C82 256 104 250 108 230 C112 212 98 204 96 190 C94 176 104 168 102 154 C100 140 86 140 80 152 C76 160 70 163 60 163 C50 163 44 160 40 152 Z'
const GUARD =
  'M46 163 C52 167 68 167 74 163 C80 171 86 179 84 191 C82 206 92 214 88 228 C84 240 70 244 58 242 C46 240 34 236 34 226 C34 214 42 206 40 193 C38 181 41 171 46 163 Z'
const FRETS = [44, 56, 67, 78, 88, 98, 107, 116, 124, 132, 140, 147, 154]

function GuitarArt() {
  return (
    <svg viewBox="0 0 120 260" className="stk-svg" aria-hidden="true">
      <defs>
        <linearGradient id="gt-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7ccb" />
          <stop offset="0.55" stopColor="#ff3ea5" />
          <stop offset="1" stopColor="#c8177a" />
        </linearGradient>
      </defs>
      {/* neck */}
      <rect x="51.5" y="30" width="17" height="140" rx="2" fill="#f1c27d" stroke={INK} strokeWidth="3.5" />
      <rect x="54" y="32" width="12" height="134" fill="#6b3b28" />
      {FRETS.map((y) => (
        <path key={y} d={`M54 ${y} H66`} stroke="#efe6ff" strokeWidth="1.4" />
      ))}
      {[61.5, 83, 102.5, 136].map((y) => (
        <circle key={y} cx="60" cy={y} r="1.9" fill="#fff" />
      ))}
      {/* headstock */}
      <path d="M52 34 C47 26 45 14 49 6 C52 0 68 0 71 6 C75 14 73 26 68 34 Z" fill="url(#gt-body)" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      {[10, 18, 26].map((y) => (
        <g key={y}>
          <path d={`M44 ${y} H50 M70 ${y} H76`} stroke={INK} strokeWidth="2.4" />
          <circle cx="42.5" cy={y} r="3.4" fill="#ece8f6" stroke={INK} strokeWidth="2" />
          <circle cx="77.5" cy={y} r="3.4" fill="#ece8f6" stroke={INK} strokeWidth="2" />
        </g>
      ))}
      {/* body */}
      <path d={BODY} fill="url(#gt-body)" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M26 162 C22 172 30 180 28 192" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d={GUARD} fill="#fff" stroke={INK} strokeWidth="2.6" />
      {/* lightning decal */}
      <path d="M42 226 L36 238 L41 238 L38 247 L47 233 L42 233 L45 226 Z" fill="#ffd23f" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      {/* pickups */}
      {[177, 195, 211].map((y, i) => (
        <rect key={y} x="47" y={y} width="26" height="7.5" rx="3.5" fill={INK} transform={i === 2 ? `rotate(-8 60 ${y + 4})` : undefined} />
      ))}
      <rect x="45" y="225" width="30" height="8" rx="2" fill="#cfcadb" stroke={INK} strokeWidth="2" />
      <circle cx="81" cy="219" r="4.6" fill="#f2f0f7" stroke={INK} strokeWidth="2" />
      <circle cx="84" cy="232" r="4.6" fill="#f2f0f7" stroke={INK} strokeWidth="2" />
      {/* strings */}
      <g className="gt-strings" stroke="#f6f1ff" strokeWidth="0.9">
        {[56.2, 58.8, 61.2, 63.8].map((x) => (
          <path key={x} d={`M${x} 8 V229`} />
        ))}
      </g>
    </svg>
  )
}

const BOLT = `<svg viewBox="0 0 26 44" width="100%" height="100%"><path d="M16 1 L3 24 L12 24 L7 43 L24 15 L14 15 L20 1 Z" fill="#ffd23f" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/></svg>`

function bolts(fx: HTMLElement, delay: number, n: number) {
  const w = fx.clientWidth
  const h = fx.clientHeight
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1
    const x = w / 2 + side * w * rand(0.7, 1.3)
    const y = h * rand(0.1, 0.75)
    const s = w * rand(0.5, 0.75)
    spawn(fx, {
      className: 'lfx-bolt',
      html: BOLT,
      x,
      y,
      style: { width: `${s}px`, height: `${s * 1.7}px` },
      keyframes: [
        { transform: `translate(-50%,-50%) rotate(${side * 18}deg) scale(0.3)`, opacity: 0 },
        { transform: `translate(-50%,-50%) rotate(${side * 18}deg) scale(1.15)`, opacity: 1, offset: 0.12 },
        { opacity: 0.25, offset: 0.24 },
        { transform: `translate(-50%,-50%) rotate(${side * 14}deg) scale(1)`, opacity: 1, offset: 0.36 },
        { opacity: 0.5, offset: 0.5 },
        { transform: `translate(-50%,-50%) rotate(${side * 12}deg) scale(0.95)`, opacity: 1, offset: 0.7 },
        { transform: `translate(-50%,-50%) rotate(${side * 10}deg) scale(0.6)`, opacity: 0 },
      ],
      duration: 650,
      easing: 'linear',
      delay: delay + i * 70,
    })
  }
}

function poke({ svg, act, fx, stage, reduced }: PokeCtx) {
  play('guitar')
  anim(
    act,
    [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(-16deg) translateY(2%)', offset: 0.14 },
      { transform: 'rotate(12deg)', offset: 0.3 },
      { transform: 'rotate(-14deg) translateY(2%)', offset: 0.46 },
      { transform: 'rotate(10deg)', offset: 0.62 },
      { transform: 'rotate(-6deg)', offset: 0.8 },
      { transform: 'rotate(0deg)' },
    ],
    { duration: 1100, easing: 'ease-in-out' },
  )
  anim(svg.querySelector('.gt-strings'), [{ transform: 'translateX(0)' }, { transform: 'translateX(0.9px)' }, { transform: 'translateX(-0.9px)' }, { transform: 'translateX(0)' }], { duration: 70, iterations: 18 })
  bolts(fx, 0, reduced ? 2 : 4)
  if (!reduced) bolts(fx, 280, 4)
  stage.shake({ strength: 'tiny', duration: 0.35 })
}

export const guitarSticker: StickerDef = {
  id: 'guitar',
  label: 'Electric guitar',
  aspect: 120 / 260,
  depth: 0.7,
  Art: GuitarArt,
  poke,
}
