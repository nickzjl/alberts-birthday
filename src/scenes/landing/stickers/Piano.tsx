import { anim, PHRASES, pick, play, playPhrase, rand, relBox, spawn } from '../fx'
import { INK, type PokeCtx, type StickerDef } from './types'

const WHITE = [67, 69, 71, 72, 74, 76, 77, 79] // G4 … G5 — covers the whole melody
const BLACK: Array<[midi: number, after: number]> = [
  [68, 0],
  [70, 1],
  [73, 3],
  [75, 4],
  [78, 6],
]
const KX = 26
const KW = 21
const BEAT = 0.3

function PianoArt() {
  return (
    <svg viewBox="0 0 220 180" className="stk-svg" aria-hidden="true">
      <defs>
        <linearGradient id="pk-case" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2b52" />
          <stop offset="1" stopColor="#140c1f" />
        </linearGradient>
      </defs>
      {/* raised lid + prop stick */}
      <g className="pk-lid">
        <path d="M24 78 C60 52 120 26 194 6 L204 78 Z" fill="#1d1429" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M44 68 C80 48 130 28 186 14" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.25" />
        <path d="M150 78 L163 34" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        <path d="M150 78 L163 34" stroke="#e7c76a" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M120 78 C150 70 176 52 194 22 L198 78 Z" fill="#e7c76a" opacity="0.18" />
      </g>
      {/* sheet music */}
      <g transform="rotate(-4 106 66)">
        <rect x="86" y="52" width="40" height="27" rx="2" fill="#fffaf0" stroke={INK} strokeWidth="2.4" />
        <path d="M90 60 H122 M90 65 H122 M90 70 H122" stroke="#b9a7e6" strokeWidth="1" />
        <circle cx="96" cy="66" r="2.4" fill={INK} />
        <circle cx="106" cy="62" r="2.4" fill={INK} />
        <circle cx="116" cy="68" r="2.4" fill={INK} />
      </g>
      {/* case */}
      <rect x="12" y="76" width="196" height="32" rx="10" fill="url(#pk-case)" stroke={INK} strokeWidth="4.5" />
      <path d="M24 86 H196" stroke="#e7c76a" strokeWidth="1.8" opacity="0.9" />
      <text x="110" y="100" textAnchor="middle" className="stk-font" fontSize="7" fill="#e7c76a" letterSpacing="2.4">
        ALBERTWAY &amp; SONS
      </text>
      {/* legs + lyre */}
      <path d="M30 130 L42 130 L40 164 L33 164 Z" fill="#1d1429" stroke={INK} strokeWidth="3.4" strokeLinejoin="round" />
      <path d="M178 130 L190 130 L187 164 L180 164 Z" fill="#1d1429" stroke={INK} strokeWidth="3.4" strokeLinejoin="round" />
      <circle cx="36.5" cy="168" r="4.2" fill="#e7c76a" stroke={INK} strokeWidth="2" />
      <circle cx="183.5" cy="168" r="4.2" fill="#e7c76a" stroke={INK} strokeWidth="2" />
      <path d="M103 132 H117 L115 156 H105 Z" fill="#1d1429" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <rect x="99" y="157" width="22" height="5" rx="2" fill="#e7c76a" stroke={INK} strokeWidth="1.8" />
      {/* keyboard */}
      <rect x="18" y="102" width="184" height="34" rx="5" fill={INK} />
      {WHITE.map((m, i) => (
        <g key={m}>
          <rect x={KX + i * KW} y="105" width={KW} height="28" rx="2.5" fill="#fffaf2" stroke={INK} strokeWidth="1.8" />
          <rect className="pk-hl" data-m={m} x={KX + i * KW + 1.5} y="106.5" width={KW - 3} height="25" rx="2" fill="#c8ff2e" opacity="0" />
        </g>
      ))}
      {BLACK.map(([m, after]) => (
        <rect key={m} x={KX + (after + 1) * KW - 6} y="105" width="12" height="17" rx="2" fill="#1d1429" stroke={INK} strokeWidth="1.4" />
      ))}
    </svg>
  )
}

const NOTE_COLORS = ['#c8ff2e', '#38e8ff', '#ff3ea5', '#ffd23f', '#e9e0ff']
const note = (c: string, double: boolean) =>
  double
    ? `<svg viewBox="0 0 34 32" width="100%" height="100%"><path d="M10 25 V5 L30 1 V21" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M10 5 L30 1 V7 L10 11 Z" fill="${INK}"/><ellipse cx="6.5" cy="25.5" rx="6" ry="4.6" transform="rotate(-20 6.5 25.5)" fill="${c}" stroke="${INK}" stroke-width="2.4"/><ellipse cx="26.5" cy="21.5" rx="6" ry="4.6" transform="rotate(-20 26.5 21.5)" fill="${c}" stroke="${INK}" stroke-width="2.4"/></svg>`
    : `<svg viewBox="0 0 24 32" width="100%" height="100%"><path d="M11 25 V3 C14 7 21 8 19 16" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="7" cy="25.5" rx="6.4" ry="4.8" transform="rotate(-20 7 25.5)" fill="${c}" stroke="${INK}" stroke-width="2.4"/></svg>`

function poke({ svg, act, fx, stage, mem, timers, reduced }: PokeCtx) {
  const now = performance.now()
  if ((mem.busy ?? 0) > now) {
    play('squeak', { volume: 0.4, pitch: 1.3 })
    anim(act, [{ transform: 'rotate(0)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(0)' }], { duration: 260 })
    return
  }
  const i = mem.i ?? 0
  mem.i = i + 1
  const dur = playPhrase(i, BEAT)
  mem.busy = now + dur * 1000 - 120
  const w = fx.clientWidth
  const lid = svg.querySelector('.pk-lid')

  for (const [m, st, len] of PHRASES[i % 4]) {
    timers.later(() => {
      const hl = svg.querySelector(`.pk-hl[data-m="${m}"]`)
      anim(hl, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: len * BEAT * 1000 + 160 })
      anim(lid, [{ transform: 'rotate(0)' }, { transform: 'rotate(-2.5deg)' }, { transform: 'rotate(0)' }], { duration: 220, easing: 'ease-out' })
      if (!hl) return
      const k = relBox(hl, fx)
      const s = w * rand(0.2, 0.28)
      const drift = rand(-0.35, 0.35) * w
      spawn(fx, {
        className: 'lfx-note',
        html: note(pick(NOTE_COLORS), Math.random() < 0.35),
        x: k.cx,
        y: k.y,
        style: { width: `${s}px`, height: `${s}px` },
        keyframes: [
          { transform: 'translate(-50%,-50%) scale(0.2) rotate(0deg)', opacity: 0 },
          { transform: `translate(-50%,-50%) translate(${drift * 0.3}px, ${-w * 0.35}px) scale(1.1) rotate(-12deg)`, opacity: 1, offset: 0.25 },
          { transform: `translate(-50%,-50%) translate(${drift}px, ${-w * (reduced ? 0.5 : 0.95)}px) scale(0.9) rotate(14deg)`, opacity: 0 },
        ],
        duration: 1300,
        easing: 'cubic-bezier(.2,.6,.4,1)',
      })
    }, st * BEAT * 1000)
  }

  // the last phrase gets a little encore
  if (i % 4 === 3) {
    timers.later(() => {
      const root = stage.root()
      if (!root) return
      const b = relBox(fx, root)
      stage.confetti(b.cx / root.clientWidth, b.y / root.clientHeight, 60)
      play('partyHorn', { volume: 0.7 })
      spawn(fx, {
        className: 'lfx-pop lfx-pop--hot',
        text: 'ENCORE!!',
        fit: true,
        x: w / 2,
        y: 0,
        style: { 'font-size': `${Math.max(16, w * 0.16)}px` },
        keyframes: [
          { transform: 'translate(-50%,-50%) scale(0.3) rotate(8deg)', opacity: 0 },
          { transform: 'translate(-50%,-90%) scale(1.15) rotate(4deg)', opacity: 1, offset: 0.2 },
          { transform: 'translate(-50%,-140%) scale(1) rotate(4deg)', opacity: 1, offset: 0.8 },
          { transform: 'translate(-50%,-170%) scale(0.9)', opacity: 0 },
        ],
        duration: 1500,
      })
    }, dur * 1000 - 200)
  }
}

export const pianoSticker: StickerDef = {
  id: 'piano',
  label: 'Grand piano that plays Happy Birthday',
  aspect: 220 / 180,
  depth: 1.1,
  Art: PianoArt,
  poke,
}
