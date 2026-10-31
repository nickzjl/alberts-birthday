/**
 * Cartman's procedural rig: spring-driven pose/expression targets + looping overlays,
 * all simulated in one animation-frame callback and written straight into motion values
 * (no React re-renders while animating).
 */
import type { CartmanExpression, CartmanPose } from '../types'

/* ------------------------------------------------------------------ */
/* Channels                                                             */
/* ------------------------------------------------------------------ */
// Every spring-simulated number. Order doesn't matter; names are the API.
export const CHANNELS = [
  // whole body
  'rootX', 'rootY', 'rootRot', 'bodySX', 'bodySY', 'shadowSX', 'flip',
  // head
  'headRot', 'headY',
  // arms (screen-left = L; R is drawn mirrored so the same numbers mean "outward")
  'armLRot', 'armLStretch', 'handLRot', 'handLScale',
  'armRRot', 'armRStretch', 'handRRot', 'handRScale',
  // legs (R mirrored as well)
  'legLRot', 'legLY', 'legLStretch', 'legRRot', 'legRY', 'legRStretch', 'soles',
  // face
  'lid', 'lidTilt', 'lowLid', 'eyeS', 'eyeSY', 'pupilS', 'px', 'py', 'pupilIn',
  'brow', 'browY', 'browTilt', 'squint', 'cheeks', 'red', 'exprTilt', 'exprLift', 'exprPuff',
  // mouth
  'mw', 'mtop', 'mbot', 'mlc', 'mrc', 'mrt', 'mrb', 'mdx', 'mdy', 'teeth', 'clench', 'tongue',
] as const
export type Channel = (typeof CHANNELS)[number]
export type Targets = Record<Channel, number>

/** stiffness / damping per channel group */
const SPRING_POSE = { k: 190, c: 14 } // bouncy, overshooting body moves
const SPRING_ROT = { k: 150, c: 15 } // big whole-body rotations (tantrum)
const SPRING_FACE = { k: 420, c: 23 }
const SPRING_MOUTH = { k: 950, c: 34 }
const SPRING_RED = { k: 60, c: 13 } // flush creeps in

export function springFor(ch: Channel) {
  if (ch === 'red') return SPRING_RED
  if (ch === 'rootRot' || ch === 'flip') return SPRING_ROT
  if (ch.startsWith('m') || ch === 'teeth' || ch === 'clench' || ch === 'tongue') return SPRING_MOUTH
  if (CHANNELS.indexOf(ch) >= CHANNELS.indexOf('lid')) return SPRING_FACE
  return SPRING_POSE
}

/* ------------------------------------------------------------------ */
/* Poses                                                                */
/* ------------------------------------------------------------------ */
export type HandKind = 'open' | 'fist' | 'point'

export interface PoseDef {
  t: Partial<Targets>
  handL: HandKind
  handR: HandKind
}

const BODY_DEFAULTS: Partial<Targets> = {
  rootX: 0, rootY: 0, rootRot: 0, bodySX: 1, bodySY: 1, shadowSX: 1,
  headRot: 0, headY: 0,
  armLRot: 58, armLStretch: 1, handLRot: 26, handLScale: 1.1,
  armRRot: 58, armRStretch: 1, handRRot: 26, handRScale: 1.1,
  legLRot: 0, legLY: 0, legLStretch: 1, legRRot: 0, legRY: 0, legRStretch: 1, soles: 0,
}

export const POSES: Record<CartmanPose, PoseDef> = {
  idle: { t: {}, handL: 'open', handR: 'open' },
  handsOnHips: {
    t: { armLRot: 66, armRRot: 66, armLStretch: 0.8, armRStretch: 0.8, handLRot: -150, handRRot: -150, headRot: -3, headY: -3, bodySX: 1.025 },
    handL: 'fist', handR: 'fist',
  },
  pointing: {
    // finger stays inside the box even with the scene's squash on top (was poking ~4% past it)
    t: { armLRot: 76, armLStretch: 0.8, handLRot: -6, handLScale: 1.3, armRRot: 22, rootRot: -2.5, headRot: -4, rootX: 27 },
    handL: 'point', handR: 'open',
  },
  fistShake: {
    t: { armLRot: 158, armRRot: 158, armLStretch: 1.22, armRStretch: 1.22, handLRot: 180, handRRot: 180, handLScale: 1.1, handRScale: 1.1, rootY: -4, headY: 2 },
    handL: 'fist', handR: 'fist',
  },
  stomp: {
    t: { armLRot: 48, armRRot: 48, handLRot: 10, handRRot: 10 },
    handL: 'fist', handR: 'fist',
  },
  tantrum: {
    // flat on his back in the snow, facing us: shoe soles kick at the camera, fists pound the ground,
    // head thrashes. The face stays upright (readable at phone size) and the figure stays inside his box.
    t: { rootY: 13, bodySX: 1, bodySY: 0.9, shadowSX: 1.1, headY: 9, armLRot: 36, armRRot: 36, armLStretch: 0.96, armRStretch: 0.96, handLRot: 8, handRRot: 8, handLScale: 1.12, handRScale: 1.12, legLRot: 30, legRRot: 30, legLY: -22, legRY: -22, legLStretch: 0.8, legRStretch: 0.8, soles: 1 },
    handL: 'fist', handR: 'fist',
  },
  sitting: {
    t: { rootY: 18, bodySX: 1.05, bodySY: 0.95, headRot: 5, headY: 7, armLRot: 22, armRRot: 22, handLRot: -18, handRRot: -18, legLRot: 30, legRRot: 30, legLY: -22, legRY: -22, legLStretch: 0.8, legRStretch: 0.8, soles: 1, shadowSX: 1.08 },
    handL: 'open', handR: 'open',
  },
  wave: {
    t: { armRRot: 112, armRStretch: 1.15, handRRot: 62, handRScale: 1.15, armLRot: 46, headRot: 3, rootRot: 1.5 },
    handL: 'open', handR: 'open',
  },
}

export function poseTargets(pose: CartmanPose): Partial<Targets> {
  return { ...BODY_DEFAULTS, ...(POSES[pose] ?? POSES.idle).t }
}

/* ------------------------------------------------------------------ */
/* Expressions                                                          */
/* ------------------------------------------------------------------ */
const FACE_DEFAULTS: Partial<Targets> = {
  lid: 0, lidTilt: 0, lowLid: 0, eyeS: 1, eyeSY: 1, pupilS: 1, px: 0, py: 0, pupilIn: 14,
  brow: 0, browY: 0, browTilt: 0, squint: 0, cheeks: 0, red: 0, exprTilt: 0, exprLift: 0, exprPuff: 0,
  mw: 20, mtop: 2, mbot: 15, mlc: -1, mrc: -3, mrt: 0.2, mrb: 0.18, mdx: 1, mdy: 0, teeth: 1, clench: 0, tongue: 0,
}

export const FACES: Record<CartmanExpression, Partial<Targets>> = {
  // the classic little open mouth with top teeth (reference image 2)
  neutral: {},
  smug: { lid: 0.48, lidTilt: -4, pupilIn: 6, py: -1, exprTilt: -4, exprLift: -2, mw: 19, mtop: -1, mbot: 2.6, mlc: 3, mrc: -8, mrt: 0.5, mrb: 0.5, mdx: 4, teeth: 0 },
  annoyed: { lid: 0.34, lidTilt: 11, brow: 1, browTilt: 12, browY: 3, pupilS: 0.85, pupilIn: 10, mw: 16, mtop: 1, mbot: 1.6, mlc: 3.5, mrc: 3.5, mrt: 0.5, mrb: 0.5, teeth: 0 },
  angry: { lid: 0.3, lidTilt: 22, brow: 1, browTilt: 26, browY: 6, pupilS: 0.75, pupilIn: 12, cheeks: 0.75, red: 0.18, exprPuff: 0.02, mw: 30, mtop: 6, mbot: 31, mlc: 0, mrc: 0, mrt: 0.92, mrb: 0.72, teeth: 1, tongue: 0.9 },
  furious: { lid: 0.34, lidTilt: 30, brow: 1, browTilt: 32, browY: 8, pupilS: 0.42, pupilIn: 8, cheeks: 0.4, red: 1, exprPuff: 0.035, exprLift: 2, mw: 28, mtop: 8, mbot: 8, mlc: 1.5, mrc: 1.5, mrt: 0.96, mrb: 0.96, teeth: 0, clench: 1 },
  crying: { squint: 1, eyeSY: 0.02, brow: 1, browTilt: -18, browY: 4, cheeks: 0.55, red: 0.35, exprTilt: 0, exprLift: -3, mw: 31, mtop: 9, mbot: 32, mlc: 5, mrc: 5, mrt: 0.6, mrb: 0.85, mdy: 2, teeth: 1, tongue: 1 },
  sheepish: { lid: 0.18, lidTilt: -10, px: -9, py: 4, pupilIn: 4, brow: 1, browTilt: -14, browY: 2, cheeks: 1, exprTilt: 5, exprLift: 3, mw: 9, mtop: 0.5, mbot: 3, mlc: 1.5, mrc: 1.5, mrt: 0.5, mrb: 0.5, mdx: -3, teeth: 0 },
  happy: { lowLid: 0.17, pupilS: 1.25, pupilIn: 12, cheeks: 0.45, exprLift: -3, mw: 34, mtop: -3, mbot: 27, mlc: -9, mrc: -9, mrt: 0.15, mrb: 0.9, teeth: 1, tongue: 0.7 },
  shocked: { eyeS: 1.13, pupilS: 0.42, pupilIn: 0, exprLift: -5, mw: 11, mtop: 12, mbot: 14, mlc: 0, mrc: 0, mrt: 0.55, mrb: 0.55, mdy: 3, teeth: 0, tongue: 0.5 },
}

export function faceTargets(expr: CartmanExpression): Partial<Targets> {
  return { ...FACE_DEFAULTS, ...FACES[expr] }
}

/* ------------------------------------------------------------------ */
/* Loops (additive offsets, evaluated every frame)                      */
/* ------------------------------------------------------------------ */
export const OFFSET_KEYS = [
  'rootX', 'rootY', 'rootRot', 'bodySX', 'bodySY', 'headRot', 'headY', 'headS',
  'armLRot', 'armRRot', 'armLStretch', 'armRStretch', 'handLRot', 'handRRot', 'handLScale',
  'legLRot', 'legRRot', 'legLY', 'legRY', 'legLStretch', 'legRStretch',
  'soleLY', 'soleRY', 'soleLS', 'soleRS', 'handRScale',
  'dustL', 'dustR', 'mlc', 'mrc', 'px', 'pom',
] as const
export type OffsetKey = (typeof OFFSET_KEYS)[number]
export type Offsets = Record<OffsetKey, number>

export function zeroOffsets(): Offsets {
  const o = {} as Offsets
  for (const k of OFFSET_KEYS) o[k] = 0
  return o
}

const TAU = Math.PI * 2
const S = Math.sin

/** stomp helper: x in [0,1) of one step → lift (0..1) and impact (decaying after landing) */
function stompCurve(x: number) {
  const up = 0.62
  if (x < up) return { lift: Math.pow(S((Math.PI * x) / up), 0.75), impact: 0 }
  return { lift: 0, impact: Math.exp(-(x - up) * 7) }
}

/** tantrum kick: x in [0,2) of one leg's cycle → sole lift (kicks up for the first half) and the slam after it */
function kickCurve(x: number) {
  if (x < 1) return { lift: Math.pow(S(Math.PI * x), 0.7), impact: 0 }
  return { lift: 0, impact: Math.exp(-(x - 1) * 7) }
}

/** tantrum fist: x in [0,2) → arm raise (slow wind-up, fast slam into the snow) and the impact after it */
function poundCurve(x: number) {
  const up = 1.25
  const slam = 1.5
  if (x < up) return { raise: 0.5 - 0.5 * Math.cos((Math.PI * x) / up), impact: 0 }
  if (x < slam) {
    const q = (x - up) / (slam - up)
    return { raise: 1 - q * q, impact: 0 }
  }
  return { raise: 0, impact: Math.exp(-(x - slam) * 8) }
}

type LoopFn = (t: number, k: number, w: number, o: Offsets) => void

export const POSE_LOOPS: Record<CartmanPose, LoopFn> = {
  idle(t, _k, w, o) {
    o.armLRot += w * 2.5 * S(TAU * 0.5 * t)
    o.armRRot += w * 2.5 * S(TAU * 0.5 * t + 0.8)
  },
  handsOnHips(t, k, w, o) {
    // indignant huffing
    const f = 0.5 + 0.6 * k
    o.rootRot += w * 1.6 * S(TAU * f * t)
    o.headRot += w * 2.2 * S(TAU * f * t + 0.9)
    o.bodySX += w * 0.012 * Math.max(0, S(TAU * f * 2 * t))
  },
  pointing(t, k, w, o) {
    // "YOU. YOU. YOU."
    const f = 1.3 + 1.6 * k
    const j = Math.pow(0.5 + 0.5 * S(TAU * f * t), 3)
    o.armLStretch += w * 0.14 * j * (0.6 + k)
    o.handLScale += w * 0.1 * j
    o.rootRot += w * -1.4 * j
    o.headY += w * 1.6 * j
  },
  fistShake(t, k, w, o) {
    const f = 4 + 6 * k
    const a = S(TAU * f * t)
    const b = S(TAU * f * t + Math.PI * 0.7)
    const amp = 9 + 9 * k
    o.armLRot += w * amp * a
    o.armRRot += w * amp * b
    o.handLRot += w * 14 * a
    o.handRRot += w * 14 * b
    o.rootY += w * -2 * Math.abs(a)
    o.headRot += w * (2 + 2 * k) * S(TAU * f * 0.5 * t)
    o.bodySY += w * 0.012 * a
  },
  stomp(t, k, w, o) {
    const period = 0.62 - 0.24 * k
    const u = (t / period) % 2
    const left = u < 1
    const { lift, impact } = stompCurve(left ? u : u - 1)
    const side = left ? 1 : -1
    const liftPx = 20 + 10 * k
    if (left) {
      o.legLY -= w * liftPx * lift
      o.legLRot += w * 12 * lift
    } else {
      o.legRY -= w * liftPx * lift
      o.legRRot += w * 12 * lift
    }
    o.rootRot += w * side * 4 * lift
    o.rootY += w * (-5 * lift + 5 * impact)
    o.bodySY += w * (0.02 * lift - 0.07 * impact)
    o.bodySX += w * 0.06 * impact
    o.headY += w * 5 * impact
    o.headRot += w * side * -3 * lift
    o.armLRot += w * (left ? 14 : -6) * lift
    o.armRRot += w * (left ? -6 : 14) * lift
    if (left) o.dustL += w * impact
    else o.dustR += w * impact
  },
  tantrum(t, k, w, o) {
    // one kick = P seconds; the legs alternate, each fist pounds in between (slow wind-up, fast slam)
    const P = 0.3 - 0.05 * k
    const u = t / P
    const kL = kickCurve(u % 2)
    const kR = kickCurve((u + 1) % 2)
    const lift = 34 + 14 * k
    o.soleLY -= w * lift * kL.lift
    o.soleRY -= w * lift * kR.lift
    o.soleLS += w * 0.26 * kL.lift
    o.soleRS += w * 0.26 * kR.lift
    o.dustL += w * 0.9 * kL.impact
    o.dustR += w * 0.9 * kR.impact
    const pL = poundCurve((u + 0.5) % 2)
    const pR = poundCurve((u + 1.5) % 2)
    o.armLRot += w * 112 * pL.raise
    o.armRRot += w * 112 * pR.raise
    o.handLRot += w * 26 * pL.raise
    o.handRRot += w * 26 * pR.raise
    o.handLScale += w * 0.14 * pL.impact
    o.handRScale += w * 0.14 * pR.impact
    // every slam (heel or fist) jolts the whole body
    const jolt = Math.max(kL.impact, kR.impact) * 0.7 + Math.max(pL.impact, pR.impact) * 0.5
    o.rootY += w * 3.5 * jolt
    o.bodySY -= w * 0.035 * jolt
    o.bodySX += w * 0.02 * jolt
    // rolling side to side on his back, head thrashing "NO NO NO"
    o.rootRot += w * 6 * S(TAU * 0.95 * t)
    o.rootX += w * 3 * S(TAU * 0.95 * t)
    o.headRot += w * (8 + 5 * k) * S(TAU * (1.7 + 0.6 * k) * t)
  },
  sitting(t, _k, w, o) {
    o.bodySY += w * 0.012 * S(TAU * 0.3 * t)
    o.headRot += w * 1.6 * S(TAU * 0.22 * t)
  },
  wave(t, k, w, o) {
    const f = 1.25 + 0.9 * k
    o.handRRot += w * 30 * S(TAU * f * t)
    o.armRRot += w * 8 * S(TAU * f * t - 0.6)
    o.headRot += w * 1.6 * S(TAU * f * 0.5 * t)
  },
}

export const EXPR_LOOPS: Partial<Record<CartmanExpression, LoopFn>> = {
  crying(t, k, w, o) {
    // sobbing shudders + wailing side to side
    const sob = Math.pow(Math.max(0, S(TAU * (1.8 + k) * t)), 3)
    o.bodySY += w * 0.03 * sob
    o.headY += w * -2.5 * sob
    o.headRot += w * (3 + 3 * k) * S(TAU * 0.9 * t)
  },
  sheepish(t, _k, w, o) {
    o.mlc += w * 1.4 * S(TAU * 6.5 * t)
    o.mrc += w * 1.4 * S(TAU * 6.5 * t + Math.PI)
    o.rootRot += w * 1.4 * S(TAU * 0.6 * t)
    o.px += w * 1.5 * S(TAU * 0.35 * t)
  },
  happy(t, k, w, o) {
    o.rootY += w * -(2 + 3 * k) * Math.abs(S(TAU * (1.1 + k) * t))
  },
  smug(t, _k, w, o) {
    o.headRot += w * 1.5 * S(TAU * 0.4 * t)
  },
}

/** extra trembling per expression (px of root jitter at intensity 0 and 1) */
export const TREMBLE: Partial<Record<CartmanExpression, [number, number]>> = {
  angry: [0.6, 2.6],
  furious: [1.2, 3.6],
  crying: [0.3, 1.2],
  shocked: [0, 1],
}

/** linear rgb mix of two #rrggbb colors */
export function mixHex(a: string, b: string, p: number) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const c = (sh: number) => {
    const x = (pa >> sh) & 255
    const y = (pb >> sh) & 255
    return Math.round(x + (y - x) * p)
  }
  return `rgb(${c(16)},${c(8)},${c(0)})`
}

/** mouth outline as a 4-quadrant cubic path (same structure for every shape so it morphs) */
export function mouthPath(cx: number, cy: number, w: number, top: number, bot: number, lc: number, rc: number, rt: number, rb: number) {
  const lx = cx - w
  const ly = cy + lc
  const rx = cx + w
  const ry = cy + rc
  const tx = cx
  const ty = cy - top
  const bx = cx
  const by = cy + bot
  const f = (n: number) => n.toFixed(2)
  return (
    `M${f(lx)} ${f(ly)}` +
    `C${f(lx)} ${f(ly + (ty - ly) * rt)} ${f(tx - (tx - lx) * rt)} ${f(ty)} ${f(tx)} ${f(ty)}` +
    `C${f(tx + (rx - tx) * rt)} ${f(ty)} ${f(rx)} ${f(ry + (ty - ry) * rt)} ${f(rx)} ${f(ry)}` +
    `C${f(rx)} ${f(ry + (by - ry) * rb)} ${f(bx + (rx - bx) * rb)} ${f(by)} ${f(bx)} ${f(by)}` +
    `C${f(bx - (bx - lx) * rb)} ${f(by)} ${f(lx)} ${f(ly + (by - ly) * rb)} ${f(lx)} ${f(ly)}Z`
  )
}
