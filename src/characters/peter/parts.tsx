/**
 * Static body art for Peter. Moving parts expose refs (via rig.bind) that the rig drives every frame.
 * All coordinates are in the 310 × 500 character viewBox (or limb-local where noted).
 */
import type { PeterRig, HandShape } from './rig'
import { GEO } from './poses'

export const C = {
  ink: '#0e0620',
  skin: '#f9bba4',
  skinShade: '#e8957c',
  skinHi: '#ffdccd',
  hair: '#8b4a2b',
  hairHi: '#b06a3c',
  hairShade: '#5f2f17',
  shirt: '#ffffff',
  shirtShade: '#ddd3ec',
  pants: '#2d6a34',
  pantsShade: '#1f4e27',
  belt: '#17101c',
  buckle: '#f5a623',
  buckleHi: '#ffe08f',
  buckleShade: '#c4790a',
  shoe: '#5a2e1a',
  shoeShade: '#3c1d0e',
  shoeHi: '#8a5232',
  mouth: '#4a0f22',
  tongue: '#e8687f',
  lensShade: '#e4dcec',
}

const O = GEO.o

type R = { rig: PeterRig }

/* ------------------------------------------------------------------ */
/* Legs                                                                 */
/* ------------------------------------------------------------------ */

const SHOE_F = 'M-50 -14C-56 2 -56 26 -46 39C-30 42 40 42 60 40C76 38 80 24 72 10C64 -4 40 -14 10 -16C-16 -18 -40 -18 -50 -14Z'
const SHOE_B = 'M-40 -12C-46 2 -45 26 -36 38C-20 41 30 41 48 39C64 37 66 22 58 10C50 -2 30 -12 6 -14C-14 -15 -32 -15 -40 -12Z'

function Shoe({ k }: { k: 'F' | 'B' }) {
  const front = k === 'F'
  return (
    <g>
      <path d={front ? SHOE_F : SHOE_B} fill={C.shoe} stroke={C.ink} strokeWidth={O} strokeLinejoin="round" />
      <path
        d={front ? 'M-50.5 29C-28 34 40 34 72.5 27C73 33 70 37.5 60 40C40 42 -30 42 -46 39C-49 36 -50.5 32.5 -50.5 29Z' : 'M-41.5 28C-20 32.5 30 32.5 62 26C62 32 60 36.5 48 39C30 41 -20 41 -36 38C-39.5 35 -41.5 31.5 -41.5 28Z'}
        fill={C.shoeShade}
      />
      <path d={front ? SHOE_F : SHOE_B} fill="none" stroke={C.ink} strokeWidth={O} strokeLinejoin="round" />
      <path d={front ? 'M26 -9C46 -6 63 3 69.5 14' : 'M20 -7C36 -4 51 4 56.5 12.5'} fill="none" stroke={C.shoeHi} strokeWidth={3.6} strokeLinecap="round" />
    </g>
  )
}

export function Leg({ rig, k, slot = 0 }: R & { k: 'F' | 'B'; slot?: number }) {
  return (
    <g>
      <g ref={rig.bind(`foot${k}`, slot)}>
        <Shoe k={k} />
      </g>
      <path ref={rig.bind(`leg${k}.ink`, slot)} fill={C.ink} stroke={C.ink} strokeWidth={O * 2} strokeLinejoin="round" />
      <path ref={rig.bind(`leg${k}.fill`, slot)} fill={C.pants} />
      <path ref={rig.bind(`leg${k}.shade`, slot)} fill="none" stroke={C.pantsShade} strokeWidth={16} strokeLinejoin="round" opacity={0.85} />
    </g>
  )
}

/** pants top, belt & buckle — rides on the pelvis */
export function Waist() {
  return (
    <g>
      {/* pants top: rounded hips tucked under the shirt, flowing into the thighs (front thigh edge x≈62) */}
      <path d="M84 300C112 314 150 326 194 328C236 328 268 316 288 300C294 326 284 350 262 368L170 380L66 384C62 372 59.5 356 59.5 342C59.5 326 66 310 84 300Z" fill={C.pants} />
      <path d="M78 306C66 316 61 328 61 344C61 358 62.5 370 65.5 380C70 366 72 336 86 316Z" fill={C.pantsShade} opacity={0.85} />
      <path d="M76 307C65 317 59.5 329 59.5 343C59.5 358 61.5 371 65 382M289 314C286 334 277 352 260 368" fill="none" stroke={C.ink} strokeWidth={O} strokeLinecap="round" />
      <path d="M163 371C168 380 176 385.5 188 388.5" fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" />
      {/* belt: a full band under the belly, wrapping round both hips */}
      <path d="M82 296C112 308 150 318 194 320C238 320 270 310 290 293L291 313C270 334 238 348 194 348C150 348 108 336 75 318C70 310 74 299 82 296Z" fill={C.belt} stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M86 303C116 314 152 324 194 326" fill="none" stroke="#3a2c44" strokeWidth={2} strokeLinecap="round" />
      <path d="M126 321.5L133.5 323.2L133 343.2L125.5 341.6ZM255 318L262 314.6L262.4 335L255.4 338.2Z" fill={C.pants} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      {/* buckle */}
      <ellipse cx={212} cy={341} rx={18} ry={11} fill={C.buckle} stroke={C.ink} strokeWidth={2.4} />
      <path d="M196 344C202.5 351 222.5 351.5 229.5 343C227 350 202.5 353.5 196 344Z" fill={C.buckleShade} />
      <ellipse cx={206.5} cy={337.5} rx={8} ry={3.2} fill={C.buckleHi} />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Torso                                                                */
/* ------------------------------------------------------------------ */

export const CHEST = 'M84 121C70 128 54 140 40 159A23 23 0 0 0 20.1 193.5C30 212 62 222 76 236C74 258 66 282 68 300C70 308 78 313 88 316L200 322L286 302C291 270 291 240 287 214L295.9 193.5A23 23 0 0 0 276 159C262 150 250 136 240 121C200 108 124 108 84 121Z'
export const BELLY = 'M76 232C74 258 66 282 68 300C70 309 82 316 96 320C124 330 160 334 194 334C232 334 266 322 285 305C293 290 292 250 287 214C250 205 120 205 78 232Z'
const BELLY_EDGE = 'M76 232C74 258 66 282 68 300C70 309 82 316 96 320C124 330 160 334 194 334C232 334 266 322 285 305C293 290 292 250 287 214'

export function ChestInk() {
  return <path d={CHEST} fill="none" stroke={C.ink} strokeWidth={O * 2} strokeLinejoin="round" />
}

export function ChestFill({ uid }: { uid: string }) {
  return (
    <g>
      <path d={CHEST} fill={C.shirt} />
      <g clipPath={`url(#${uid}-chest)`}>
        <path d="M20 193C30 212 62 222 76 236C74 258 66 282 68 300L90 306C90 270 90 238 64 210Z" fill={C.shirtShade} />
        <path d="M84 127C112 156 146 182 186 198C200 200 214 194 228 172L240 126L246 140C236 180 214 202 188 206C146 196 110 168 82 136Z" fill={C.shirtShade} opacity={0.7} />
        <path d="M264 196C274 212 280 236 282 262L292 262L292 196Z" fill={C.shirtShade} />
      </g>
      {/* placket (upper part) */}
      <path d="M193 186C196.5 196 200 206 204.5 217" fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={191} cy={197} r={2.5} fill={C.shirt} stroke={C.ink} strokeWidth={1.6} />
    </g>
  )
}

export function Belly({ uid }: { uid: string }) {
  return (
    <g>
      <path d={BELLY} fill={C.shirt} />
      <g clipPath={`url(#${uid}-belly)`}>
        <path d="M100 298C128 316 160 325 194 325C232 325 264 313 289 290L294 342L94 342Z" fill={C.shirtShade} />
        <path d="M76 232C74 258 66 282 68 300L88 316C86 286 88 254 84 228Z" fill={C.shirtShade} />
      </g>
      <path d={BELLY_EDGE} fill="none" stroke={C.ink} strokeWidth={O} strokeLinecap="round" strokeLinejoin="round" />
      {/* placket over the belly, buttons & strain wrinkles */}
      <path d="M204.5 217C207.5 224 210.8 231.5 214 240C224 262 232 285 230 300C229 307 227 311 225 313" fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M210 231L226 228.6M211.5 235.2L222.5 233.6" fill="none" stroke={C.ink} strokeWidth={1.5} strokeLinecap="round" />
      {[
        [204.5, 228],
        [221.5, 264],
        [223.5, 300],
      ].map(([x, y]) => (
        <circle key={y} cx={x} cy={y} r={2.5} fill={C.shirt} stroke={C.ink} strokeWidth={1.6} />
      ))}
    </g>
  )
}

/** skin visible inside the open collar */
export function NeckSkin() {
  return <path d="M92 116C108 140 140 166 180 190L193 186L208 189C220 170 230 146 234 116Z" fill={C.skin} />
}

export function Lapels() {
  return (
    <g fill={C.shirt} stroke={C.ink} strokeWidth={2.8} strokeLinejoin="round">
      <path d="M82 121C96 140 128 168 170 196C174 198 178 196.5 179.5 191.5C168 186 152 176 140 168C120 154 104 138 95.5 117.5Z" />
      <path d="M240 120C248 134 240 156 213 189.5C211 191.5 207.5 191 206.5 187.5C216 172 224 152 229.5 123.5Z" />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Arms                                                                 */
/* ------------------------------------------------------------------ */

const SLEEVE = 'M-31 0A31 31 0 0 1 31 0C33 12 35 24 35.5 35L-35.5 35C-35 24 -33 12 -31 0Z'

/** drawn behind the chest fill so sleeve + torso read as one silhouette */
export function SleeveInk() {
  return <path d={SLEEVE} fill="none" stroke={C.ink} strokeWidth={O * 2} strokeLinejoin="round" />
}

export function SleeveFill() {
  return (
    <g>
      <path d={SLEEVE} fill={C.shirt} />
      <path d="M-31 0C-33 12 -35 24 -35.5 32L-24 32C-24.5 20 -24 10 -21.5 0Z" fill={C.shirtShade} />
      <path d="M12 5C14.5 13 15.5 21 14.5 30" fill="none" stroke={C.shirtShade} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M31 7C33 15 34.5 23 34.8 32" fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" />
      {/* rolled cuff */}
      <path d="M-37.5 31.5C-24 28.5 24 28.5 37.5 31.5L38 43.5C24 47.5 -24 47.5 -38 43.5Z" fill={C.shirt} stroke={C.ink} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M-35.5 37.8C-18 40.4 18 40.4 35.5 37.8" fill="none" stroke={C.shirtShade} strokeWidth={2} strokeLinecap="round" />
    </g>
  )
}

function Finger({ x1, y1, x2, y2, w = 6.8 }: { x1: number; y1: number; x2: number; y2: number; w?: number }) {
  return (
    <g strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.ink} strokeWidth={w + 4.4} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.skin} strokeWidth={w} />
    </g>
  )
}

const PALM = 'M-13.5 -3C-15 6 -14.5 13 -12.5 17L12.5 17C14.5 12 14.5 5 13 -3Z'
const PALM_SIDES = 'M-13.5 -3C-15 6 -14.5 12 -13 15.5M13 -3C14.5 5 14.5 11 13.2 15'
const FIST = 'M-14 -3C-16.5 6 -16.5 16 -12.5 21C-7 25.5 7 25.5 12.5 21C16.5 16 16.5 6 14 -3Z'

/** hand in wrist-local space: wrist at 0,0, fingers towards +y, thumb on -x */
export function Hand({ shape }: { shape: HandShape }) {
  let body
  switch (shape) {
    case 'open':
      body = (
        <>
          <Finger x1={-11} y1={6} x2={-22.5} y2={11} w={7.6} />
          <Finger x1={-9.5} y1={14} x2={-12} y2={31} />
          <Finger x1={-3.3} y1={15} x2={-4.2} y2={34} />
          <Finger x1={3.3} y1={15} x2={3.8} y2={34} />
          <Finger x1={9.5} y1={14} x2={11.5} y2={30.5} />
          <path d="M-14 -3C-15.5 6 -15 13 -12.5 18L12.5 18C15 13 15.5 6 14 -3Z" fill={C.skin} />
          <path d="M-14 -3C-15.5 6 -15 12 -13.2 16.5M14 -3C15.5 6 15 12 13.2 16.5" fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" />
          <path d="M-6 9.5C-2 12.5 3 12.5 7 8.5" fill="none" stroke={C.skinShade} strokeWidth={1.6} strokeLinecap="round" />
        </>
      )
      break
    case 'fist':
      body = (
        <>
          <path d={FIST} fill={C.skin} stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" />
          <path d="M-6.5 23.5L-6.5 16.5M0 24.5L0 17M6.5 23.5L6.5 16.5" fill="none" stroke={C.ink} strokeWidth={1.6} strokeLinecap="round" />
          <Finger x1={-13.5} y1={8} x2={1} y2={12.5} w={7.4} />
        </>
      )
      break
    case 'thumb':
      body = (
        <>
          <Finger x1={-4} y1={12} x2={-5} y2={34} w={8.4} />
          <path d={FIST} fill={C.skin} stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" />
          <path d="M-15.2 6.5L-6 6.5M-15.6 12.5L-6 12.5M-14.6 18.5L-6.5 18" fill="none" stroke={C.ink} strokeWidth={1.6} strokeLinecap="round" />
        </>
      )
      break
    case 'claw':
      body = (
        <>
          <Finger x1={-12} y1={4} x2={-18.5} y2={15.5} w={7.6} />
          <Finger x1={-9.5} y1={13} x2={-9} y2={23} />
          <Finger x1={-3.3} y1={14} x2={-2.5} y2={25} />
          <Finger x1={3.3} y1={14} x2={4} y2={25} />
          <Finger x1={9.5} y1={13} x2={9.8} y2={22.5} />
          <path d={PALM} fill={C.skin} />
          <path d={PALM_SIDES} fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" />
        </>
      )
      break
    default:
      body = (
        <>
          <Finger x1={-10} y1={5} x2={-19.5} y2={15.5} w={7.6} />
          <Finger x1={-9.5} y1={13} x2={-10.5} y2={26.5} />
          <Finger x1={-3.3} y1={14} x2={-3.8} y2={29.5} />
          <Finger x1={3.3} y1={14} x2={3.4} y2={29.5} />
          <Finger x1={9.6} y1={12.5} x2={10} y2={25.5} />
          <path d={PALM} fill={C.skin} />
          <path d={PALM_SIDES} fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" />
        </>
      )
  }
  return <g transform="scale(1.4)">{body}</g>
}

/** forearm + upper arm skin (below the cuff) and the hand */
export function Arm({ rig, k, hand, slot = 0 }: R & { k: 'F' | 'B'; hand: HandShape; slot?: number }) {
  return (
    <g>
      <path ref={rig.bind(`arm${k}.ink`, slot)} fill={C.ink} stroke={C.ink} strokeWidth={O * 2} strokeLinejoin="round" />
      <path ref={rig.bind(`arm${k}.fill`, slot)} fill={C.skin} />
      <path ref={rig.bind(`arm${k}.shade`, slot)} fill="none" stroke={C.skinShade} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={0.38} />
      <g ref={rig.bind(`hand${k}`, slot)}>
        <Hand shape={hand} />
      </g>
    </g>
  )
}
