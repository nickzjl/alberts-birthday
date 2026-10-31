import { anim, play, spawn } from '../fx'
import { INK, type PokeCtx, type StickerDef } from './types'

function Cd({ cx, cy, r, cls, grad }: { cx: number; cy: number; r: number; cls: string; grad: string }) {
  return (
    <g className={`rec-cd ${cls}`}>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${grad})`} stroke={INK} strokeWidth="4" />
      <path d={`M${cx} ${cy} L${cx - r * 0.55} ${cy - r * 0.83} A${r} ${r} 0 0 1 ${cx + r * 0.2} ${cy - r * 0.98} Z`} fill="#fff" opacity="0.55" />
      <path d={`M${cx} ${cy} L${cx + r * 0.6} ${cy + r * 0.8} A${r} ${r} 0 0 1 ${cx - r * 0.1} ${cy + r * 0.99} Z`} fill="#fff" opacity="0.35" />
      <circle cx={cx} cy={cy} r={r * 0.36} fill="#f3eeff" stroke={INK} strokeWidth="2" opacity="0.95" />
      <circle cx={cx} cy={cy} r={r * 0.14} fill="#2a1158" stroke={INK} strokeWidth="2" />
    </g>
  )
}

function RecordsArt() {
  return (
    <svg viewBox="0 0 200 200" className="stk-svg" aria-hidden="true">
      <defs>
        <linearGradient id="rc-iri-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d6f7ff" />
          <stop offset="0.3" stopColor="#f1d2ff" />
          <stop offset="0.55" stopColor="#d4ffe8" />
          <stop offset="0.8" stopColor="#fff0c4" />
          <stop offset="1" stopColor="#dccfff" />
        </linearGradient>
        <linearGradient id="rc-iri-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe0f0" />
          <stop offset="0.4" stopColor="#d8ecff" />
          <stop offset="0.7" stopColor="#e9ffd2" />
          <stop offset="1" stopColor="#f6d9ff" />
        </linearGradient>
      </defs>
      <Cd cx={104} cy={50} r={44} cls="rec-cd--b" grad="rc-iri-b" />
      <Cd cx={62} cy={72} r={50} cls="rec-cd--a" grad="rc-iri-a" />
      <g className="rec-vinyl">
        <circle cx="120" cy="122" r="74" fill="#17111f" stroke={INK} strokeWidth="4" />
        {[66, 58, 50, 42, 36].map((r) => (
          <circle key={r} cx="120" cy="122" r={r} fill="none" stroke="#3a2f4f" strokeWidth="1.5" />
        ))}
        <path d="M66 98 A60 60 0 0 1 104 64" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.3" />
        <path d="M176 142 A60 60 0 0 1 150 176" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.2" />
        <circle cx="120" cy="122" r="27" fill="#ff3ea5" stroke={INK} strokeWidth="3" />
        <path d="M95 122 A25 25 0 0 1 145 122 Z" fill="#ff76c0" />
        <text x="120" y="117" textAnchor="middle" className="stk-font" fontSize="6.8" fill="#fff" letterSpacing="0.5">
          ALBERT'S
        </text>
        <text x="120" y="134" textAnchor="middle" className="stk-font" fontSize="7.4" fill={INK}>
          BANGERS
        </text>
        <circle cx="120" cy="122" r="3.4" fill={INK} />
        <path d="M106 108 l2 -4 l2 4 l-4 -2.5 h4 z" fill="#ffd23f" />
      </g>
    </svg>
  )
}

function poke({ svg, act, fx, timers, reduced }: PokeCtx) {
  play('scratchSpin')
  const vinyl = svg.querySelector('.rec-vinyl')
  const a = svg.querySelector('.rec-cd--a')
  const b = svg.querySelector('.rec-cd--b')
  const turns = reduced ? 180 : 1080
  anim(vinyl, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${turns}deg)` }], { duration: 900, easing: 'cubic-bezier(.15,.75,.35,1)' })
  anim(a, [{ transform: 'translate(0,0) rotate(0)' }, { transform: 'translate(-14%,-10%) rotate(-400deg)', offset: 0.55 }, { transform: 'translate(0,0) rotate(-720deg)' }], { duration: 1000, easing: 'ease-in-out' })
  anim(b, [{ transform: 'translate(0,0) rotate(0)' }, { transform: 'translate(12%,-16%) rotate(380deg)', offset: 0.55 }, { transform: 'translate(0,0) rotate(720deg)' }], { duration: 1050, easing: 'ease-in-out' })
  anim(act, [{ transform: 'rotate(0)' }, { transform: 'rotate(-8deg) scale(1.06)', offset: 0.3 }, { transform: 'rotate(0) scale(1)' }], { duration: 700, easing: 'ease-out' })

  timers.later(() => {
    play('recordScratch')
    anim(vinyl, [{ transform: 'rotate(0)' }, { transform: 'rotate(-40deg)' }, { transform: 'rotate(12deg)' }, { transform: 'rotate(-28deg)' }, { transform: 'rotate(0)' }], { duration: 420, easing: 'ease-in-out' })
    anim(act, [{ transform: 'translateX(0)' }, { transform: 'translateX(-5%) rotate(-3deg)' }, { transform: 'translateX(4%) rotate(2deg)' }, { transform: 'translateX(0)' }], { duration: 380 })
    const w = fx.clientWidth
    spawn(fx, {
      className: 'lfx-scribble',
      text: 'wikka wikka',
      fit: true,
      x: w * 0.5,
      y: fx.clientHeight * 0.05,
      style: { 'font-size': `${Math.max(14, w * 0.17)}px` },
      keyframes: [
        { transform: 'translate(-50%,-50%) scale(0.4) rotate(-14deg)', opacity: 0 },
        { transform: 'translate(-50%,-80%) scale(1.1) rotate(-8deg)', opacity: 1, offset: 0.2 },
        { transform: 'translate(-50%,-120%) scale(1) rotate(-8deg)', opacity: 1, offset: 0.75 },
        { transform: 'translate(-50%,-150%) scale(0.95) rotate(-8deg)', opacity: 0 },
      ],
      duration: 1200,
    })
  }, 900)
}

export const recordsSticker: StickerDef = {
  id: 'records',
  label: 'Vinyl record and CDs',
  aspect: 1,
  depth: 0.9,
  Art: RecordsArt,
  poke,
}
