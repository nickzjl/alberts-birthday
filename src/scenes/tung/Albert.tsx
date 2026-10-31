import { memo } from 'react'
import type { AlbertAnim } from './engine'

const INK = '#0e0620'
const SKIN = '#ffd5b8'
const PJ = '#b79dff'
const PJ_DARK = '#8b6cf0'
const HAIR = '#2b1840'

function Eyes({ anim }: { anim: AlbertAnim }) {
  switch (anim) {
    case 'sleepy':
      return (
        <g stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M30 42 q4.5 3 9 0" />
          <path d="M46 42 q4.5 3 9 0" />
          <path d="M31 46 q3.5 1.4 7 0" strokeWidth="1.2" opacity="0.5" />
          <path d="M47 46 q3.5 1.4 7 0" strokeWidth="1.2" opacity="0.5" />
        </g>
      )
    case 'hurt':
    case 'ko':
      return (
        <g stroke={INK} strokeWidth="2.6" strokeLinecap="round">
          <path d="M31 38 l7 7 M38 38 l-7 7" />
          <path d="M47 38 l7 7 M54 38 l-7 7" />
        </g>
      )
    case 'win':
      return (
        <g stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none">
          <path d="M30 44 q4.5 -6 9 0" />
          <path d="M46 44 q4.5 -6 9 0" />
        </g>
      )
    case 'bonk':
      return (
        <g stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none">
          <path d="M30 37 l8 3" />
          <path d="M55 37 l-8 3" />
          <circle cx="35" cy="43.5" r="2.6" fill={INK} stroke="none" />
          <circle cx="50.5" cy="43.5" r="2.6" fill={INK} stroke="none" />
        </g>
      )
    default: {
      const big = anim === 'jump' || anim === 'fall'
      const ry = big ? 5 : 4.2
      return (
        <g className="alb__eyes">
          <ellipse cx="35" cy="42" rx="3.4" ry={ry} fill={INK} />
          <ellipse cx="50.5" cy="42" rx="3.4" ry={ry} fill={INK} />
          <circle cx="36.2" cy="40.2" r="1.3" fill="#fff" />
          <circle cx="51.7" cy="40.2" r="1.3" fill="#fff" />
        </g>
      )
    }
  }
}

function Mouth({ anim }: { anim: AlbertAnim }) {
  switch (anim) {
    case 'sleepy':
      return <ellipse className="alb__yawn" cx="43" cy="53" rx="2.6" ry="3.2" fill={INK} />
    case 'run':
      return <path d="M38.5 52.5 q4.5 1.5 9 0" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    case 'jump':
    case 'fall':
      return <ellipse cx="43" cy="53.5" rx="3" ry="3.6" fill={INK} />
    case 'hurt':
    case 'ko':
      return <path d="M36.5 54 q1.8 -2.4 3.6 0 q1.8 2.4 3.6 0 q1.8 -2.4 3.6 0" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    case 'win':
    case 'bonk':
      return (
        <g>
          <path d="M36 50.5 h14 q0 9 -7 9 q-7 0 -7 -9z" fill={INK} />
          <path d="M39.5 56.5 q3.5 -3 7 0 q-3.5 3 -7 0z" fill="#ff6fae" />
        </g>
      )
    default:
      return <path d="M38.5 51.5 q4.5 3.4 9 0" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
  }
}

/**
 * Albert — original chibi avatar: a sleepy guy in star pajamas and a party hat
 * (it's 3 AM sahur time AND his birthday). Drawn facing right; viewBox 84×100, feet at the bottom.
 * Limb animation is CSS-driven by the `alb--<anim>` class.
 */
export const AlbertSvg = memo(function AlbertSvg({ anim }: { anim: AlbertAnim }) {
  return (
    <svg className={`alb alb--${anim}`} viewBox="0 0 84 100" width="100%" height="100%" aria-hidden="true">
      {/* legs */}
      <g className="alb__leg alb__leg--b">
        <rect x="44" y="78" width="10" height="15" rx="4" fill={PJ_DARK} stroke={INK} strokeWidth="2.4" />
        <ellipse cx="50.5" cy="95.5" rx="8.5" ry="4.6" fill="#ff3ea5" stroke={INK} strokeWidth="2.4" />
        <circle cx="55.5" cy="93.5" r="2.4" fill="#fff" stroke={INK} strokeWidth="1.2" />
      </g>
      <g className="alb__leg alb__leg--f">
        <rect x="31" y="78" width="10" height="15" rx="4" fill={PJ_DARK} stroke={INK} strokeWidth="2.4" />
        <ellipse cx="37.5" cy="95.5" rx="8.5" ry="4.6" fill="#ff3ea5" stroke={INK} strokeWidth="2.4" />
        <circle cx="42.5" cy="93.5" r="2.4" fill="#fff" stroke={INK} strokeWidth="1.2" />
      </g>

      <g className="alb__body">
        {/* back arm */}
        <g className="alb__arm alb__arm--b">
          <rect x="54" y="58" width="9" height="18" rx="4.5" fill={PJ_DARK} stroke={INK} strokeWidth="2.4" />
          <circle cx="58.5" cy="77" r="4.4" fill={SKIN} stroke={INK} strokeWidth="2.2" />
        </g>
        {/* torso: star pajamas */}
        <rect x="24" y="55" width="37" height="30" rx="13" fill={PJ} stroke={INK} strokeWidth="2.6" />
        <path d="M34 56 l8.5 9 l8.5 -9" fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M42.5 66 v15" stroke={PJ_DARK} strokeWidth="1.6" />
        <circle cx="42.5" cy="70" r="1.3" fill={INK} />
        <circle cx="42.5" cy="76" r="1.3" fill={INK} />
        <path d="M30 69 l1 2.4 2.4 1 -2.4 1 -1 2.4 -1 -2.4 -2.4 -1 2.4 -1z" fill="#fff" />
        <path d="M53 74 l0.8 2 2 0.8 -2 0.8 -0.8 2 -0.8 -2 -2 -0.8 2 -0.8z" fill="#c8ff2e" />
        <circle cx="51" cy="63" r="1.2" fill="#fff" />
        <circle cx="33" cy="79" r="1.1" fill="#c8ff2e" />

        <g className="alb__head">
          {/* ears */}
          <circle cx="19" cy="42" r="4.6" fill={SKIN} stroke={INK} strokeWidth="2.2" />
          <circle cx="66" cy="42" r="4.6" fill={SKIN} stroke={INK} strokeWidth="2.2" />
          <circle cx="42.5" cy="38" r="24" fill={SKIN} stroke={INK} strokeWidth="2.6" />
          {/* bedhead */}
          <path
            d="M19.5 37 C18 22 28 13 42 13 C57 13 67 21 65.5 37 C62 30 58 27 55 26 C55 30 52 31 50 28 C47 31 42 31 40 27 C37 31 31 31 30 27 C26 29 22 33 19.5 37 Z"
            fill={HAIR}
            stroke={INK}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M47 15 c2 -7 9 -9 12 -6 c-4 0 -7 2 -8 6" fill={HAIR} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="29" cy="49.5" rx="4.4" ry="2.6" fill="#ff8fc2" opacity="0.75" />
          <ellipse cx="56.5" cy="49.5" rx="4.4" ry="2.6" fill="#ff8fc2" opacity="0.75" />
          <Eyes anim={anim} />
          <Mouth anim={anim} />
          {/* party hat */}
          <g className="alb__hat">
            <g transform="rotate(-16 33 17)">
              <clipPath id="alb-hat-clip">
                <path d="M22 17 L44 17 L33 -16 Z" />
              </clipPath>
              <path d="M22 17 L44 17 L33 -16 Z" fill="#ff3ea5" />
              <g clipPath="url(#alb-hat-clip)" fill="#c8ff2e">
                <rect x="14" y="4" width="40" height="5" transform="rotate(-18 33 6)" />
                <rect x="14" y="-8" width="40" height="5" transform="rotate(-18 33 -6)" />
              </g>
              <path d="M22 17 L44 17 L33 -16 Z" fill="none" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
              <ellipse cx="33" cy="17.5" rx="12" ry="3" fill="#ffd23f" stroke={INK} strokeWidth="2" />
              <circle cx="33" cy="-17" r="5" fill="#ffd23f" stroke={INK} strokeWidth="2.2" />
            </g>
          </g>
        </g>

        {/* front arm */}
        <g className="alb__arm alb__arm--f">
          <rect x="22" y="58" width="9" height="18" rx="4.5" fill={PJ} stroke={INK} strokeWidth="2.4" />
          <circle cx="26.5" cy="77" r="4.4" fill={SKIN} stroke={INK} strokeWidth="2.2" />
        </g>
      </g>
    </svg>
  )
})
