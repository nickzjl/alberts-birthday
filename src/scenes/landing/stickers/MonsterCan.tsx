import { anim, play, rand, relBox, spawn } from '../fx'
import { CanShell } from './CanShell'
import { INK, type PokeCtx, type StickerDef } from './types'

// three jagged claw slashes
const CLAWS = [
  'M37 62 L44 60 L44 77 L49 84 L46 101 L50 107 L45 127 L42 138 L39 119 L34 111 L37 94 L32 86 L36 72 Z',
  'M57 56 L64 56 L63 73 L68 80 L64 98 L69 104 L63 129 L60 142 L57 121 L52 113 L56 96 L51 88 L55 72 Z',
  'M77 60 L84 62 L83 79 L88 86 L84 104 L88 110 L82 130 L79 138 L77 119 L72 111 L76 95 L71 87 L75 72 Z',
]

function MonsterCanArt() {
  return (
    <svg viewBox="0 0 120 220" className="stk-svg" aria-hidden="true">
      <defs>
        <linearGradient id="wm-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#f3f1f9" />
          <stop offset="1" stopColor="#d9d5e6" />
        </linearGradient>
      </defs>
      <CanShell id="wm" body="url(#wm-body)" rim="#d4d0de">
        <rect x="12" y="38" width="96" height="3" fill="#b8c3d3" />
        <text x="60" y="52" textAnchor="middle" className="stk-font" fontSize="7" fill="#9aa3b5" letterSpacing="3.2">
          ULTRA
        </text>
        {CLAWS.map((d, i) => (
          <path key={i} d={d} fill="#c5d4e4" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
        ))}
        <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
          <path d="M40 66 L40 80" />
          <path d="M60 60 L59 76" />
          <path d="M80 65 L79 81" />
        </g>
        <text x="60" y="162" textAnchor="middle" className="stk-font" fontSize="13.6" fill={INK} letterSpacing="0.2">
          MONSTER
        </text>
        <text x="60" y="176" textAnchor="middle" className="stk-font" fontSize="7" fill="#8a93a6" letterSpacing="2.6">
          ZERO SUGAR
        </text>
        <rect x="12" y="186" width="96" height="3" fill="#b8c3d3" />
      </CanShell>
    </svg>
  )
}

function poke({ svg, act, fx, timers, reduced }: PokeCtx) {
  play('clatter', { volume: 0.55, pitch: 1.6 })
  // the shake-up
  anim(
    act,
    [
      { transform: 'rotate(0) translateX(0)' },
      { transform: 'rotate(-10deg) translateX(-4%)' },
      { transform: 'rotate(9deg) translateX(4%)' },
      { transform: 'rotate(-11deg) translateX(-4%)' },
      { transform: 'rotate(10deg) translateX(3%)' },
      { transform: 'rotate(-7deg) translateX(-2%)' },
      { transform: 'scale(1.12, 0.9) rotate(0)', offset: 0.88 },
      { transform: 'scale(1) rotate(0)' },
    ],
    { duration: 620, easing: 'ease-in-out' },
  )

  timers.later(() => {
    play('canOpen')
    play('fizz', { volume: 1.1 })
    const tab = svg.querySelector('.can-tab')
    const hole = svg.querySelector('.can-hole')
    anim(tab, [{ transform: 'rotate(0)' }, { transform: 'rotate(-85deg) translateY(-3px)' }], { duration: 160, easing: 'ease-out', fill: 'forwards' })
    anim(hole, [{ opacity: 0 }, { opacity: 1 }], { duration: 60, fill: 'forwards' })
    timers.later(() => {
      anim(tab, [{ transform: 'rotate(-85deg) translateY(-3px)' }, { transform: 'rotate(0)' }], { duration: 300, fill: 'forwards' })
      anim(hole, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' })
    }, 2200)

    const lid = relBox(svg.querySelector('.can-lid') ?? svg, fx)
    const w = fx.clientWidth
    const n = reduced ? 10 : 38
    for (let i = 0; i < n; i++) {
      const a = rand(-140, -40) * (Math.PI / 180)
      const d = w * rand(0.7, 2.3)
      const dx = Math.cos(a) * d
      const dy = Math.sin(a) * d
      const fall = w * rand(0.4, 1.1)
      const s = w * rand(0.09, 0.24)
      spawn(fx, {
        className: 'lfx-bubble',
        x: lid.cx + rand(-6, 6),
        y: lid.cy,
        style: { width: `${s}px`, height: `${s}px` },
        keyframes: [
          { transform: 'translate(-50%,-50%) scale(0.2)', opacity: 1 },
          { transform: `translate(-50%,-50%) translate(${dx * 0.75}px, ${dy * 0.85}px) scale(1)`, opacity: 1, offset: 0.45 },
          { transform: `translate(-50%,-50%) translate(${dx}px, ${dy + fall}px) scale(0.7)`, opacity: 0 },
        ],
        duration: rand(800, 1400),
        easing: 'cubic-bezier(.15,.7,.4,1)',
        delay: rand(0, 220),
      })
    }
    // foam geyser: a column of fat white puffs
    for (let i = 0; i < (reduced ? 3 : 9); i++) {
      const up = w * (0.35 + i * 0.16)
      const s = w * rand(0.3, 0.46) * (1 - i * 0.05)
      spawn(fx, {
        className: 'lfx-puff',
        x: lid.cx + rand(-w * 0.08, w * 0.08),
        y: lid.cy,
        style: { width: `${s}px` },
        keyframes: [
          { transform: 'translate(-50%,-50%) scale(0.2)', opacity: 1 },
          { transform: `translate(-50%,-50%) translate(${rand(-8, 8)}px, ${-up}px) scale(1)`, opacity: 1, offset: 0.4 },
          { transform: `translate(-50%,-50%) translate(${rand(-20, 20)}px, ${-up * 1.15}px) scale(1.2)`, opacity: 0 },
        ],
        duration: 900,
        delay: i * 35,
        easing: 'cubic-bezier(.2,.8,.3,1)',
      })
    }
    spawn(fx, {
      className: 'lfx-scribble lfx-scribble--white',
      text: 'FSSSHH!',
      fit: true,
      x: w * 0.5,
      y: -w * 0.15,
      style: { 'font-size': `${Math.max(16, w * 0.3)}px` },
      keyframes: [
        { transform: 'translate(-50%,-50%) scale(0.3) rotate(-16deg)', opacity: 0 },
        { transform: 'translate(-50%,-90%) scale(1.15) rotate(-9deg)', opacity: 1, offset: 0.2 },
        { transform: 'translate(-50%,-130%) scale(1) rotate(-9deg)', opacity: 1, offset: 0.75 },
        { transform: 'translate(-50%,-160%) scale(0.95) rotate(-9deg)', opacity: 0 },
      ],
      duration: 1300,
    })
  }, 560)
}

export const monsterSticker: StickerDef = {
  id: 'monster',
  label: 'White Monster energy drink can',
  aspect: 120 / 220,
  depth: 0.8,
  Art: MonsterCanArt,
  poke,
  ownSquash: true,
}
