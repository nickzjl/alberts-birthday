/**
 * Tung Tung Tung Sahur — geometry, palette and rig math.
 * ViewBox 580×1000 (aspect 0.58), feet on y=1000, log centred on x=290.
 *
 * Angle convention used by the whole rig: 0° = pointing straight down, +90° = pointing
 * left on screen, 180° = up, −90° = right. This matches SVG `rotate()` for a limb drawn
 * pointing down (+y), so a limb group is simply `translate(joint) rotate(angle)`.
 */

export const VB_W = 580
export const VB_H = 1000
export const GROUND_Y = 1000

export type Vec = { x: number; y: number }
export type Side = 'r' | 'l'

/** torso pivot (bottom centre of the log) */
export const PELVIS: Vec = { x: 290, y: 634 }
/** his right (viewer-left, bat arm) and left (viewer-right) shoulders, torso-local */
export const SHOULDER: Record<Side, Vec> = { r: { x: 195, y: 368 }, l: { x: 385, y: 368 } }
export const HIP: Record<Side, Vec> = { r: { x: 260, y: 622 }, l: { x: 322, y: 622 } }
/** resting ankle positions (root space) */
export const ANKLE: Record<Side, Vec> = { r: { x: 254, y: 962 }, l: { x: 330, y: 962 } }

export const UPPER_ARM = 126
export const FOREARM = 118
/** wrist → centre of the fist */
export const GRIP = 23
/** hands & feet are drawn small and scaled up */
export const HAND_SCALE = 1.38
export const FOOT_SCALE = 1.4
export const THIGH = 167.5
export const SHIN = 168

export const BAT_LEN = 440
/** knob → right-hand grip */
export const BAT_GRIP = 30
/** grip → tip */
export const BAT_REACH = BAT_LEN - BAT_GRIP
/** right grip → left grip (two-handed poses) */
export const BAT_GRIP2 = 40

/** face anchor (torso-local) */
export const FACE = { cx: 280, eyeY: 214, eyeDX: 50, eyeR: 39, browY: 164, mouthY: 352 }

export const C = {
  ink: '#1b0b0c',
  woodHi: '#e6a35c',
  wood: '#c77a3a',
  woodMid: '#a85e2a',
  woodDark: '#6e3a17',
  woodDeep: '#4a240c',
  grain: '#5a2c10',
  endGrain: '#efc285',
  limb: '#c06b2e',
  limbHi: '#eda865',
  batHi: '#f6d199',
  bat: '#dca263',
  batMid: '#c0813f',
  batDark: '#8a5222',
  sclera: '#fff8ec',
  iris: '#6a3815',
  irisDark: '#2e1505',
  pupil: '#120604',
  brow: '#24100a',
  mouth: '#2a0c06',
  teeth: '#fff6e6',
  tongue: '#ec5f86',
  tongueDark: '#b8325a',
  blush: '#ff5f8f',
  sweat: '#9fe8ff',
  vein: '#ff3b4e',
  dust: '#efe6ff',
  star: '#ffd23f',
  rim: '#c9b3ff',
}

export const D2R = Math.PI / 180
export const TAU = Math.PI * 2

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (t: number) => {
  const u = clamp(t, 0, 1)
  return u * u * (3 - 2 * u)
}
export const easeOutBack = (u: number, s = 1.45) => {
  const v = u - 1
  return 1 + (s + 1) * v * v * v + s * v * v
}
export const easeInQuad = (u: number) => u * u
export const easeInCubic = (u: number) => u * u * u
export const easeOutCubic = (u: number) => 1 - (1 - u) ** 3
export const easeInOutCubic = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2)
export const easeInOutSine = (u: number) => -(Math.cos(Math.PI * u) - 1) / 2

/** unit vector for a rig angle */
export const dir = (a: number): Vec => ({ x: -Math.sin(a * D2R), y: Math.cos(a * D2R) })
/** rig angle of a vector */
export const angleOf = (x: number, y: number) => Math.atan2(-x, y) / D2R
/** wrap angle `a` to within ±180° of `ref` */
export const near = (a: number, ref: number) => a - 360 * Math.round((a - ref) / 360)
/** wrap `a` so that travelling from `ref` to it goes in direction `d` (−1 decreasing, +1 increasing) */
export const toward = (a: number, ref: number, d: number) => {
  // small turns always take the short way
  if (!d || Math.abs(near(a, ref) - ref) < 100) return near(a, ref)
  const m = (((a - ref) % 360) + 360) % 360 // 0..360 increasing distance
  return d > 0 ? ref + m : ref - (m === 0 ? 0 : 360 - m)
}

/** cheap deterministic 1D value noise in −1..1 */
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}
export const noise = (t: number) => {
  const i = Math.floor(t)
  const f = t - i
  return lerp(hash(i), hash(i + 1), f * f * (3 - 2 * f))
}
/** jerky sample-and-hold noise (`rate` steps per second) */
export const jitter = (t: number, rate: number) => hash(Math.floor(t * rate))

/** 2-bone IK. Returns segment angles (rig convention) and a rubber-hose stretch factor. */
export function ik2(from: Vec, to: Vec, l1: number, l2: number, bend: number, maxStretch = 1.3, slack = 1) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  const base = angleOf(dx, dy)
  const reach = l1 + l2
  const s = clamp(dist / (reach * slack), 1, maxStretch)
  const L1 = l1 * s
  const L2 = l2 * s
  const d = clamp(dist, Math.abs(L1 - L2) + 1, L1 + L2 - 0.01)
  const cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)
  const a1 = base + (bend >= 0 ? 1 : -1) * (Math.acos(cosA) / D2R)
  const e = dir(a1)
  const ex = from.x + e.x * L1
  const ey = from.y + e.y * L1
  const a2 = near(angleOf(to.x - ex, to.y - ey), a1)
  return { a1, a2, s }
}

export interface TorsoXf {
  lean: number
  tx: number
  ty: number
  bsx: number
  bsy: number
}

/** torso-local point → root space */
export function torsoPoint(r: TorsoXf, p: Vec): Vec {
  const lx = (p.x - PELVIS.x) * r.bsx
  const ly = (p.y - PELVIS.y) * r.bsy
  const c = Math.cos(r.lean * D2R)
  const s = Math.sin(r.lean * D2R)
  return { x: PELVIS.x + r.tx + lx * c - ly * s, y: PELVIS.y + r.ty + lx * s + ly * c }
}

export const f2 = (n: number) => Math.round(n * 100) / 100
