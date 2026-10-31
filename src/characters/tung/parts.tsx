/**
 * Static SVG pieces of Tung Tung Tung Sahur. Everything that moves is positioned by the rig
 * loop in Tung.tsx (via refs), these just draw the art.
 */
import type { CSSProperties } from 'react'
import { useId } from 'react'
import { BAT_PATH, BODY_PATH, ids } from './art'
import { C } from './geometry'

export function Gradients({ p }: { p: string }) {
  const id = ids(p)
  return (
    <>
      <linearGradient id={id.body} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#5a2a0e" />
        <stop offset="0.07" stopColor="#83421a" />
        <stop offset="0.24" stopColor="#cd7a36" />
        <stop offset="0.37" stopColor="#eca55c" />
        <stop offset="0.5" stopColor="#da8b45" />
        <stop offset="0.72" stopColor="#b3622a" />
        <stop offset="0.9" stopColor="#85431a" />
        <stop offset="1" stopColor="#57290e" />
      </linearGradient>
      <linearGradient id={id.shade} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#ffd9a6" stopOpacity="0.28" />
        <stop offset="0.12" stopColor="#ffd9a6" stopOpacity="0" />
        <stop offset="0.6" stopColor="#2a1005" stopOpacity="0" />
        <stop offset="1" stopColor="#2a1005" stopOpacity="0.42" />
      </linearGradient>
      <radialGradient id={id.cap} cx="0.45" cy="0.5" r="0.6">
        <stop offset="0" stopColor="#f8d39b" />
        <stop offset="0.7" stopColor="#e9b273" />
        <stop offset="1" stopColor="#c98a4a" />
      </radialGradient>
      <radialGradient id={id.glow} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffd6a0" stopOpacity="0.38" />
        <stop offset="1" stopColor="#ffd6a0" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={id.flush} cx="0.5" cy="0.45" r="0.5">
        <stop offset="0" stopColor="#ff2a3a" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ff2a3a" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={id.sclera} cx="0.42" cy="0.38" r="0.62">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.7" stopColor={C.sclera} />
        <stop offset="1" stopColor="#e2c9a8" />
      </radialGradient>
      <radialGradient id={id.iris} cx="0.4" cy="0.35" r="0.65">
        <stop offset="0" stopColor="#9a5a26" />
        <stop offset="0.6" stopColor={C.iris} />
        <stop offset="1" stopColor={C.irisDark} />
      </radialGradient>
      <linearGradient id={id.nose} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#f2b673" />
        <stop offset="0.42" stopColor="#d48d48" />
        <stop offset="1" stopColor="#8e4b1e" />
      </linearGradient>
      <BatGradient id={id.bat} />
      <clipPath id={id.clip}>
        <path d={BODY_PATH} />
      </clipPath>
      <clipPath id={id.eye}>
        <circle r="39" />
      </clipPath>
    </>
  )
}

/** the log body fill + carved details (clipped to the silhouette) */
export function LogBody({ p }: { p: string }) {
  const id = ids(p)
  return (
    <>
      <path d={BODY_PATH} fill={`url(#${id.body})`} />
      <g clipPath={`url(#${id.clip})`}>
        <path d={BODY_PATH} fill={`url(#${id.shade})`} />
        {/* wood grain */}
        <g fill="none" stroke={C.grain} strokeLinecap="round" opacity="0.3">
          <path d="M206 120C202 240 210 330 204 470C200 540 208 580 205 630" strokeWidth="3" />
          <path d="M226 420C230 480 222 560 228 640" strokeWidth="2.4" />
          <path d="M252 450C256 520 248 580 254 640" strokeWidth="2" />
          <path d="M300 420C296 480 304 560 298 640" strokeWidth="2.4" />
          <path d="M376 110C380 240 372 420 378 640" strokeWidth="3" />
          <path d="M362 300C358 360 366 420 362 470M362 560C364 590 360 610 362 640" strokeWidth="2.2" />
          <path d="M318 112C320 128 316 140 318 152" strokeWidth="2.2" />
          <path d="M236 112C234 124 238 136 236 146" strokeWidth="2" />
          {/* grain bending around the knot */}
          <path d="M322 450C312 478 312 520 318 540C322 560 330 580 332 640" strokeWidth="2.2" />
          <path d="M346 450C356 478 352 520 346 545C342 565 344 600 342 640" strokeWidth="2.2" />
        </g>
        {/* knot */}
        <ellipse cx="332" cy="508" rx="11" ry="17" fill="#8a4a1e" stroke={C.grain} strokeWidth="2.5" opacity="0.85" />
        <ellipse cx="332" cy="510" rx="4.5" ry="8" fill="#5a2c10" opacity="0.8" />
        {/* warm light on the carved face */}
        <ellipse cx="262" cy="262" rx="104" ry="150" fill={`url(#${id.glow})`} />
        {/* cool lavender rim light from the scene */}
        <path d="M384 100L384 612" stroke={C.rim} strokeWidth="7" opacity="0.32" />
        <path d="M195 380C192 420 194 520 195 606" stroke="#ffcf94" strokeWidth="4" opacity="0.35" fill="none" />
      </g>
      {/* flat top with end grain */}
      <ellipse cx="290" cy="86" rx="99" ry="23" fill={`url(#${id.cap})`} stroke="#8a4a1e" strokeWidth="3" />
      <g fill="none" stroke="#b97536" strokeWidth="2" opacity="0.6">
        <ellipse cx="286" cy="86" rx="70" ry="15" />
        <ellipse cx="282" cy="86" rx="42" ry="9" />
        <ellipse cx="280" cy="86" rx="15" ry="3.5" />
        <path d="M300 74L322 92" stroke="#8a4a1e" strokeWidth="2.5" />
      </g>
    </>
  )
}

/** long carved nose (torso-local, centred on x≈282) */
export function Nose({ p }: { p: string }) {
  const id = ids(p)
  return (
    <g>
      {/* cast shadow to his left (viewer right) */}
      <path d="M293 182C302 228 308 262 322 292C318 306 304 314 290 312Z" fill="#5a2c10" opacity="0.38" />
      <path
        d="M271 178C269 220 265 256 258 278C243 283 240 303 255 311C267 317 293 317 307 311C322 303 319 283 304 278C297 256 294 220 293 178Z"
        fill={`url(#${id.nose})`}
      />
      {/* shadow side of the bridge */}
      <path d="M288 184C289 222 292 254 299 276C292 280 288 286 286 292C284 270 283 230 284 184Z" fill="#8a4a1e" opacity="0.55" />
      {/* bridge highlight */}
      <path d="M275 190C274 226 272 252 266 274" stroke="#ffe0b0" strokeWidth="5" strokeLinecap="round" opacity="0.75" fill="none" />
      {/* tip + wings outline */}
      <path d="M258 278C243 283 240 303 255 311C267 317 293 317 307 311C322 303 319 283 304 278" fill="none" stroke={C.ink} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M293 182C294 222 297 256 304 278" fill="none" stroke={C.ink} strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
      <path d="M271 182C270 218 267 250 262 270" fill="none" stroke="#7a3f17" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      {/* nostrils */}
      <path d="M259 304Q266 297 274 305M291 305Q299 297 306 304" fill="none" stroke={C.ink} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="279" cy="292" rx="10" ry="6" fill="#ffe2b4" opacity="0.6" />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* bat                                                                  */
/* ------------------------------------------------------------------ */


function BatGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="-33" x2="33" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor={C.batDark} />
      <stop offset="0.2" stopColor={C.batMid} />
      <stop offset="0.38" stopColor={C.batHi} />
      <stop offset="0.58" stopColor={C.bat} />
      <stop offset="1" stopColor={C.batDark} />
    </linearGradient>
  )
}

export function BatShape({ grad }: { grad: string }) {
  return (
    <g>
      <path d={BAT_PATH} fill={`url(#${grad})`} stroke={C.ink} strokeWidth="6" strokeLinejoin="round" />
      {/* grain + gloss */}
      <path d="M6 -330C8 -360 9 -390 7 -420M-2 -200C-1 -240 0 -270 2 -300" fill="none" stroke={C.batDark} strokeWidth="2" opacity="0.45" strokeLinecap="round" />
      <path d="M-15 -250C-19 -300 -21 -360 -19 -414" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
      <path d="M-4 -40L-4 -150" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
      <ellipse cx="-17" cy="-424" rx="4" ry="6" fill="#fff" opacity="0.7" />
      {/* knob */}
      <ellipse cx="0" cy="-2" rx="15" ry="8.5" fill={C.batMid} stroke={C.ink} strokeWidth="5" />
    </g>
  )
}

/**
 * The bat on its own (for thrown / dropped bat projectiles). Drawn vertically, handle at the
 * bottom, filling its box (aspect ≈ 0.22 w/h).
 */
export function TungBat({ className, style }: { className?: string; style?: CSSProperties }) {
  const grad = `tb${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg
      viewBox="-50 -446 100 456"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible', ...style }}
      aria-hidden="true"
    >
      <defs>
        <BatGradient id={grad} />
      </defs>
      <BatShape grad={grad} />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* hands & feet                                                         */
/* ------------------------------------------------------------------ */

const fingerLine = (pts: [number, number, number, number][], w: number, color: string) =>
  pts.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w} strokeLinecap="round" />)

/** hand pieces, drawn pointing down from the wrist at 0,0 */
const OPEN_FINGERS: [number, number, number, number][] = [
  [-8, 22, -10, 40],
  [-2.5, 24, -3, 43],
  [3, 24, 3.5, 42],
  [8.5, 22, 10, 37],
]
const WAVE_FINGERS: [number, number, number, number][] = [
  [-5, 18, -17, 40],
  [-1.5, 20, -6, 45],
  [2, 20, 5, 45],
  [5, 18, 15, 40],
]

export function HandFist() {
  return (
    <g>
      <rect x="-15" y="3" width="30" height="31" rx="12" fill={C.limb} stroke={C.ink} strokeWidth="4.5" />
      <path d="M-11 28Q-6 33 -1 28M1 28Q6 33 11 28" fill="none" stroke={C.ink} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M-12 14Q-1 7 10 14" fill="none" stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M-8 9Q0 5 7 8" fill="none" stroke={C.limbHi} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    </g>
  )
}

export function HandOpen({ wave = false }: { wave?: boolean }) {
  const f = wave ? WAVE_FINGERS : OPEN_FINGERS
  const thumb: [number, number, number, number][] = wave ? [[9, 12, 22, 20]] : [[10, 10, 15, 25]]
  return (
    <g>
      {fingerLine([...f, ...thumb], 11.5, C.ink)}
      <ellipse cx="0" cy="15" rx="14.5" ry="14" fill={C.ink} />
      {fingerLine([...f, ...thumb], 6.5, C.limb)}
      <ellipse cx="0" cy="15" rx="11.5" ry="11" fill={C.limb} />
      <path d="M-6 10Q0 7 6 10" fill="none" stroke={C.limbHi} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    </g>
  )
}

/** bare human foot, ankle at 0,0, toes pointing left, sole at y≈40 */
export function Foot() {
  return (
    <g>
      <path
        d="M13 -10C23 2 27 22 21 35C13 41 -20 41 -50 41C-68 41 -84 39 -89 30C-92 21 -84 13 -72 11C-56 8 -36 5 -22 -3C-14 -8 -10 -12 -10 -15Z"
        fill={C.limb}
        stroke={C.ink}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M-66 16C-50 12 -34 9 -22 2" fill="none" stroke={C.limbHi} strokeWidth="4" strokeLinecap="round" opacity="0.75" />
      <path d="M10 6C14 16 15 24 12 32" fill="none" stroke="#7e4219" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      {/* toes: little ones first so the big toe overlaps */}
      <g fill={C.limb} stroke={C.ink} strokeWidth="3">
        <ellipse cx="-31" cy="37" rx="6" ry="5" />
        <ellipse cx="-42" cy="37.5" rx="7" ry="5.5" />
        <ellipse cx="-54" cy="37" rx="8" ry="6.5" />
        <ellipse cx="-67" cy="35" rx="9" ry="7.5" />
        <ellipse cx="-81" cy="30" rx="11.5" ry="10" />
      </g>
      <ellipse cx="-85" cy="27" rx="5" ry="4" fill="#f3c08a" opacity="0.9" />
    </g>
  )
}

