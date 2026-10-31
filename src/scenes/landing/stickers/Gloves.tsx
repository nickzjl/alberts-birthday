import { anim, play, relBox } from '../fx'
import { INK, type PokeCtx, type StickerDef } from './types'

/** one glove, fist up, thumb on the left, in a ~120×155 box */
function Glove({ transform, strap }: { transform: string; strap: string }) {
  return (
    <g transform={transform}>
      <path d="M20 94 C10 62 20 22 58 14 C94 6 114 32 112 64 C110 88 102 102 94 110 L32 114 C26 108 22 102 20 94 Z" fill="#ff3b4e" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M96 30 C110 46 108 76 98 100 L92 108 C100 86 104 56 90 34 Z" fill="#c41f3e" />
      <path d="M42 70 C56 60 74 58 92 64" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <ellipse cx="56" cy="34" rx="15" ry="8" fill="#fff" opacity="0.6" transform="rotate(-22 56 34)" />
      <circle cx="78" cy="26" r="3" fill="#fff" opacity="0.75" />
      {/* thumb, in front */}
      <path d="M34 104 C16 104 8 86 13 72 C18 59 33 58 39 68 C45 78 44 94 34 104 Z" fill="#ff4d5e" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M20 76 C23 70 29 68 33 71" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* cuff */}
      <path d="M30 110 L96 106 L100 148 C82 154 46 154 28 148 Z" fill="#fff8ef" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M29 122 L98 118 L99 134 L29 138 Z" fill={strap} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 128 H90" stroke="#fff" strokeWidth="1.6" strokeDasharray="4 3" opacity="0.7" />
    </g>
  )
}

function GlovesArt() {
  return (
    <svg viewBox="0 0 210 190" className="stk-svg" aria-hidden="true">
      {/* lace loop the pair hangs from */}
      <path d="M70 120 C78 60 96 22 106 8 C116 22 132 60 142 118" stroke={INK} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M70 120 C78 60 96 22 106 8 C116 22 132 60 142 118" stroke="#fff8ef" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g className="gl-right">
        <Glove transform="translate(96 34) rotate(9)" strap="#8b4dff" />
      </g>
      <g className="gl-left">
        <Glove transform="translate(120 30) scale(-1 1) rotate(9)" strap={INK} />
      </g>
    </svg>
  )
}

function poke({ svg, act, slot, stage, timers, reduced }: PokeCtx) {
  play('swoosh', { pitch: 0.8 })
  slot.style.zIndex = '8'
  const root = stage.root()
  const b = root ? relBox(slot, root) : null
  // punch out of the screen, drifting toward the middle so the fist stays in view
  const dx = b && root ? (root.clientWidth / 2 - b.cx) * 0.35 : 0
  const dy = b && root ? (root.clientHeight * 0.45 - b.cy) * 0.35 : 0
  const scale = reduced ? 1.3 : 2.4
  anim(
    act,
    [
      { transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
      { transform: `translate(${-dx * 0.15}px, ${-dy * 0.15}px) scale(0.8, 0.76) rotate(-12deg)`, offset: 0.2 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(6deg)`, offset: 0.38 },
      { transform: `translate(${dx * 0.92}px, ${dy * 0.92}px) scale(${scale * 0.94}) rotate(3deg)`, offset: 0.62 },
      { transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
    ],
    { duration: 1000, easing: 'cubic-bezier(.3,.7,.3,1)' },
  )
  anim(svg.querySelector('.gl-left'), [{ transform: 'translate(0,0)' }, { transform: 'translate(4%, -8%) rotate(8deg)', offset: 0.4 }, { transform: 'translate(0,0)' }], { duration: 1000 })
  timers.later(() => {
    play('punch')
    play('slap', { delay: 0.03, volume: 0.6 })
    if (b) {
      // the impact lands just in front of (below/inside) the fist
      const size = Math.max(130, Math.min(240, b.w * 1.35))
      stage.burst('POW!', b.cx + dx * 1.6, b.cy + dy * 1.6 + b.h * 0.35, { color: '#ffd23f', size, rotate: -10 })
    }
    if (!reduced) stage.shake({ strength: 'big', duration: 0.5, rotate: true })
  }, 360)
  timers.later(() => {
    slot.style.zIndex = ''
  }, 1050)
}

export const glovesSticker: StickerDef = {
  id: 'gloves',
  label: 'Boxing gloves',
  aspect: 210 / 190,
  depth: 1.5,
  Art: GlovesArt,
  poke,
  ownSquash: true,
}
