/**
 * Pose library. Every pose is a pure function of (time since the pose started, intensity)
 * returning a full set of rig values; the component blends between poses with an
 * overshooting ease so every change gets anticipation → overshoot → settle for free.
 */
import type { TungPose } from '../types'
import {
  BAT_REACH,
  D2R,
  FOREARM,
  GRIP,
  SHOULDER,
  TAU,
  UPPER_ARM,
  clamp,
  dir,
  easeInCubic,
  easeInOutCubic,
  easeInOutSine,
  easeOutCubic,
  ik2,
  jitter,
  lerp,
  noise,
  smooth,
  torsoPoint,
  type Side,
  type TorsoXf,
  type Vec,
} from './geometry'

export interface Rig extends TorsoXf {
  /** whole body, pivot at the feet */
  x: number
  y: number
  rot: number
  sx: number
  sy: number
  /** face sliding around the log (3/4 turn) */
  faceX: number
  /** arms: upper / fore angles relative to the torso, rubber-hose stretch */
  rA1: number
  rA2: number
  rS: number
  lA1: number
  lA2: number
  lS: number
  /** 0..1 left hand snapped onto the bat handle */
  lGrip: number
  /** bat pointing angle relative to the torso, foreshortening along its axis */
  bat: number
  batL: number
  /** foot offsets from rest (root space) + foot rotation */
  rfx: number
  rfy: number
  rfr: number
  lfx: number
  lfy: number
  lfr: number
}

export const BASE: Rig = {
  x: 0,
  y: 0,
  rot: 0,
  sx: 1,
  sy: 1,
  lean: 0,
  tx: 0,
  ty: 0,
  bsx: 1,
  bsy: 1,
  faceX: 0,
  rA1: 3,
  rA2: -1,
  rS: 1,
  lA1: -8,
  lA2: -5,
  lS: 1,
  lGrip: 0,
  bat: 25,
  batL: 1,
  rfx: 0,
  rfy: 0,
  rfr: 0,
  lfx: 0,
  lfy: 0,
  lfr: 0,
}
export const RIG_KEYS = Object.keys(BASE) as (keyof Rig)[]

export type HandShape = 'fist' | 'open' | 'wave' | 'palm'
export type BatMode = 'hand' | 'none' | 'drop'

export interface Puff {
  /** pose-time of the impact */
  t0: number
  x: number
  y: number
  s: number
}

export interface Frame {
  rig: Rig
  /** draw the arm / bat behind the log */
  rBack: boolean
  lBack: boolean
  batBack: boolean
  /** hand shapes when not gripping the bat */
  rHand: HandShape
  lHand: HandShape
  /** elbow side for the left arm when it snaps onto the bat */
  lBend: number
  /** max rubber-hose stretch for that left-arm reach */
  lStretch?: number
  /** bone-length multiplier for that reach (rubber hose: lets a long reach still bend at the elbow) */
  lLen?: number
  /** bat state for this pose ('hand' still respects hasBat) */
  bat: BatMode
  /** eye-look override (face-local px) */
  look?: Vec
  /** dust puffs (most recent impact) */
  puff?: Puff
  puff2?: Puff
  /** impact burst lines at the bat tip */
  burst?: Puff
  stars?: boolean
  /** extra left-hand rotation (deg) */
  lHandRot?: number
  /** absolute left-hand angle (torso-relative), overrides the forearm direction */
  lHandAbs?: number
  rHandRot?: number
}

export interface PoseCtx {
  /** intensity 0..1 */
  k: number
  /** 1 normally, ~0.3 with prefers-reduced-motion */
  calm: number
}

export interface PoseDef {
  fn: (t: number, c: PoseCtx) => Frame
  /** blend-in duration (s) */
  blend: number
  ease: 'back' | 'in' | 'out'
  /** force the bat to rotate one way while blending in (−1 ccw, 1 cw) */
  batDir?: number
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const frame = (rig: Rig, o: Partial<Omit<Frame, 'rig'>> = {}): Frame => ({
  rig,
  rBack: false,
  lBack: false,
  batBack: false,
  rHand: 'open',
  lHand: 'open',
  lBend: -1,
  bat: 'hand',
  ...o,
})

/** world (root-space) joints of an arm */
export function armWorld(r: Rig, side: Side) {
  const sh = torsoPoint(r, SHOULDER[side])
  const s = side === 'r' ? r.rS : r.lS
  const a1 = (side === 'r' ? r.rA1 : r.lA1) + r.lean
  const a2 = (side === 'r' ? r.rA2 : r.lA2) + r.lean
  const d1 = dir(a1)
  const d2 = dir(a2)
  const elbow = { x: sh.x + d1.x * UPPER_ARM * s, y: sh.y + d1.y * UPPER_ARM * s }
  const wrist = { x: elbow.x + d2.x * FOREARM * s, y: elbow.y + d2.y * FOREARM * s }
  const grip = { x: wrist.x + d2.x * GRIP * s, y: wrist.y + d2.y * GRIP * s }
  return { sh, elbow, wrist, grip, a1, a2 }
}

/** solve an arm so its fist lands on a torso-local target */
function ikArm(r: Rig, side: Side, target: Vec, bend: number, maxStretch = 1.3) {
  const res = ik2(SHOULDER[side], target, UPPER_ARM, FOREARM + GRIP, bend, maxStretch, 0.97)
  if (side === 'r') {
    r.rA1 = res.a1
    r.rA2 = res.a2
    r.rS = res.s
  } else {
    r.lA1 = res.a1
    r.lA2 = res.a2
    r.lS = res.s
  }
}

/** like ikArm, but with rubber-hose bones `len`× longer so far targets still get a bent elbow */
function ikArmLong(r: Rig, side: Side, target: Vec, bend: number, len: number) {
  const res = ik2(SHOULDER[side], target, UPPER_ARM * len, (FOREARM + GRIP) * len, bend, 1.12, 0.97)
  if (side === 'r') {
    r.rA1 = res.a1
    r.rA2 = res.a2
    r.rS = res.s * len
  } else {
    r.lA1 = res.a1
    r.lA2 = res.a2
    r.lS = res.s * len
  }
}

/** angle the bat so its tip rests on the ground (to his right / viewer-left) */
function groundBat(r: Rig, groundY = 994, side = 1) {
  const g = armWorld(r, 'r').grip
  const drop = groundY - g.y
  const w = Math.acos(clamp(drop / (BAT_REACH * r.batL), -1, 1)) / D2R
  r.bat = side * w - r.lean
}

/** right-hand grip in torso-local space (ignores torso transform) */
function gripLocal(r: Rig): Vec {
  const sh = SHOULDER.r
  const d1 = dir(r.rA1)
  const d2 = dir(r.rA2)
  return {
    x: sh.x + d1.x * UPPER_ARM * r.rS + d2.x * (FOREARM + GRIP) * r.rS,
    y: sh.y + d1.y * UPPER_ARM * r.rS + d2.y * (FOREARM + GRIP) * r.rS,
  }
}

/** occasional creepy head tilt */
function creepTilt(t: number) {
  const ph = t % 6.4
  if (ph < 3.8) return 0
  const u = ph - 3.8
  const a = u < 0.12 ? smooth(u / 0.12) : u < 1.3 ? 1 : 1 - smooth((u - 1.3) / 0.45)
  return a * 6
}

/* ------------------------------------------------------------------ */
/* poses                                                               */
/* ------------------------------------------------------------------ */

function idle(t: number, c: PoseCtx): Frame {
  const r = { ...BASE }
  const A = (1 + 0.9 * c.k) * c.calm
  const sp = 1 + 0.7 * c.k
  const br = Math.sin(t * 2.1 * sp)
  r.rot = Math.sin(t * 1.1 * sp) * 0.5 * A
  r.lean = Math.sin(t * 0.8 * sp + 0.6) * 2 * A + creepTilt(t) * c.calm
  r.ty = 3 + br * 2.5 * A
  r.bsy = 1 + br * 0.012 * A
  r.bsx = 1 - br * 0.008 * A
  r.faceX = noise(t * 0.35 + 3) * 6 * A
  r.rA1 = 9 + Math.sin(t * 1.1 * sp + 0.4) * 1.5 * A
  r.rA2 = 2
  r.lA1 = -8 + Math.sin(t * 1.25 * sp + 1) * 3 * A
  r.lA2 = -5 + Math.sin(t * 1.25 * sp + 0.2) * 5 * A
  groundBat(r)
  return frame(r)
}

function walk(t: number, c: PoseCtx): Frame {
  const r = { ...BASE }
  const sp = 1 + 0.75 * c.k
  const A = 1 + 0.4 * c.k
  const p = (t / 1.15) * sp * TAU
  const foot = (ph: number) => {
    const lift = Math.max(0, Math.sin(ph))
    return { x: 42 * Math.cos(ph) * A, y: -lift * lift * 118 * A * c.calm, r: -lift * 24 }
  }
  const fr = foot(p)
  const fl = foot(p + Math.PI)
  r.rfx = fr.x
  r.rfy = fr.y
  r.rfr = fr.r
  r.lfx = fl.x
  r.lfy = fl.y
  r.lfr = fl.r
  r.y = -Math.abs(Math.sin(p)) * 12 * A * c.calm
  r.rot = Math.sin(p) * 2.5 * A * c.calm
  r.lean = -8 + Math.sin(2 * p) * 1.6 * c.calm
  r.ty = 10 + Math.cos(2 * p) * 4 * c.calm
  r.bsy = 1 + Math.cos(2 * p) * 0.016 * c.calm
  r.bsx = 1 - Math.cos(2 * p) * 0.01 * c.calm
  r.faceX = -8
  // bat raised in front, bobbing with the step — menacing
  ikArm(r, 'r', { x: 146 + Math.cos(p) * 8, y: 486 + Math.sin(2 * p) * 8 }, 1)
  r.bat = 160 + Math.sin(p) * 7
  r.lA1 = -8 - Math.cos(p) * 24 * A * c.calm
  r.lA2 = r.lA1 - 14
  return frame(r)
}

/**
 * Overhead windup: both fists on the handle right on top of his head, elbows flared out wide
 * (so both arms read clearly on either side of the log), bat cocked back behind the head.
 * The tension builds for as long as the telegraph lasts: he leans further back, the bat cocks
 * further, the front foot lifts for the stomp and the whole thing trembles harder.
 */
function windup(t: number, c: PoseCtx): Frame {
  const r = { ...BASE }
  // quick crouch (gathering), then the long trembling stretch
  const dip = t < 0.3 ? Math.sin((t / 0.3) * Math.PI) : 0
  const cock = smooth((t - 0.12) / 0.85)
  const trem = (0.3 + c.k) * c.calm * (0.35 + 0.65 * cock)
  r.lean = 5 + 13 * cock + jitter(t, 24) * 1.3 * trem
  r.x = 4 + 6 * cock
  r.rot = 1 + 1.5 * cock
  r.ty = 12 + dip * 26 - 6 * cock
  r.bsy = 1.04 - dip * 0.1 + 0.03 * cock
  r.bsx = 0.98 + dip * 0.07 - 0.02 * cock
  r.faceX = -5
  // weight on the back foot, front foot raised for the stomp
  r.rfx = -16 - 10 * cock
  r.rfy = -58 * cock * c.calm
  r.rfr = -22 * cock
  r.lfx = 16
  const jx = jitter(t + 7, 24) * 2.5 * trem
  const jy = jitter(t + 11, 24) * 2.5 * trem
  ikArmLong(r, 'r', { x: 252 + 10 * cock + jx, y: 44 + 6 * cock + jy }, -1, 1.42)
  r.bat = -158 + 30 * cock + jitter(t + 3, 24) * 3 * trem
  r.lGrip = 1
  r.lA1 = -150
  r.lA2 = -170
  return frame(r, { batBack: true, lBend: 1, lStretch: 1.12, lLen: 1.7 })
}

/**
 * Low windup (rig-only pose, telegraphs a low horizontal swing): batter's crouch, both hands on
 * the handle at the back hip, the bat cocked out flat behind him. Reads completely differently
 * from the overhead windup (= slam), so the body says "this one goes along the ground".
 */
function windupLow(t: number, c: PoseCtx): Frame {
  const r = { ...BASE }
  const dip = t < 0.25 ? Math.sin((t / 0.25) * Math.PI) : 0
  const cock = smooth((t - 0.06) / 0.7)
  const trem = (0.3 + c.k) * c.calm * (0.35 + 0.65 * cock)
  r.lean = 7 + 11 * cock + jitter(t, 24) * 1.2 * trem
  r.x = 8 + 10 * cock
  r.rot = 1.5 * cock
  r.ty = 16 + dip * 16 + 30 * cock
  r.bsy = 1 - 0.06 * cock - dip * 0.05
  r.bsx = 1 + 0.05 * cock + dip * 0.04
  r.faceX = -11
  // wide, low stance
  r.rfx = -30 - 10 * cock
  r.lfx = 30 + 8 * cock
  r.lfr = 8 * cock
  const jx = jitter(t + 7, 24) * 2 * trem
  const jy = jitter(t + 11, 24) * 2 * trem
  ikArm(r, 'r', { x: 368 + 16 * cock + jx, y: 556 - 12 * cock + jy }, 1)
  r.bat = -96 - 18 * cock + jitter(t + 3, 24) * 2.5 * trem
  r.lGrip = 1
  return frame(r, { lBend: -1, look: { x: -16, y: 12 } })
}

export const SLAM_IMPACT = 0.12
function slam(t: number, c: PoseCtx): Frame {
  const r = { ...BASE }
  const after = t - SLAM_IMPACT
  const q = after < 0 ? 0 : Math.exp(-after * 6.5) * Math.cos(after * 22)
  const settle = after < 0 ? 0 : smooth(after / 0.9)
  r.lean = -24 + q * -4 + settle * 6
  r.x = -12
  r.ty = 56 + q * 16 - settle * 14
  r.bsy = 1 - 0.17 * q
  r.bsx = 1 + 0.13 * q
  r.faceX = -9
  r.rfx = -26
  r.lfx = 20
  r.rot = -2 * q
  ikArm(r, 'r', { x: 206, y: 646 }, 1)
  r.batL = 0.95
  groundBat(r, 1004)
  r.lGrip = 1
  const tipX = armWorld(r, 'r').grip.x - Math.sin((r.bat + r.lean) * D2R) * BAT_REACH * r.batL
  const imp = { t0: SLAM_IMPACT, x: tipX, y: 1000, s: 1.15 * (1 + 0.4 * c.k) }
  return frame(r, { lBend: -1, puff: imp, burst: imp })
}

function swing(t: number, c: PoseCtx): Frame {
  const r = { ...BASE }
  const P = 1.05 / (1 + 0.6 * c.k)
  const u = (t / P) % 1
  // cocked (behind right shoulder) → fast sweep across the front → follow-through → back over the top
  let b: number
  if (u < 0.3) b = lerp(-128, 118, easeInOutCubic(u / 0.3))
  else if (u < 0.42) b = lerp(118, 128, easeOutCubic((u - 0.3) / 0.12))
  else b = lerp(128, 232, easeInOutSine((u - 0.42) / 0.58))
  const s = Math.sin(b * D2R)
  const co = Math.cos(b * D2R)
  r.bat = b
  r.batL = 0.6 + 0.4 * Math.abs(s)
  ikArm(r, 'r', { x: 288 - 62 * s, y: 478 + 40 * co }, 1)
  r.lGrip = 1
  r.lean = -s * 8 + 2
  r.rot = -s * 3
  r.x = -s * 8
  r.faceX = -s * 10 - 2
  r.ty = 10 + Math.max(0, co) * 10
  r.rfx = -10 - s * 6
  r.lfx = 14 - s * 6
  return frame(r, { batBack: Math.abs(((b + 540) % 360) - 180) > 96, lBend: -1 })
}

export const THROW_RELEASE = 0.34
const THROW_BACK: Partial<Rig> = { lean: 11, ty: 18, rot: 2, x: 8, faceX: -2, rA1: 168, rA2: 222, bat: -48, rfx: 10, lfx: 22, lA1: -40, lA2: -70 }
const THROW_FWD: Partial<Rig> = { lean: -17, ty: 22, rot: -3, x: -16, faceX: -11, rA1: 68, rA2: 62, bat: -285, rfx: -42, lfx: 12, lA1: 18, lA2: 30 }
function throwPose(t: number, c: PoseCtx): Frame {
  const r = { ...BASE }
  const f = easeInCubic(clamp((t - 0.22) / 0.13, 0, 1))
  for (const key of Object.keys(THROW_BACK) as (keyof Rig)[]) {
    r[key] = lerp(THROW_BACK[key] as number, THROW_FWD[key] as number, f)
  }
  // follow-through settle + breathing
  const after = Math.max(0, t - 0.35)
  const wob = Math.exp(-after * 5) * Math.sin(after * 16)
  r.rA1 += wob * 10
  r.rA2 += wob * 16
  r.lean += wob * 2 + (after > 0 ? Math.sin(after * 3) * 0.8 * c.calm : 0)
  return frame(r, { rBack: f < 0.3, batBack: f < 0.45 })
}

function taunt(t: number, c: PoseCtx): Frame {
  const r = { ...BASE }
  const P = 0.66 / (1 + 0.6 * c.k)
  const u = (t / P) % 1
  const lift = u < 0.55 ? easeOutCubic(u / 0.55) : u < 0.7 ? 1 - easeInCubic((u - 0.55) / 0.15) : 0
  const hitT = u >= 0.7 ? (u - 0.7) * P : (u + 0.3) * P
  const hit = Math.exp(-hitT * 16)
  const A = (1 + 0.5 * c.k) * c.calm
  r.y = -lift * 14 * A
  r.ty = 8 + hit * 8
  r.bsy = 1 - hit * 0.035 + lift * 0.02
  r.bsx = 1 + hit * 0.025
  r.lean = -3 + lift * 3 - hit * 2
  r.rot = Math.sin((t / P) * Math.PI) * 2 * A
  r.faceX = 4
  ikArm(r, 'r', { x: 184, y: 604 - lift * 10 }, 1)
  const rest = -103
  r.bat = rest - lift * 34 * (1 + 0.3 * c.k)
  // palm sits under the barrel's sweet spot
  const g = gripLocal({ ...r, bat: rest })
  const d = dir(rest)
  ikArm(r, 'l', { x: g.x + d.x * 268, y: g.y + d.y * 268 + 22 + hit * 9 }, -1)
  return frame(r, { lHand: 'palm', lHandAbs: -75 + hit * 12 })
}

function dizzy(t: number, c: PoseCtx): Frame {
  const r = { ...BASE }
  const sp = 1 + 0.5 * c.k
  const A = (1 + 0.5 * c.k) * c.calm
  const w = t * 3.4 * sp
  r.x = Math.sin(w) * 22 * A
  r.rot = Math.sin(w + 1.2) * 7 * A
  r.y = -Math.abs(Math.sin(w)) * 4 * A
  r.lean = Math.cos(w) * 9 * A
  r.ty = 8
  r.bsy = 1 + Math.sin(w * 2) * 0.015 * A
  r.faceX = Math.sin(w + 0.5) * 9 * A
  r.rA1 = 14 + Math.sin(w + 0.6) * 18 * A
  r.rA2 = r.rA1 + Math.sin(w + 1.4) * 16 * A
  r.lA1 = -14 + Math.sin(w + 0.9) * 18 * A
  r.lA2 = r.lA1 + Math.sin(w + 1.7) * 16 * A
  r.rfx = Math.sin(w) * 14 * A
  r.rfy = -Math.max(0, Math.sin(w * 2)) * 18 * A
  r.lfx = Math.sin(w + 2) * 14 * A
  r.lfy = -Math.max(0, -Math.sin(w * 2)) * 18 * A
  groundBat(r)
  return frame(r, { stars: true })
}

function exhausted(t: number, c: PoseCtx): Frame {
  const r = { ...BASE }
  const p = Math.sin(t * TAU * 3.1 * (1 + 0.5 * c.k)) * c.calm
  r.lean = -13 + p * 1.4
  r.ty = 30 + p * 4
  r.bsy = 1 + p * 0.024
  r.bsx = 1 - p * 0.015
  r.rot = -1.5
  r.faceX = -4
  r.rfx = -12
  r.lfx = 14
  r.rA1 = 16 + p * 2
  r.rA2 = 20 + p * 3
  r.lA1 = 9 + p * 2
  r.lA2 = 14 + p * 3
  groundBat(r)
  return frame(r)
}

export const DROP_RELEASE = 0.5
function dropBat(t: number, c: PoseCtx): Frame {
  const r = { ...BASE }
  const pre = clamp(t / DROP_RELEASE, 0, 1)
  const after = Math.max(0, t - DROP_RELEASE)
  const sag = smooth(after / 0.5)
  r.lean = -5 - sag * 6
  r.ty = 12 + sag * 14
  r.faceX = -10
  r.rot = -1
  r.lA1 = 6
  r.lA2 = 10
  if (t < DROP_RELEASE) {
    // holding it up, it's too heavy: trembling, wrist giving way
    const trem = Math.sin(t * 52) * (1 + pre * 4) * c.calm
    ikArm(r, 'r', { x: 132, y: 500 + pre * pre * 46 }, 1)
    r.rA1 += trem * 0.4
    r.bat = 168 - pre * pre * 40 + trem
  } else {
    // relief: the empty arm floats up, then hangs
    const k = Math.exp(-after * 5) * Math.sin(after * 13)
    r.rA1 = 14 + k * 26
    r.rA2 = 10 + k * 34
  }
  const land = DROP_RELEASE + DROP_FALL
  return frame(r, {
    bat: t < DROP_RELEASE ? 'hand' : 'drop',
    look: { x: -12, y: 12 },
    puff: { t0: land, x: 20, y: 990, s: 0.8 },
    puff2: { t0: land + 0.17, x: 220, y: 1000, s: 0.7 },
  })
}

function wave(t: number, c: PoseCtx): Frame {
  const r = { ...BASE }
  const sp = 1 + 0.5 * c.k
  const w = Math.sin(t * TAU * 2.1 * sp)
  const A = c.calm
  r.lean = -2 + Math.sin(t * TAU * 1.05 * sp) * 2 * A
  r.rot = Math.sin(t * 3) * 1.2 * A
  r.ty = 3 + Math.abs(w) * 3 * A
  r.faceX = 6
  r.rA1 = 4
  r.rA2 = 0
  r.lA1 = -114 + w * 5 * A
  r.lA2 = -172 + w * 26 * A
  return frame(r, { bat: 'none', lHand: 'wave', lHandRot: w * 10 * A })
}

function hop(t: number, c: PoseCtx): Frame {
  const r = { ...BASE }
  const P = 0.62 / (1 + 0.45 * c.k)
  const u = (t / P) % 1
  const H = 120 * (1 + 0.5 * c.k) * c.calm
  const air = u >= 0.26 && u < 0.84
  const v = air ? (u - 0.26) / 0.58 : 0
  // ground phase 0 (landing) → 1 (takeoff)
  const g = air ? 0 : u < 0.26 ? (u + 0.16) / 0.42 : (u - 0.84) / 0.42
  const crouch = air ? 0 : Math.sin(Math.PI * g)
  r.y = air ? -H * Math.sin(Math.PI * v) : 0
  r.ty = 6 + crouch * 36
  r.bsy = 1 - crouch * 0.12 + (air ? 0.09 * (1 - v) - 0.05 * v : 0)
  r.bsx = 1 + crouch * 0.09 - (air ? 0.06 * (1 - v) : 0)
  r.rot = air ? Math.sin(Math.PI * v) * -4 : 0
  r.lean = air ? -3 + 6 * v : -crouch * 5
  const tuck = air ? Math.sin(Math.PI * v) : 0
  r.rfy = -tuck * 46
  r.lfy = -tuck * 30
  r.rfx = -tuck * 10
  r.rfr = -tuck * 18
  r.lfr = -tuck * 12
  r.faceX = -3
  r.rA1 = 40 + tuck * 60 - crouch * 20
  r.rA2 = r.rA1 + 40 + tuck * 30
  r.bat = 150 + tuck * 20
  r.lA1 = -30 - tuck * 70 + crouch * 16
  r.lA2 = r.lA1 - 30 - tuck * 20
  const n = Math.floor(t / P - 0.84)
  const puff = n >= 0 ? { t0: (n + 0.84) * P, x: 290, y: 1000, s: 0.55 } : undefined
  return frame(r, { puff })
}

/** free-falling bat for dropBat (knob position, world angle, foreshortening) */
export const DROP_FALL = 0.34
/** bounce time after the bat lands */
export const DROP_SETTLE = 0.5
const DROP_REST = { kx: 236, ky: 994, b: 95, l: 0.56 }
export function dropBatXf(t: number, snap: { kx: number; ky: number; b: number; l: number }) {
  const tau = t - DROP_RELEASE
  if (tau < DROP_FALL) {
    const u = tau / DROP_FALL
    const g = u * u
    return {
      kx: lerp(snap.kx, DROP_REST.kx, easeOutCubic(u)),
      ky: lerp(snap.ky, DROP_REST.ky - 40, g) - Math.sin(u * Math.PI) * 30,
      b: lerp(snap.b, DROP_REST.b - 14, g),
      l: lerp(snap.l, DROP_REST.l, u),
    }
  }
  // clatter: knob end bounces twice then rests flat
  const a = tau - DROP_FALL
  const land = smooth(a / 0.08)
  const bounce = a < DROP_SETTLE ? Math.abs(Math.sin((a / 0.25) * Math.PI)) * Math.exp(-a * 7) : 0
  return {
    kx: DROP_REST.kx,
    ky: lerp(DROP_REST.ky - 40, DROP_REST.ky, land) - bounce * 34,
    b: lerp(DROP_REST.b - 14, DROP_REST.b, land) - bounce * 6,
    l: DROP_REST.l,
  }
}

/** the shared poses plus rig-only extras (scenes that know the rig may use them) */
export type RigPose = TungPose | 'windupLow'

export const POSES: Record<RigPose, PoseDef> = {
  idle: { fn: idle, blend: 0.42, ease: 'back' },
  walk: { fn: walk, blend: 0.3, ease: 'back' },
  windup: { fn: windup, blend: 0.36, ease: 'back' },
  windupLow: { fn: windupLow, blend: 0.3, ease: 'back', batDir: -1 },
  slam: { fn: slam, blend: SLAM_IMPACT, ease: 'in', batDir: -1 },
  swing: { fn: swing, blend: 0.3, ease: 'out' },
  throw: { fn: throwPose, blend: 0.22, ease: 'out' },
  taunt: { fn: taunt, blend: 0.3, ease: 'back' },
  dizzy: { fn: dizzy, blend: 0.4, ease: 'back' },
  exhausted: { fn: exhausted, blend: 0.5, ease: 'back' },
  // a slow, labored lift before it slips (no whoosh-y overshoot)
  dropBat: { fn: dropBat, blend: 0.55, ease: 'out' },
  wave: { fn: wave, blend: 0.34, ease: 'back' },
  hop: { fn: hop, blend: 0.22, ease: 'out' },
}
