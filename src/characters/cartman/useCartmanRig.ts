import { motionValue, useAnimationFrame, type MotionValue } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { CartmanExpression, CartmanPose } from '../types'
import { CARTMAN_POSES } from '../types'
import {
  CHANNELS,
  EXPR_LOOPS,
  POSE_LOOPS,
  TREMBLE,
  faceTargets,
  mixHex,
  mouthPath,
  poseTargets,
  springFor,
  zeroOffsets,
  type Targets,
} from './rig'
import { COLORS, EYE, MOUTH } from './geometry'

const OUTPUTS = [
  'flipSX', 'rootX', 'rootY', 'rootRot', 'bodySX', 'bodySY', 'shadowSX', 'shadowO',
  'headRot', 'headY', 'headS', 'pomRot',
  'armLRot', 'armLSY', 'handLY', 'handLRot', 'handLS',
  'armRRot', 'armRSY', 'handRY', 'handRRot', 'handRS',
  'legLRot', 'legLY', 'legLSY', 'legRRot', 'legRY', 'legRSY',
  'dustL', 'dustR', 'dustLS', 'dustRS', 'soleO', 'soleLY', 'soleRY', 'soleLS', 'soleRS', 'shinLT', 'shinLH', 'shinRT', 'shinRH',
  'eyeSX', 'eyeSY', 'lidY', 'lidRotL', 'lidRotR', 'lidLineO', 'lowLidY', 'lowLineO', 'blinkY',
  'pupilLX', 'pupilRX', 'pupilY', 'pupilR',
  'browO', 'browY', 'browRotL', 'browRotR', 'squintO', 'cheeksO', 'redO',
  'mouthX', 'mouthY', 'teethY', 'teethO', 'clenchO', 'tongueY', 'tongueO', 'tongueRX',
] as const
export type RigOutput = (typeof OUTPUTS)[number]
export type Rig = Record<RigOutput, MotionValue<number>> & {
  mouthD: MotionValue<string>
  lidFill: MotionValue<string>
}

export interface RigInput {
  expression: CartmanExpression
  pose: CartmanPose
  talking: boolean
  intensity: number
  redness: number
  flip: boolean
  reduced: boolean
}

interface Sim {
  x: Targets
  v: Targets
  weights: Record<CartmanPose, number>
  exprW: number
  lastExpr: CartmanExpression
  lastPose: CartmanPose
  poseAt: number
  exprAt: number
  talkW: number
  talkOpen: number
  nextMouth: number
  blinkAt: number
  nextBlink: number
  pomA: number
  pomV: number
  lastHeadRot: number
  started: boolean
}

function makeRig(): Rig {
  const r = {} as Record<string, MotionValue<number> | MotionValue<string>>
  for (const k of OUTPUTS) r[k] = motionValue(0)
  r.mouthD = motionValue('')
  r.lidFill = motionValue(COLORS.skin)
  return r as Rig
}

function makeSim(input: RigInput): Sim {
  const x = {} as Targets
  const v = {} as Targets
  const t0 = { ...poseTargets(input.pose), ...faceTargets(input.expression), flip: input.flip ? -1 : 1 }
  for (const ch of CHANNELS) {
    x[ch] = t0[ch] ?? 0
    v[ch] = 0
  }
  const weights = {} as Record<CartmanPose, number>
  for (const p of CARTMAN_POSES) weights[p] = p === input.pose ? 1 : 0
  return {
    x, v, weights, exprW: 1, lastExpr: input.expression, lastPose: input.pose,
    poseAt: -10, exprAt: -10, talkW: 0, talkOpen: 0, nextMouth: 0, blinkAt: -10, nextBlink: 0,
    pomA: 0, pomV: 0, lastHeadRot: 0, started: false,
  }
}

const SPRINGS = CHANNELS.map((ch) => springFor(ch))
const clamp01 = (n: number) => (!(n > 0) ? 0 : n > 1 ? 1 : n)
const TALK_SEQ = [0.9, 0.15, 0.6, 1, 0.3, 0.75, 0, 0.5]

/** points on his silhouette (viewBox units) used to keep a rotating body above the floor */
const HULL: ReadonlyArray<readonly [number, number]> = [
  [20, 290], [380, 290], [11, 322], [389, 322], [40, 356], [360, 356], [66, 371], [334, 371], [200, 380],
  [72, 395], [328, 395], [110, 240], [290, 240], [58, 190], [342, 190], [200, 66],
]
const FLOOR = 400
/** soles scale around this y (the shoe heel line), see CartmanSvg <Soles> */
const SOLE_PIVOT = 372
const ROOT_PIVOT = { x: 200, y: 300 }
function writeSole(base: number, dy: number, ds: number, Y: MotionValue<number>, Sc: MotionValue<number>, T: MotionValue<number>, H: MotionValue<number>) {
  const sc = base * (1 + ds)
  const top = SOLE_PIVOT + (352 - SOLE_PIVOT) * sc + dy
  Y.set(dy)
  Sc.set(sc)
  T.set(top)
  H.set(Math.max(0, 374 - top))
}

/**
 * How far below the floor the rotated body would reach (0 when it doesn't).
 * Mid-roll (getting up from the tantrum) the springs would otherwise swing a hip through the ground.
 */
function floorDip(rotDeg: number, sx: number, sy: number, rootY: number) {
  const a = (rotDeg * Math.PI) / 180
  const sin = Math.sin(a)
  const cos = Math.cos(a)
  let low = -1e9
  for (const [px, py] of HULL) {
    // body scale (origin 200,400) → rotate around the root pivot
    const bx = 200 + (px - 200) * sx - ROOT_PIVOT.x
    const by = 400 + (py - 400) * sy - ROOT_PIVOT.y
    const y = ROOT_PIVOT.y + bx * sin + by * cos + rootY
    if (y > low) low = y
  }
  return Math.max(0, low - FLOOR)
}

/**
 * Runs Cartman's whole animation in a single frame callback and exposes the results as
 * motion values for the SVG (or image) rig to bind to.
 */
export function useCartmanRig(input: RigInput): Rig {
  const [rig] = useState(makeRig)
  const live = useRef(input)
  const sim = useRef<Sim | null>(null)
  if (sim.current === null) sim.current = makeSim(input)

  useEffect(() => {
    live.current = input
  })

  useAnimationFrame((time, delta) => {
    const s = sim.current!
    const p = live.current
    const t = time / 1000
    const k = clamp01(p.intensity)
    const calm = p.reduced ? 0.35 : 1
    let dt = Math.min(Math.max(delta, 0), 64) / 1000
    if (!s.started) {
      s.started = true
      s.nextBlink = t + 1 + Math.random() * 2.5
      dt = 0
    }

    // change detection → impulses
    if (p.pose !== s.lastPose) {
      s.lastPose = p.pose
      s.poseAt = t
    }
    if (p.expression !== s.lastExpr) {
      s.lastExpr = p.expression
      s.exprAt = t
    }

    // targets
    const tgt = { ...poseTargets(p.pose), ...faceTargets(p.expression) } as Targets
    tgt.flip = p.flip ? -1 : 1
    tgt.red = Math.max(tgt.red, clamp01(p.redness))
    // intensity steepens brows / lids
    if (tgt.browTilt > 0) tgt.browTilt += 10 * k
    if (tgt.lidTilt > 0) tgt.lidTilt += 6 * k
    tgt.exprPuff += 0.015 * k

    // talking mouth
    s.talkW += ((p.talking ? 1 : 0) - s.talkW) * Math.min(1, dt * 10)
    if (p.talking) {
      if (t >= s.nextMouth) {
        const i = Math.floor(Math.random() * TALK_SEQ.length)
        let o = TALK_SEQ[i]
        if (Math.abs(o - s.talkOpen) < 0.2) o = 1 - o
        s.talkOpen = o
        s.nextMouth = t + (0.075 + Math.random() * 0.07) * (1 - 0.3 * k)
      }
    } else s.talkOpen = 0
    if (s.talkW > 0.01) {
      const o = s.talkOpen
      const w = s.talkW
      const bot = tgt.mbot * (0.55 + 0.6 * o) + o * (8 + 7 * k)
      tgt.mbot += (bot - tgt.mbot) * w
      tgt.mtop += o * 2.5 * w
      tgt.mw *= 1 + (0.12 * o - 0.06) * w
      if (tgt.clench < 0.5) tgt.teeth = Math.max(tgt.teeth, o > 0.3 ? 1 : 0.4) * w + tgt.teeth * (1 - w)
      tgt.tongue = Math.max(tgt.tongue, 0.5 * o * w)
      if (tgt.mrb < 0.5) tgt.mrb += (0.55 - tgt.mrb) * w
    }

    // springs (substepped for stability)
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < CHANNELS.length; j++) {
        const ch = CHANNELS[j]
        const { k: ks, c } = SPRINGS[j]
        const a = ks * (tgt[ch] - s.x[ch]) - c * s.v[ch]
        s.v[ch] += a * h
        s.x[ch] += s.v[ch] * h
      }
    }

    // pose loop weights (cross-fade loops between poses)
    const fade = Math.min(1, dt * 6)
    for (const key of CARTMAN_POSES) s.weights[key] += ((key === p.pose ? 1 : 0) - s.weights[key]) * fade

    // offsets
    const o = zeroOffsets()
    for (const key of CARTMAN_POSES) {
      const w = s.weights[key] * calm
      if (w > 0.002) POSE_LOOPS[key](t, k, w, o)
    }
    const exprLoop = EXPR_LOOPS[p.expression]
    if (exprLoop) exprLoop(t, k, calm, o)

    // breathing (always; reduced while flailing on the floor)
    const breathW = (1 - 0.7 * s.weights.tantrum) * calm
    const fb = 0.42 + 0.5 * k
    const br = Math.sin(Math.PI * 2 * fb * t)
    o.bodySY += breathW * 0.014 * br
    o.bodySX -= breathW * 0.009 * br
    o.headY += breathW * -1.4 * Math.sin(Math.PI * 2 * fb * t - 0.6)
    o.headRot += breathW * 1.3 * Math.sin(Math.PI * 2 * 0.21 * t)

    // talking bob
    if (s.talkW > 0.01) {
      const ft = 2.8 + 2.6 * k
      o.headY += s.talkW * calm * -(2 + 2 * k) * (0.5 + 0.5 * Math.sin(Math.PI * 2 * ft * t))
      o.headRot += s.talkW * calm * (1.5 + 2.5 * k) * Math.sin(Math.PI * ft * t + 0.3)
      o.bodySY += s.talkW * calm * 0.008 * Math.sin(Math.PI * 2 * ft * t)
    }

    // trembling
    const tr = TREMBLE[p.expression]
    const amp = (tr ? tr[0] + (tr[1] - tr[0]) * k : 1.4 * k * k) * (p.reduced ? 0 : 1)
    if (amp > 0.01) {
      const n1 = Math.sin(t * 71.3) * 0.6 + Math.sin(t * 113.7 + 1.3) * 0.4
      const n2 = Math.sin(t * 83.1 + 0.7) * 0.6 + Math.sin(t * 127.9 + 2.1) * 0.4
      o.rootX += amp * n1
      o.rootY += amp * 0.5 * n2
      o.headRot += amp * 0.45 * n2
      o.px += amp * 0.25 * n1
    }

    // anticipation squash / stretch when the pose changes
    const ep = t - s.poseAt
    if (ep < 1.2) {
      const q = Math.exp(-ep * 6) * Math.sin(ep * 15)
      o.bodySY -= 0.08 * q * calm
      o.bodySX += 0.05 * q * calm
    }
    // face "pop" when the expression changes
    const ee = t - s.exprAt
    if (ee < 1) o.headS += 0.07 * Math.exp(-ee * 8) * Math.sin(ee * 22) * calm

    // blink
    if (t >= s.nextBlink) {
      s.blinkAt = t
      s.nextBlink = t + (Math.random() < 0.2 ? 0.28 : 1.8 + Math.random() * 3.6)
    }
    const eb = t - s.blinkAt
    const blink = eb < 0.06 ? eb / 0.06 : eb < 0.15 ? 1 - (eb - 0.06) / 0.09 : 0

    // pom secondary motion: damped spring dragged by head rotation velocity + bounce
    const x = s.x
    const headRot = x.headRot + x.exprTilt + o.headRot
    const headVel = dt > 0 ? (headRot - s.lastHeadRot) / dt : 0
    s.lastHeadRot = headRot
    const pomTarget = -0.6 * headRot
    for (let i = 0; i < steps; i++) {
      const a = 140 * (pomTarget - s.pomA) - 5 * s.pomV - headVel * 0.9
      s.pomV += a * h
      s.pomA += s.pomV * h
    }
    s.pomA = Math.max(-35, Math.min(35, s.pomA))

    // ---- write outputs ----
    const R = rig
    const rootRot = x.rootRot + o.rootRot
    const bodySX = x.bodySX + o.bodySX + x.exprPuff
    const bodySY = x.bodySY + o.bodySY
    let rootY = x.rootY + o.rootY
    // only big rotation-induced dips are corrected (stomps, sitting, and the rocking tantrum sink into the snow on purpose)
    const rotW = clamp01((Math.abs(rootRot) - 14) / 12)
    if (rotW > 0) rootY -= floorDip(rootRot, bodySX, bodySY, rootY) * rotW
    R.flipSX.set(x.flip)
    R.rootX.set(x.rootX + o.rootX)
    R.rootY.set(rootY)
    R.rootRot.set(rootRot)
    R.bodySX.set(bodySX)
    R.bodySY.set(bodySY)
    R.shadowSX.set(x.shadowSX * (1 + o.bodySX * 0.5))
    R.shadowO.set(1 - 0.35 * clamp01((-o.rootY - 4) / 10))
    R.headRot.set(headRot)
    R.headY.set(x.headY + x.exprLift + o.headY)
    R.headS.set(1 + o.headS)
    R.pomRot.set(s.pomA + o.pom)

    R.armLRot.set(x.armLRot + o.armLRot)
    R.armLSY.set(x.armLStretch + o.armLStretch)
    R.handLY.set(46 * (x.armLStretch + o.armLStretch - 1))
    R.handLRot.set(x.handLRot + o.handLRot)
    R.handLS.set(x.handLScale + o.handLScale)
    R.armRRot.set(x.armRRot + o.armRRot)
    R.armRSY.set(x.armRStretch + o.armRStretch)
    R.handRY.set(46 * (x.armRStretch + o.armRStretch - 1))
    R.handRRot.set(x.handRRot + o.handRRot)
    R.handRS.set(x.handRScale + o.handRScale)

    R.legLRot.set(x.legLRot + o.legLRot)
    R.legLY.set(x.legLY + o.legLY)
    R.legLSY.set(x.legLStretch + o.legLStretch)
    R.legRRot.set(x.legRRot + o.legRRot)
    R.legRY.set(x.legRY + o.legRY)
    R.legRSY.set(x.legRStretch + o.legRStretch)

    R.soleO.set(clamp01(x.soles * 1.4 - 0.2))
    // soles face the camera (sitting / on his back); a kicked sole rises + grows and a pant shin stretches under it
    const soleS = 0.4 + 0.6 * clamp01(x.soles)
    writeSole(soleS, o.soleLY, o.soleLS, R.soleLY, R.soleLS, R.shinLT, R.shinLH)
    writeSole(soleS, o.soleRY, o.soleRS, R.soleRY, R.soleRS, R.shinRT, R.shinRH)
    const dl = clamp01(o.dustL)
    const dr = clamp01(o.dustR)
    R.dustL.set(dl)
    R.dustR.set(dr)
    R.dustLS.set(1.6 - 0.8 * dl)
    R.dustRS.set(1.6 - 0.8 * dr)

    // face
    R.eyeSX.set(x.eyeS)
    R.eyeSY.set(x.eyeS * x.eyeSY)
    R.lidY.set(clamp01(x.lid) * EYE.ry * 2)
    R.lidRotL.set(x.lidTilt)
    R.lidRotR.set(-x.lidTilt)
    R.lidLineO.set(clamp01(x.lid * 12))
    R.lowLidY.set(-clamp01(x.lowLid) * EYE.ry * 2)
    R.lowLineO.set(clamp01(x.lowLid * 12))
    R.blinkY.set(blink * (EYE.ry * 2 + 4) * (1 - clamp01(x.squint)))
    R.pupilLX.set(EYE.lx + x.pupilIn + x.px + o.px)
    R.pupilRX.set(EYE.rx - x.pupilIn + x.px + o.px)
    R.pupilY.set(EYE.cy - 2 + x.py)
    R.pupilR.set(3.9 * Math.max(0.1, x.pupilS))
    R.browO.set(clamp01(x.brow))
    R.browY.set(x.browY)
    R.browRotL.set(x.browTilt)
    R.browRotR.set(-x.browTilt)
    R.squintO.set(clamp01(x.squint))
    R.cheeksO.set(clamp01(x.cheeks))
    const red = clamp01(x.red) * 0.85
    R.redO.set(red)
    R.lidFill.set(mixHex(COLORS.skin, COLORS.flush, red))

    const mw = Math.max(2, x.mw)
    const top = x.mtop
    const bot = Math.max(x.mbot, -top + 0.6)
    R.mouthD.set(mouthPath(0, 0, mw, top, bot, x.mlc + o.mlc, x.mrc + o.mrc, clamp01(x.mrt), clamp01(x.mrb)))
    R.mouthX.set(MOUTH.cx + x.mdx)
    R.mouthY.set(MOUTH.cy + x.mdy)
    R.teethY.set(-top - 1.5)
    R.teethO.set(clamp01(x.teeth))
    R.clenchO.set(clamp01(x.clench))
    R.tongueY.set(bot - 2)
    R.tongueO.set(clamp01(x.tongue))
    R.tongueRX.set(mw * 0.62)
  })

  return rig
}

