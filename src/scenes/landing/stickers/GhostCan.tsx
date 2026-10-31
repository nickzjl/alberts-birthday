import { anim, play, rand, relBox, spawn } from '../fx'
import { CanShell } from './CanShell'
import { INK, type PokeCtx, type StickerDef } from './types'

function GhostCanArt() {
  return (
    <svg viewBox="0 0 120 220" className="stk-svg" aria-hidden="true">
      <defs>
        <linearGradient id="gh-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5ff0ff" />
          <stop offset="0.5" stopColor="#8f8cff" />
          <stop offset="1" stopColor="#b24dff" />
        </linearGradient>
      </defs>
      <CanShell id="gh" body="url(#gh-body)">
        {/* sour-candy dots */}
        <g fill="#fff" opacity="0.35">
          <circle cx="92" cy="54" r="5" />
          <circle cx="24" cy="128" r="4" />
          <circle cx="96" cy="140" r="3" />
          <circle cx="30" cy="58" r="2.5" />
        </g>
        {/* ghost logo */}
        <path
          d="M37 108 V80 C37 65 47 56 60 56 C73 56 83 65 83 80 V108 L75.5 101 L68 108 L60 101 L52 108 L44.5 101 Z"
          fill="#fff"
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <ellipse cx="51.5" cy="80" rx="4" ry="5.6" fill={INK} />
        <ellipse cx="68.5" cy="80" rx="4" ry="5.6" fill={INK} />
        <circle cx="53" cy="78" r="1.3" fill="#fff" />
        <circle cx="70" cy="78" r="1.3" fill="#fff" />
        {/* wordmark */}
        <rect x="12" y="122" width="96" height="30" fill={INK} />
        <text x="60" y="146" textAnchor="middle" className="stk-font" fontSize="20" fill="#fff" letterSpacing="0.5">
          GHOST
        </text>
        <rect x="34" y="160" width="52" height="15" rx="7.5" fill="#fff" stroke={INK} strokeWidth="2.5" />
        <text x="60" y="171.2" textAnchor="middle" className="stk-font" fontSize="8.4" fill={INK} letterSpacing="1">
          ENERGY
        </text>
      </CanShell>
    </svg>
  )
}

const GHOST_SVG = `<svg viewBox="0 0 48 56" width="100%" height="100%"><path d="M5 52 V24 C5 11 14 3 24 3 C34 3 43 11 43 24 V52 L36.5 46 L30 52 L24 46 L18 52 L11.5 46 Z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="17" cy="23" rx="3.6" ry="5" fill="${INK}"/><ellipse cx="31" cy="23" rx="3.6" ry="5" fill="${INK}"/><circle cx="18.3" cy="21" r="1.3" fill="#fff"/><circle cx="32.3" cy="21" r="1.3" fill="#fff"/><ellipse cx="11.5" cy="31" rx="3.6" ry="2.2" fill="#ff8fc8"/><ellipse cx="36.5" cy="31" rx="3.6" ry="2.2" fill="#ff8fc8"/><ellipse cx="24" cy="34" rx="3.2" ry="4" fill="${INK}"/></svg>`

function poke({ svg, act, fx, stage, timers, reduced }: PokeCtx) {
  play('canOpen')
  play('ghost', { delay: 0.22, volume: 0.9 })

  const tab = svg.querySelector('.can-tab')
  const hole = svg.querySelector('.can-hole')
  anim(tab, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-80deg) translateY(-3px)' }, { transform: 'rotate(-62deg) translateY(-2px)' }], { duration: 260, easing: 'ease-out', fill: 'forwards' })
  anim(hole, [{ opacity: 0 }, { opacity: 1 }], { duration: 80, fill: 'forwards' })
  timers.later(() => {
    anim(tab, [{ transform: 'rotate(-62deg) translateY(-2px)' }, { transform: 'rotate(0deg)' }], { duration: 300, easing: 'ease-in-out', fill: 'forwards' })
    anim(hole, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' })
  }, 2600)

  anim(act, [{ transform: 'translateY(0)' }, { transform: 'translateY(-5%) rotate(-5deg)', offset: 0.3 }, { transform: 'translateY(1%) rotate(2deg)', offset: 0.65 }, { transform: 'translateY(0)' }], { duration: 480, easing: 'ease-out' })

  const lid = relBox(svg.querySelector('.can-lid') ?? svg, fx)
  const size = fx.clientWidth
  // fizzy puff
  for (let i = 0; i < 7; i++) {
    const a = rand(-150, -30) * (Math.PI / 180)
    const d = size * rand(0.25, 0.55)
    spawn(fx, {
      className: 'lfx-puff',
      x: lid.cx,
      y: lid.cy,
      style: { width: `${size * rand(0.1, 0.18)}px` },
      keyframes: [
        { transform: 'translate(-50%,-50%) scale(0.3)', opacity: 0.95 },
        { transform: `translate(-50%,-50%) translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(1.3)`, opacity: 0 },
      ],
      duration: rand(450, 750),
      easing: 'cubic-bezier(.2,.7,.3,1)',
    })
  }

  const gs = size * 0.8
  // float up, but never under the news ticker when the can sits near the top
  const root = stage.root()
  const lidY = root ? relBox(svg.querySelector('.can-lid') ?? svg, root).cy : size * 2
  const room = Math.max(size * 0.45, lidY - gs * 1.17 - 84)
  const rise = Math.min(reduced ? size * 0.4 : size * 1.25, room)
  const sway = size * 0.22
  spawn(fx, {
    className: 'lfx-ghost',
    html: `<div class="lfx-ghost__body">${GHOST_SVG}</div><span class="lfx-ghost__boo">boo!</span>`,
    x: lid.cx,
    y: lid.cy,
    style: { width: `${gs}px`, height: `${gs * 1.17}px` },
    // the "boo!" bubble pokes out 18% above the ghost's box
    fit: { extraTop: gs * 1.17 * 0.18 + 4 },
    keyframes: [
      { transform: 'translate(-50%,-40%) scale(0.15)', opacity: 0 },
      { transform: `translate(-50%,-100%) translate(0, ${-rise * 0.25}px) scale(1.08) rotate(-6deg)`, opacity: 1, offset: 0.16 },
      { transform: `translate(-50%,-100%) translate(${sway}px, ${-rise * 0.55}px) scale(1) rotate(8deg)`, opacity: 1, offset: 0.42 },
      { transform: `translate(-50%,-100%) translate(${-sway}px, ${-rise * 0.8}px) scale(1) rotate(-8deg)`, opacity: 1, offset: 0.72 },
      { transform: `translate(-50%,-100%) translate(${sway * 0.4}px, ${-rise}px) scale(0.85) rotate(4deg)`, opacity: 0 },
    ],
    duration: 2700,
    easing: 'ease-in-out',
    delay: 90,
  })
}

export const ghostSticker: StickerDef = {
  id: 'ghost',
  label: 'Ghost energy drink can',
  aspect: 120 / 220,
  depth: 1.25,
  Art: GhostCanArt,
  poke,
}
