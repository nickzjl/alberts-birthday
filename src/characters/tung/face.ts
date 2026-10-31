/**
 * Face parameters per expression + the path builders that turn them into SVG.
 * Every number is smoothed every frame, so any expression morphs into any other.
 */
import type { TungExpression } from '../types'
import { D2R, FACE, f2 } from './geometry'

export interface Face {
  /** eyeball scale */
  eyeS: number
  /** iris scale */
  pupS: number
  lookX: number
  lookY: number
  /** upper lid closure 0..1, tilt (deg, + = inner corner down), edge curve */
  lidT: number
  lidA: number
  lidC: number
  /** lower lid raise 0..1 */
  lidB: number
  browY: number
  /** + = inner ends down (angry), − = worried */
  browA: number
  browArch: number
  /** mouth width, corner lift, jaw open 0..1, crooked skew, vertical offset */
  mW: number
  mC: number
  mO: number
  mSk: number
  mY: number
  teeth: number
  tongue: number
  blush: number
  vein: number
  flush: number
  /** special eye overlays */
  spiral: number
  arcs: number
  squeeze: number
  sweat: number
}

const NEUTRAL: Face = {
  eyeS: 1,
  pupS: 1,
  lookX: 0,
  lookY: 0,
  lidT: 0.06,
  lidA: 0,
  lidC: 10,
  lidB: 0,
  browY: 0,
  browA: 0,
  browArch: 10,
  mW: 140,
  mC: 18,
  mO: 0,
  mSk: 0,
  mY: 0,
  teeth: 0,
  tongue: 0,
  blush: 0,
  vein: 0,
  flush: 0,
  spiral: 0,
  arcs: 0,
  squeeze: 0,
  sweat: 0,
}
export const FACE_KEYS = Object.keys(NEUTRAL) as (keyof Face)[]

export const EXPRESSIONS: Record<TungExpression, Face> = {
  creepy: { ...NEUTRAL, eyeS: 1.08, pupS: 0.84, lidT: 0.02, browY: -8, browA: -3, browArch: 14, mW: 158, mC: 25, mSk: -3 },
  angry: { ...NEUTRAL, eyeS: 1, pupS: 0.74, lidT: 0.34, lidA: 20, lidC: 3, lidB: 0.14, browY: 12, browA: 24, browArch: 1, mW: 124, mC: -14, mO: 0.3, teeth: 1, vein: 1, flush: 1 },
  windup: { ...NEUTRAL, eyeS: 1.24, pupS: 0.56, lidT: 0, browY: -15, browA: 15, browArch: 6, mW: 172, mC: 28, mO: 0.34, teeth: 1, flush: 0.35 },
  dizzy: { ...NEUTRAL, eyeS: 1.05, lidT: 0.08, browY: -5, browA: -12, browArch: 6, mW: 104, mC: 2, mO: 0.2, tongue: 0.85, spiral: 1 },
  hurt: { ...NEUTRAL, lidT: 1, lidB: 0.5, browY: 6, browA: -20, browArch: -3, mW: 104, mC: -10, mO: 0.32, mSk: 13, teeth: 1, squeeze: 1, flush: 0.25 },
  exhausted: { ...NEUTRAL, eyeS: 0.98, pupS: 0.94, lookY: 7, lidT: 0.56, lidA: -10, lidC: 5, lidB: 0.12, browY: 7, browA: -11, browArch: 4, mW: 98, mC: -4, mO: 0.5, tongue: 1, sweat: 1 },
  sheepish: { ...NEUTRAL, lookX: 9, lookY: 12, lidT: 0.4, lidA: -7, lidC: 8, lidB: 0.06, browY: -4, browA: -15, browArch: 8, mW: 74, mC: 9, mSk: 4, blush: 1 },
  happy: { ...NEUTRAL, lidT: 1, lidB: 0.3, browY: -11, browA: -5, browArch: 15, mW: 142, mC: 30, mO: 0.34, teeth: 0.9, blush: 0.55, arcs: 1 },
}

/** how often (s) the eyes dart around, and how far */
export const DARTS: Record<TungExpression, { every: [number, number]; x: number; y: number }> = {
  creepy: { every: [0.45, 1.7], x: 11, y: 6 },
  angry: { every: [1.2, 2.8], x: 4, y: 2 },
  windup: { every: [0.25, 0.6], x: 3, y: 2 },
  dizzy: { every: [9, 9], x: 0, y: 0 },
  hurt: { every: [9, 9], x: 0, y: 0 },
  exhausted: { every: [1.6, 3.2], x: 5, y: 2 },
  sheepish: { every: [0.9, 2.2], x: 5, y: 2 },
  happy: { every: [9, 9], x: 0, y: 0 },
}

/* ------------------------------------------------------------------ */
/* path builders (torso-local coordinates)                             */
/* ------------------------------------------------------------------ */

export function browPath(side: -1 | 1, f: Face) {
  const cx = FACE.cx + side * 3
  const inner = { x: cx + side * 20, y: FACE.browY + f.browY }
  const outer = { x: cx + side * 92, y: FACE.browY + 9 + f.browY }
  const t = Math.tan(f.browA * D2R) * 36
  inner.y += t
  outer.y -= t
  const mx = (inner.x + outer.x) / 2
  const my = (inner.y + outer.y) / 2 - f.browArch - 6
  return `M${f2(outer.x)} ${f2(outer.y)}Q${f2(mx)} ${f2(my)} ${f2(inner.x)} ${f2(inner.y)}`
}

/** cubic point helper */
const bez = (p0: number, p1: number, p2: number, p3: number, t: number) => {
  const m = 1 - t
  return m * m * m * p0 + 3 * m * m * t * p1 + 3 * m * t * t * p2 + t * t * t * p3
}

export interface MouthGeo {
  shape: string
  teeth: string
  gaps: string
  lip: string
  dimples: string
  folds: string
  /** bottom-centre of the opening (tongue anchor) */
  bx: number
  by: number
}

export function mouthGeo(f: Face): MouthGeo {
  const cx = FACE.cx + 2
  const cy = FACE.mouthY + f.mY
  const w = f.mW
  const c = f.mC
  const o = f.mO
  const sk = f.mSk
  const Lx = cx - w / 2
  const Ly = cy - c - sk
  const Rx = cx + w / 2
  const Ry = cy - c + sk
  const uy = cy + c * 0.35 - o * 5
  const ly = cy + c * 0.35 + o * 54
  const u1 = cx - w / 4
  const u2 = cx + w / 4
  const n = f2
  const shape = `M${n(Lx)} ${n(Ly)}C${n(u1)} ${n(uy)} ${n(u2)} ${n(uy)} ${n(Rx)} ${n(Ry)}C${n(u2)} ${n(ly)} ${n(u1)} ${n(ly)} ${n(Lx)} ${n(Ly)}Z`
  const th = 13
  const bh = 11
  const teeth =
    `M${n(Lx)} ${n(Ly - 3)}C${n(u1)} ${n(uy - 3)} ${n(u2)} ${n(uy - 3)} ${n(Rx)} ${n(Ry - 3)}L${n(Rx)} ${n(Ry + th)}C${n(u2)} ${n(uy + th)} ${n(u1)} ${n(uy + th)} ${n(Lx)} ${n(Ly + th)}Z` +
    `M${n(Rx)} ${n(Ry + 3)}C${n(u2)} ${n(ly + 3)} ${n(u1)} ${n(ly + 3)} ${n(Lx)} ${n(Ly + 3)}L${n(Lx)} ${n(Ly - bh)}C${n(u1)} ${n(ly - bh)} ${n(u2)} ${n(ly - bh)} ${n(Rx)} ${n(Ry - bh)}Z`
  let gaps = ''
  for (const t of [0.2, 0.34, 0.5, 0.66, 0.8]) {
    const x = bez(Lx, u1, u2, Rx, t)
    const yu = bez(Ly, uy, uy, Ry, t)
    const yl = bez(Ly, ly, ly, Ry, t)
    gaps += `M${n(x)} ${n(yu - 2)}V${n(yu + th)}M${n(x)} ${n(yl + 2)}V${n(yl - bh)}`
  }
  const lipY = Math.max(ly, uy) + 9
  const lip = `M${n(Lx + 14)} ${n(Ly + 9)}C${n(u1)} ${n(lipY)} ${n(u2)} ${n(lipY)} ${n(Rx - 14)} ${n(Ry + 9)}`
  const dimples = `M${n(Lx - 3)} ${n(Ly - 10)}Q${n(Lx - 11)} ${n(Ly)} ${n(Lx - 3)} ${n(Ly + 10)}M${n(Rx + 3)} ${n(Ry - 10)}Q${n(Rx + 11)} ${n(Ry)} ${n(Rx + 3)} ${n(Ry + 10)}`
  const nx = FACE.cx + 2
  const folds = `M${n(nx - 34)} 296C${n(nx - 58)} 306 ${n(Lx - 18)} ${n(Ly - 22)} ${n(Lx - 15)} ${n(Ly + 16)}M${n(nx + 36)} 296C${n(nx + 60)} 306 ${n(Rx + 18)} ${n(Ry - 22)} ${n(Rx + 15)} ${n(Ry + 16)}`
  return { shape, teeth, gaps, lip, dimples, folds, bx: cx, by: bez(Ly, ly, ly, Ry, 0.5) }
}

/** Archimedean spiral for dizzy eyes (eye-local) */
export const SPIRAL = (() => {
  let d = ''
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 5
    const r = 2 + a * 1.85
    d += `${i ? 'L' : 'M'}${f2(Math.cos(a) * r)} ${f2(Math.sin(a) * r)}`
  }
  return d
})()

/** five-point star centred on 0,0 */
export const STAR = (() => {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 ? 7 : 17
    d += `${i ? 'L' : 'M'}${f2(Math.cos(a) * r)} ${f2(Math.sin(a) * r)}`
  }
  return d + 'Z'
})()
