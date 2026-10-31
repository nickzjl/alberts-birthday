/**
 * Tung Tung Tung Sahur — layered, animated SVG character.
 *
 * One rAF loop per instance computes the whole rig (pose blending with overshoot, IK arms
 * and legs, bat physics, facial expression morphing, blinks, eye darts, talking jaw) and
 * writes SVG attributes straight to the DOM through refs — no React re-renders per frame.
 */
import { AnimatePresence, motion, useAnimationFrame, useInView, useReducedMotion } from 'motion/react'
import { memo, useId, useLayoutEffect, useRef } from 'react'
import { characterArt } from '../config'
import { ImageCharacter } from '../ImageCharacter'
import type { TungExpression, TungProps } from '../types'
import { DARTS, EXPRESSIONS, FACE_KEYS, SPIRAL, STAR, browPath, mouthGeo, type Face } from './face'
import {
  ANKLE,
  BAT_GRIP,
  BAT_GRIP2,
  BAT_LEN,
  C,
  FACE,
  FOOT_SCALE,
  FOREARM,
  GRIP,
  HAND_SCALE,
  HIP,
  PELVIS,
  SHIN,
  THIGH,
  TAU,
  UPPER_ARM,
  clamp,
  dir,
  easeInQuad,
  easeOutBack,
  easeOutCubic,
  f2,
  ik2,
  jitter,
  lerp,
  near,
  noise,
  torsoPoint,
  toward,
  type Side,
  type Vec,
} from './geometry'
import { BODY_PATH, TEARDROP, VEIN, ids } from './art'
import { BatShape, Foot, Gradients, HandFist, HandOpen, LogBody, Nose, TungBat } from './parts'
import {
  BASE,
  POSES,
  RIG_KEYS,
  armWorld,
  dropBatXf,
  type Frame,
  type HandShape,
  type Puff,
  type Rig,
  type RigPose,
} from './poses'

// (sync points for scenes live in ./timing — this module only exports components)
export { TungBat }

type BatXf = { kx: number; ky: number; b: number; l: number }
type ArmIk = { bend: number; stretch: number; len: number }

interface Sim {
  last: number
  pose: RigPose | null
  poseT0: number
  from: Rig
  out: Rig
  expr: TungExpression | null
  exprT0: number
  face: Face
  blinkNext: number
  blinkT0: number
  blinkDur: number
  dartNext: number
  dartX: number
  dartY: number
  lookX: number
  lookY: number
  talkNext: number
  talkTarget: number
  talkCur: number
  talkPulse: number
  bat: BatXf
  dropSnap: BatXf | null
  /**
   * The released bat (dropBat). Drawn outside the body with the body transform frozen at the
   * moment of release, so it falls / bounces / rests on its own and stays lying there through any
   * later pose until the bat is back in hand.
   */
  ground: { root: string; snap: BatXf; t0: number } | null
  /** grip-arm IK params of the current / previous pose (blended across pose changes) */
  arm: ArmIk
  prevArm: ArmIk
  tips: { x: number; y: number; t: number }[]
  hadBat: boolean
  batPop: number
  stars: number
  /** 0..1 rage steam out of the top of the log (max intensity + angry) */
  steam: number
  /** layering of the previous pose, kept for the first part of a blend */
  layers: { r: boolean; l: boolean; bat: boolean }
  prevLayers: { r: boolean; l: boolean; bat: boolean }
  drawn: boolean
  cache: WeakMap<Element, Record<string, string>>
}

const wrapFrom = (a: number, lo: number) => ((((a - lo) % 360) + 360) % 360) + lo

function normalizeArms(r: Rig) {
  r.rA1 = wrapFrom(r.rA1, -100)
  r.rA2 = near(r.rA2, r.rA1)
  r.lA1 = wrapFrom(r.lA1, -260)
  r.lA2 = near(r.lA2, r.lA1)
}

const HAND_SHAPES: HandShape[] = ['fist', 'open', 'wave']
const p2 = (v: Vec) => `${f2(v.x)} ${f2(v.y)}`

/**
 * Rig-only extras beyond the shared character contract:
 * - `pose` also takes the rig-only poses (e.g. 'windupLow')
 * - `paused` freezes the whole rig in place (a paused game) — pose clocks resume where they stopped.
 */
export type TungRigProps = Omit<TungProps, 'pose'> & { pose?: RigPose; paused?: boolean }

export const Tung = memo(function Tung({
  expression = 'creepy',
  pose = 'idle',
  talking = false,
  intensity = 0,
  hasBat = true,
  flip = false,
  paused = false,
  className,
  style,
  label,
}: TungRigProps) {
  const p = `tung${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const id = ids(p)
  const reduced = useReducedMotion()
  const imageMode = characterArt.tung.renderer === 'image'

  const live = useRef({ expression, pose, talking, intensity, hasBat, paused, reduced: !!reduced, imageMode })
  live.current = { expression, pose, talking, intensity, hasBat, paused, reduced: !!reduced, imageMode }

  const wrapRef = useRef<HTMLDivElement>(null)
  const inView = useInView(wrapRef, { margin: '200px' })
  const inViewRef = useRef(inView)
  inViewRef.current = inView

  const els = useRef<Record<string, Element | null>>({})
  const cbs = useRef<Record<string, (el: Element | null) => void>>({})
  const r = (name: string) =>
    (cbs.current[name] ??= (el: Element | null) => {
      els.current[name] = el
    })

  const sim = useRef<Sim | null>(null)

  const step = (now: number) => {
    const P = live.current
    const E = els.current
    let S = sim.current
    if (!S) S = sim.current = createSim(now)
    if (S.drawn && !inViewRef.current) {
      S.last = now
      return
    }
    S.drawn = true
    const dt = clamp(now - S.last, 0, 0.1)
    S.last = now
    const calm = P.reduced ? 0.3 : 1
    const k = clamp(P.intensity ?? 0, 0, 1)
    const ctx = { k, calm }
    const cache = S.cache
    const put = (el: Element | null | undefined, key: string, v: string | number) => {
      if (!el) return
      const s = typeof v === 'number' ? String(f2(v)) : v
      let c = cache.get(el)
      if (!c) cache.set(el, (c = {}))
      if (c[key] === s) return
      c[key] = s
      el.setAttribute(key, s)
    }
    const show = (el: Element | null | undefined, on: boolean) => put(el, 'visibility', on ? 'visible' : 'hidden')

    /* ---------------- pose blending ---------------- */
    const pose: RigPose = POSES[P.pose] ? P.pose : 'idle'
    if (pose !== S.pose) {
      const first = S.pose === null
      S.pose = pose
      S.poseT0 = now
      S.dropSnap = null
      S.prevLayers = { ...S.layers }
      S.prevArm = { ...S.arm }
      if (first) {
        S.from = POSES[pose].fn(0, ctx).rig
        normalizeArms(S.from)
      } else S.from = { ...S.out }
    }
    const def = POSES[S.pose!]
    const t = now - S.poseT0
    const fr: Frame = def.fn(t, ctx)
    const tg = fr.rig
    normalizeArms(tg)
    const u = clamp(t / def.blend, 0, 1)
    const e = u >= 1 ? 1 : def.ease === 'back' ? easeOutBack(u) : def.ease === 'in' ? easeInQuad(u) : easeOutCubic(u)
    const o = S.out
    for (const key of RIG_KEYS) o[key] = S.from[key] + (tg[key] - S.from[key]) * e
    if (u < 1) o.bat = lerp(S.from.bat, toward(tg.bat, S.from.bat, def.batDir ?? 0), e)

    // talking: stiff wooden jaw + tiny "tung" hops
    if (!P.talking) {
      S.talkTarget = 0
      S.talkNext = now
    } else if (now >= S.talkNext) {
      const sp = 1 + 0.7 * k
      if (S.talkTarget > 0.2) {
        S.talkTarget = 0.03
        S.talkNext = now + (0.05 + Math.random() * 0.05) / sp
      } else {
        S.talkTarget = 0.5 + Math.random() * 0.4
        S.talkPulse = now
        S.talkNext = now + (0.08 + Math.random() * 0.09) / sp
      }
    }
    S.talkCur += (S.talkTarget - S.talkCur) * (1 - Math.exp(-dt * 45))
    if (P.talking) {
      const pulse = Math.exp(-(now - S.talkPulse) * 13)
      o.y -= 8 * pulse * calm * (1 + k)
      o.bsy *= 1 + 0.03 * pulse * calm
      o.bsx *= 1 - 0.018 * pulse * calm
    }
    // intensity: jerky shake on top of everything
    const jk = k * k * calm
    if (jk > 0.01) {
      o.x += jitter(now, 17) * 5 * jk
      o.rot += jitter(now + 9, 17) * 1.8 * jk
    }

    /* ---------------- whole body ---------------- */
    const rootXf = `translate(${f2(o.x + 290)} ${f2(o.y + 1000)}) rotate(${f2(o.rot)}) scale(${f2(o.sx)} ${f2(o.sy)}) translate(-290 -1000)`
    if (P.imageMode) {
      const img = E.img as HTMLElement | null
      if (img) img.style.transform = `translate(${f2((o.x / 580) * 100)}%, ${f2((o.y / 1000) * 100)}%) rotate(${f2(o.rot + o.lean * 0.6)}deg) scale(${f2(o.sx * o.bsx)}, ${f2(o.sy * o.bsy)})`
      return
    }
    put(E.root, 'transform', rootXf)
    const lift = clamp(-o.y / 420, 0, 0.7)
    put(E.shadow, 'transform', `translate(${f2(290 + o.x)} 997) scale(${f2(1 - lift)} ${f2(1 - lift)})`)
    put(E.shadow, 'opacity', 0.45 * (1 - lift))
    put(E.torso, 'transform', `translate(${f2(PELVIS.x + o.tx)} ${f2(PELVIS.y + o.ty)}) rotate(${f2(o.lean)}) scale(${f2(o.bsx)} ${f2(o.bsy)}) translate(${-PELVIS.x} ${-PELVIS.y})`)

    /* ---------------- bat + arms ---------------- */
    const holding = fr.bat === 'hand' && (P.hasBat || S.pose === 'dropBat')
    const dropping = fr.bat === 'drop'
    if (holding && !S.hadBat) S.batPop = now
    S.hadBat = holding

    const R = armWorld(o, 'r')
    const bw = o.bat + o.lean
    const bd = dir(bw)
    let bx: BatXf
    if (holding) {
      S.ground = null
      bx = { kx: R.grip.x - bd.x * BAT_GRIP * o.batL, ky: R.grip.y - bd.y * BAT_GRIP * o.batL, b: bw, l: o.batL }
    } else {
      if (dropping && !S.dropSnap) {
        // let go: from here on the bat lives in its own (frozen) frame
        S.dropSnap = { ...S.bat }
        S.ground = { root: rootXf, snap: S.dropSnap, t0: S.poseT0 }
      }
      bx = S.ground ? dropBatXf(now - S.ground.t0, S.ground.snap) : S.bat
    }
    S.bat = bx

    let L = armWorld(o, 'l')
    const gw = holding ? o.lGrip : 0
    S.arm = { bend: fr.lBend, stretch: fr.lStretch ?? 1.3, len: fr.lLen ?? 1 }
    if (gw > 0.001) {
      const g2 = { x: R.grip.x + bd.x * BAT_GRIP2 * o.batL, y: R.grip.y + bd.y * BAT_GRIP2 * o.batL }
      const solve = (a: ArmIk) => {
        const q = ik2(L.sh, g2, UPPER_ARM * a.len, (FOREARM + GRIP) * a.len, a.bend, a.stretch, 0.97)
        return { a1: q.a1, a2: q.a2, s: q.s * a.len }
      }
      let sol = solve(S.arm)
      const pa = S.prevArm
      if (u < 1 && (pa.bend !== S.arm.bend || pa.len !== S.arm.len || pa.stretch !== S.arm.stretch)) {
        // the elbow swings over to its new side instead of popping
        const from = solve(pa)
        sol = { a1: lerp(from.a1, near(sol.a1, from.a1), e), a2: lerp(from.a2, near(sol.a2, from.a2), e), s: lerp(from.s, sol.s, e) }
      }
      const a1 = near(sol.a1 - o.lean, o.lA1)
      const a2 = near(sol.a2 - o.lean, o.lA2)
      L = armWorld({ ...o, lA1: lerp(o.lA1, a1, gw), lA2: lerp(o.lA2, a2, gw), lS: lerp(o.lS, sol.s, gw) }, 'l')
    }
    const rShape: HandShape = holding ? 'fist' : fr.rHand
    const lShape: HandShape = gw > 0.5 ? 'fist' : fr.lHand
    const drawArm = (s: Side, J: ReturnType<typeof armWorld>, shape: HandShape, rot = 0) => {
      const d = `M${p2(J.sh)}L${p2(J.elbow)}L${p2(J.wrist)}`
      put(E[`${s}o`], 'd', d)
      put(E[`${s}f`], 'd', d)
      put(E[`${s}h`], 'd', d)
      put(E[`${s}hand`], 'transform', `translate(${p2(J.wrist)}) rotate(${f2(J.a2 + rot)}) scale(${s === 'l' ? -HAND_SCALE : HAND_SCALE} ${HAND_SCALE})`)
      const want = shape === 'palm' ? 'open' : shape
      for (const v of HAND_SHAPES) put(E[`${s}_${v}`], 'display', v === want ? 'inline' : 'none')
    }
    drawArm('r', R, rShape, fr.rHandRot)
    drawArm('l', L, lShape, fr.lHandAbs !== undefined ? fr.lHandAbs + o.lean - L.a2 : fr.lHandRot)

    // arms raised behind the head stay behind until they've swung clear of the face
    const keep = u < 0.45
    const rBack = keep ? S.prevLayers.r : fr.rBack
    const lBack = keep ? S.prevLayers.l : fr.lBack
    const batBack = keep ? S.prevLayers.bat : fr.batBack
    S.layers = { r: rBack, l: lBack, bat: batBack }
    show(E.armRBack, rBack)
    show(E.armRFront, !rBack)
    show(E.armLBack, lBack)
    show(E.armLFront, !lBack)
    show(E.batBack, holding && batBack)
    show(E.batFront, holding && !batBack)
    const grounded = !holding && !!S.ground
    show(E.batGround, grounded)
    if (S.ground) put(E.batGround, 'transform', S.ground.root)
    const pt = now - S.batPop
    const pop = pt < 0.7 ? 1 - Math.exp(-pt * 9) * Math.cos(pt * 20) * 0.7 : 1
    put(E.bat, 'transform', `translate(${f2(bx.kx)} ${f2(bx.ky)}) rotate(${f2(bx.b + 180)}) scale(${f2(pop)} ${f2(bx.l * pop)})`)

    // motion smear behind fast bat tips
    const td = dir(bx.b)
    const tip = { x: bx.kx + td.x * BAT_LEN * bx.l, y: bx.ky + td.y * BAT_LEN * bx.l, t: now }
    S.tips.push(tip)
    while (S.tips.length > 7 || (S.tips.length > 1 && now - S.tips[0].t > 0.11)) S.tips.shift()
    const first = S.tips[0]
    const span = tip.t - first.t
    // net travel over the trail (a trembling bat doesn't smear, a real swing does)
    const speed = span > 0.02 ? Math.hypot(tip.x - first.x, tip.y - first.y) / span : 0
    const smearO = holding && !batBack && !P.reduced && S.tips.length > 2 ? clamp((speed - 1400) / 2600, 0, 0.75) : 0
    if (smearO > 0) {
      // smooth curve through the sampled tips (quadratic through the midpoints) — no polyline kinks
      const q = S.tips
      let d = `M${f2(q[0].x)} ${f2(q[0].y)}`
      for (let i = 1; i < q.length - 1; i++) d += `Q${f2(q[i].x)} ${f2(q[i].y)} ${f2((q[i].x + q[i + 1].x) / 2)} ${f2((q[i].y + q[i + 1].y) / 2)}`
      d += `L${f2(q[q.length - 1].x)} ${f2(q[q.length - 1].y)}`
      put(E.smearA, 'd', d)
      put(E.smearB, 'd', d)
    }
    put(E.smearA, 'opacity', smearO * 0.45)
    put(E.smearB, 'opacity', smearO * 0.8)

    /* ---------------- legs ---------------- */
    for (const s of ['r', 'l'] as Side[]) {
      const hip = torsoPoint(o, HIP[s])
      const ank = { x: ANKLE[s].x + (s === 'r' ? o.rfx : o.lfx), y: ANKLE[s].y + (s === 'r' ? o.rfy : o.lfy) }
      const sol = ik2(hip, ank, THIGH, SHIN, 1, 1.05)
      const d1 = dir(sol.a1)
      const knee = { x: hip.x + d1.x * THIGH * sol.s, y: hip.y + d1.y * THIGH * sol.s }
      const d2 = dir(sol.a2)
      const a = { x: knee.x + d2.x * SHIN * sol.s, y: knee.y + d2.y * SHIN * sol.s }
      const d = `M${p2(hip)}L${p2(knee)}L${p2(a)}`
      for (const part of ['lo', 'lf', 'ls', 'lh']) put(E[`${s}${part}`], 'd', d)
      for (const part of ['ko', 'kf']) {
        put(E[`${s}${part}`], 'cx', knee.x)
        put(E[`${s}${part}`], 'cy', knee.y)
      }
      put(E[`${s}kh`], 'cx', knee.x - 5)
      put(E[`${s}kh`], 'cy', knee.y - 5)
      put(E[`${s}foot`], 'transform', `translate(${p2(a)}) rotate(${f2(s === 'r' ? o.rfr : o.lfr)}) scale(${FOOT_SCALE})`)
    }

    /* ---------------- fx ---------------- */
    const puffs = (prefix: string, pf: Puff | undefined) => {
      const q = pf ? (t - pf.t0) / 0.62 : -1
      const on = !!pf && q >= 0 && q < 1
      show(E[prefix], on)
      if (!on || !pf) return
      const ez = easeOutCubic(q)
      put(E[prefix], 'opacity', (1 - q) ** 1.3)
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1
        const n = Math.floor(i / 2)
        const el = E[`${prefix}${i}`]
        put(el, 'cx', pf.x + side * (16 + n * 30) * (0.35 + 1.1 * ez) * pf.s)
        put(el, 'cy', pf.y - (6 + n * 9) * pf.s - ez * (16 + n * 8) * pf.s)
        put(el, 'r', Math.max(0.1, (17 - n * 3.5) * pf.s * (0.45 + 0.9 * Math.sqrt(q))))
      }
    }
    puffs('pa', fr.puff)
    puffs('pb', fr.puff2)
    const bq = fr.burst ? (t - fr.burst.t0) / 0.24 : -1
    const burstOn = !!fr.burst && bq >= 0 && bq < 1
    show(E.burst, burstOn)
    if (burstOn && fr.burst) {
      const b = fr.burst
      let d = ''
      for (let i = 0; i < 9; i++) {
        const a = (-172 + i * 20.5) * (Math.PI / 180)
        const r0 = (34 + 80 * bq) * b.s
        const r1 = (62 + 150 * easeOutCubic(bq)) * b.s
        d += `M${f2(b.x + Math.cos(a) * r0)} ${f2(b.y - 8 + Math.sin(a) * r0)}L${f2(b.x + Math.cos(a) * r1)} ${f2(b.y - 8 + Math.sin(a) * r1)}`
      }
      put(E.burst, 'd', d)
      put(E.burst, 'opacity', 1 - bq)
    }

    const starsOn = fr.stars || S.expr === 'dizzy'
    S.stars += ((starsOn ? 1 : 0) - S.stars) * (1 - Math.exp(-dt * 8))
    put(E.stars, 'opacity', S.stars)
    show(E.stars, S.stars > 0.02)
    if (S.stars > 0.02) {
      for (let i = 0; i < 3; i++) {
        const a = now * 3.3 * (1 + 0.4 * k) + (i * TAU) / 3
        const sc = (0.78 + 0.28 * Math.sin(a)) * (0.6 + 0.4 * S.stars)
        put(E[`star${i}`], 'transform', `translate(${f2(290 + Math.cos(a) * 118)} ${f2(30 + Math.sin(a) * 22)}) rotate(${f2(now * 160 + i * 40)}) scale(${f2(sc)})`)
      }
    }

    // rage steam: two jets puffing out of the top of the log
    const steamOn = k >= 0.8 && (P.expression === 'angry' || P.expression === 'windup')
    S.steam += ((steamOn ? 1 : 0) - S.steam) * (1 - Math.exp(-dt * 6))
    show(E.steam, S.steam > 0.02)
    if (S.steam > 0.02) {
      for (let i = 0; i < 8; i++) {
        const side = i % 2 ? 1 : -1
        const q = (now * (1.4 + 0.5 * k) * calm + Math.floor(i / 2) / 4 + (side > 0 ? 0.125 : 0)) % 1
        const el = E[`steam${i}`]
        // kettle jets: shoot up and out of both sides of the top, billowing as they go
        put(el, 'cx', 290 + side * (62 + q * 96 + q * q * 40))
        put(el, 'cy', 70 - q * 150 + q * q * 30)
        put(el, 'r', 14 + q * 34)
        put(el, 'opacity', (q < 0.12 ? q / 0.12 : 1 - (q - 0.12) / 0.88) * S.steam)
      }
    }

    /* ---------------- face ---------------- */
    const expr = P.expression
    if (expr !== S.expr) {
      if (S.expr === null) S.face = { ...(EXPRESSIONS[expr] ?? EXPRESSIONS.creepy) }
      else S.exprT0 = now
      S.expr = expr
      S.dartNext = now
    }
    const tf = EXPRESSIONS[expr] ?? EXPRESSIONS.creepy
    const fr8 = 1 - Math.exp(-dt * 15)
    for (const key of FACE_KEYS) S.face[key] += (tf[key] - S.face[key]) * fr8
    const F: Face = { ...S.face }

    if (now >= S.blinkNext) {
      S.blinkT0 = now
      S.blinkDur = expr === 'creepy' ? 0.34 : expr === 'exhausted' ? 0.4 : 0.17
      S.blinkNext = now + (Math.random() < 0.18 ? 0.42 : 1.8 + Math.random() * 3.8)
    }
    const bt = (now - S.blinkT0) / S.blinkDur
    if (bt >= 0 && bt < 1) F.lidT = Math.max(F.lidT, Math.sin(bt * Math.PI))

    const dart = DARTS[expr] ?? DARTS.creepy
    if (now >= S.dartNext) {
      S.dartX = (Math.random() * 2 - 1) * dart.x * calm
      S.dartY = (Math.random() * 2 - 1) * dart.y * calm
      S.dartNext = now + lerp(dart.every[0], dart.every[1], Math.random()) / (1 + k)
    }
    const lookTX = fr.look ? fr.look.x : F.lookX + S.dartX
    const lookTY = fr.look ? fr.look.y : F.lookY + S.dartY
    const lr = 1 - Math.exp(-dt * 26)
    S.lookX += (lookTX - S.lookX) * lr
    S.lookY += (lookTY - S.lookY) * lr
    let lx = S.lookX
    let ly = S.lookY
    if (expr === 'windup') {
      lx += jitter(now, 20) * 1.6 * calm
      ly += jitter(now + 4, 20) * 1.6 * calm
    }

    if (expr === 'exhausted') F.mO = clamp(F.mO + Math.sin(now * TAU * 3.1) * 0.17 * calm, 0, 1)
    if (expr === 'dizzy') {
      F.mSk += Math.sin(now * 6.2) * 8 * calm
      F.mC += Math.sin(now * 4.1) * 7 * calm
    }
    if (expr === 'creepy') F.mW += noise(now * 0.6) * 9 * calm
    if (expr === 'angry' || expr === 'windup') F.mSk += jitter(now, 18) * 2.5 * (0.3 + k) * calm
    F.mO = Math.max(F.mO, S.talkCur)

    const ft = now - S.exprT0
    const fpop = ft < 0.9 ? Math.exp(-ft * 7) * Math.sin(ft * 26) * 0.07 * calm : 0
    put(E.face, 'transform', `translate(${f2(o.faceX + FACE.cx)} 260) scale(${f2(1 + fpop)} ${f2(1 - fpop * 0.6)}) translate(${-FACE.cx} -260)`)

    const ER = FACE.eyeR
    const hideSc = Math.max(F.arcs, F.squeeze)
    const hideIr = Math.max(F.spiral, hideSc)
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1
      put(E[`e${i}`], 'transform', `translate(${FACE.cx + side * FACE.eyeDX} ${FACE.eyeY}) scale(${f2(F.eyeS)})`)
      put(E[`e${i}sc`], 'opacity', 1 - hideSc)
      put(E[`sock${i}`], 'opacity', 0.42 * (1 - 0.75 * hideSc))
      const lim = ER - 21 * F.pupS - 2
      put(E[`e${i}ir`], 'transform', `translate(${f2(clamp(lx, -lim, lim))} ${f2(clamp(ly, -lim, lim))}) scale(${f2(F.pupS)})`)
      put(E[`e${i}ir`], 'opacity', 1 - hideIr)
      put(E[`e${i}sp`], 'transform', `rotate(${f2((side * now * 340) % 360)})`)
      put(E[`e${i}sp`], 'opacity', F.spiral)
      const c = F.lidC
      put(E[`e${i}lt`], 'd', `M-80 -150L80 -150L80 0Q0 ${f2(2 * c)} -80 0Z`)
      const ly0 = lerp(-ER - 4 - Math.max(c, 0), ER + 4 - Math.min(c, 0), clamp(F.lidT, 0, 1))
      put(E[`e${i}lt`], 'transform', `rotate(${f2(-side * F.lidA)}) translate(0 ${f2(ly0)})`)
      put(E[`e${i}lb`], 'transform', `rotate(${f2(side * F.lidA * 0.35)}) translate(0 ${f2(lerp(ER + 12, 0, F.lidB))})`)
      put(E[`e${i}arc`], 'opacity', F.arcs)
      put(E[`e${i}ch`], 'opacity', F.squeeze)
    }
    put(E.browL, 'd', browPath(-1, F))
    put(E.browR, 'd', browPath(1, F))

    const M = mouthGeo(F)
    put(E.mShape, 'd', M.shape)
    put(E.mClip, 'd', M.shape)
    put(E.mLine, 'd', M.shape)
    put(E.mTeeth, 'd', M.teeth)
    put(E.mGaps, 'd', M.gaps)
    put(E.mTeethG, 'opacity', F.teeth)
    put(E.mTongueIn, 'cx', M.bx)
    put(E.mTongueIn, 'cy', M.by + 2)
    put(E.mLip, 'd', M.lip)
    put(E.mDimp, 'd', M.dimples)
    put(E.mFolds, 'd', M.folds)
    put(E.tongue, 'transform', `translate(${f2(M.bx)} ${f2(M.by - 7)}) rotate(${f2(Math.sin(now * 5) * 7 * calm)}) scale(${f2(0.4 + 0.6 * F.tongue)} ${f2(F.tongue)})`)
    show(E.tongue, F.tongue > 0.03)
    put(E.blush, 'opacity', F.blush)
    put(E.flush, 'opacity', F.flush)
    put(E.vein, 'opacity', F.vein)
    put(E.vein, 'transform', `translate(352 128) scale(${f2(1 + Math.sin(now * 9 * (1 + k)) * 0.14 * calm)})`)
  }

  // the rig runs on its own clock so a paused game freezes it mid-pose (and it resumes seamlessly)
  const clock = useRef({ real: -1, virt: 0 })
  const tick = () => {
    const real = performance.now() / 1000
    const c = clock.current
    if (c.real < 0) c.virt = real
    else if (!live.current.paused) c.virt += real - c.real > 0.5 ? 1 / 60 : real - c.real
    c.real = real
    return c.virt
  }
  useAnimationFrame(() => {
    const now = tick()
    if (!live.current.paused || !sim.current) step(now)
  })
  useLayoutEffect(() => {
    step(tick())
  })

  const sweaty = expression === 'exhausted' || pose === 'exhausted'
  const flipXf = flip ? 'translate(580 0) scale(-1 1)' : undefined

  return (
    <div
      ref={wrapRef}
      className={['tung-char', className].filter(Boolean).join(' ')}
      style={{ position: 'relative', width: '100%', height: '100%', ...style }}
      role="img"
      aria-label={label ?? 'Tung Tung Tung Sahur'}
    >
      {imageMode ? (
        <div ref={r('img')} style={{ position: 'absolute', inset: 0, transformOrigin: '50% 100%', willChange: 'transform' }}>
          <div style={{ position: 'absolute', inset: 0, transform: flip ? 'scaleX(-1)' : undefined }}>
            <ImageCharacter images={characterArt.tung.images} expression={expression} alt={label ?? 'Tung Tung Tung Sahur'} talking={talking} />
          </div>
        </div>
      ) : (
        <svg
          viewBox="0 0 580 1000"
          preserveAspectRatio="xMidYMax meet"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
          aria-hidden="true"
        >
          <defs>
            <Gradients p={p} />
            <g id={id.batUse} ref={r('bat')}>
              <BatShape grad={id.bat} />
            </g>
            <ArmDef id={id.armR} s="r" r={r} />
            <ArmDef id={id.armL} s="l" r={r} />
          </defs>
          <g transform={flipXf}>
            <ellipse ref={r('shadow')} rx="150" ry="15" fill="#0b0416" opacity="0.45" />
            <g ref={r('root')}>
              <Leg s="l" r={r} />
              <Leg s="r" r={r} />

              <use href={`#${id.armL}`} ref={r('armLBack')} visibility="hidden" />
              <use href={`#${id.batUse}`} ref={r('batBack')} visibility="hidden" />
              <use href={`#${id.armR}`} ref={r('armRBack')} visibility="hidden" />

              <g ref={r('torso')}>
                <LogBody p={p} />
                <g clipPath={`url(#${id.clip})`}>
                  <ellipse ref={r('flush')} cx="276" cy="262" rx="118" ry="150" fill={`url(#${id.flush})`} opacity="0" />
                  <g ref={r('face')}>
                    <FaceArt p={p} r={r} />
                  </g>
                </g>
                <path d={BODY_PATH} fill="none" stroke={C.ink} strokeWidth="6" strokeLinejoin="round" />
                <g ref={r('vein')} opacity="0">
                  <path d={VEIN} fill="none" stroke={C.vein} strokeWidth="6" strokeLinecap="round" />
                </g>
                <AnimatePresence>{sweaty && <Sweat key="sweat" />}</AnimatePresence>
                <g ref={r('steam')} visibility="hidden">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <circle key={i} ref={r(`steam${i}`)} r="1" fill="#f6f1ff" stroke={C.ink} strokeWidth="5" opacity="0" />
                  ))}
                </g>
                <g ref={r('stars')} opacity="0" visibility="hidden">
                  {[0, 1, 2].map((i) => (
                    <path key={i} ref={r(`star${i}`)} d={STAR} fill={C.star} stroke={C.ink} strokeWidth="3.5" strokeLinejoin="round" />
                  ))}
                </g>
              </g>

              <use href={`#${id.armL}`} ref={r('armLFront')} />
              <path ref={r('smearA')} fill="none" stroke={C.rim} strokeWidth="58" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
              <path ref={r('smearB')} fill="none" stroke="#ffffff" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
              <use href={`#${id.batUse}`} ref={r('batFront')} />
              <use href={`#${id.armR}`} ref={r('armRFront')} />

              {(['pa', 'pb'] as const).map((g) => (
                <g key={g} ref={r(g)} visibility="hidden">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <circle key={i} ref={r(`${g}${i}`)} r="1" fill={C.dust} stroke={C.ink} strokeWidth="4" />
                  ))}
                </g>
              ))}
              <path ref={r('burst')} fill="none" stroke="#fff3b0" strokeWidth="8" strokeLinecap="round" visibility="hidden" />
            </g>
            <g ref={r('batGround')} visibility="hidden">
              <use href={`#${id.batUse}`} />
            </g>
          </g>
        </svg>
      )}
    </div>
  )
})

type RefFn = (name: string) => (el: Element | null) => void

function ArmDef({ id, s, r }: { id: string; s: Side; r: RefFn }) {
  return (
    <g id={id}>
      <path ref={r(`${s}o`)} fill="none" stroke={C.ink} strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" />
      <g ref={r(`${s}hand`)}>
        <g ref={r(`${s}_fist`)}>
          <HandFist />
        </g>
        <g ref={r(`${s}_open`)} display="none">
          <HandOpen />
        </g>
        <g ref={r(`${s}_wave`)} display="none">
          <HandOpen wave />
        </g>
      </g>
      <path ref={r(`${s}f`)} fill="none" stroke={C.limb} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
      <path ref={r(`${s}h`)} fill="none" stroke={C.limbHi} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" transform="translate(-3 -1)" />
    </g>
  )
}

function Leg({ s, r }: { s: Side; r: RefFn }) {
  return (
    <g>
      <path ref={r(`${s}lo`)} fill="none" stroke={C.ink} strokeWidth="35" strokeLinecap="round" strokeLinejoin="round" />
      <circle ref={r(`${s}ko`)} r="21" fill={C.ink} />
      <g ref={r(`${s}foot`)}>
        <Foot />
      </g>
      <path ref={r(`${s}lf`)} fill="none" stroke={C.limb} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
      <circle ref={r(`${s}kf`)} r="16" fill={C.limb} />
      <path ref={r(`${s}ls`)} fill="none" stroke="#7e4219" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" transform="translate(6 0)" />
      <path ref={r(`${s}lh`)} fill="none" stroke={C.limbHi} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" transform="translate(-5 0)" />
      <circle ref={r(`${s}kh`)} r="6" fill={C.limbHi} opacity="0.8" />
    </g>
  )
}

function FaceArt({ p, r }: { p: string; r: RefFn }) {
  const id = ids(p)
  return (
    <>
      <Nose p={p} />
      {[0, 1].map((i) => {
        const side = i ? 1 : -1
        const ex = FACE.cx + side * FACE.eyeDX
        return (
          <g key={i}>
            <ellipse ref={r(`sock${i}`)} cx={ex} cy={FACE.eyeY + 3} rx="51" ry="49" fill={C.woodDark} opacity="0.42" />
            <g ref={r(`e${i}`)}>
              <g ref={r(`e${i}sc`)}>
                <path d="M-44 -21A48 48 0 0 1 44 -21" fill="none" stroke={C.woodDeep} strokeWidth="4" strokeLinecap="round" opacity="0.6" transform="translate(0 -5)" />
                <circle r="39" fill={`url(#${id.sclera})`} />
                <g clipPath={`url(#${id.eye})`}>
                  <g ref={r(`e${i}ir`)}>
                    <circle r="21" fill={`url(#${id.iris})`} />
                    <circle r="12" fill={C.pupil} />
                    <circle cx="-7" cy="-8" r="5.5" fill="#fff" />
                    <circle cx="6.5" cy="6" r="2.6" fill="#fff" opacity="0.85" />
                  </g>
                  <g ref={r(`e${i}sp`)} opacity="0">
                    <path d={SPIRAL} fill="none" stroke={C.ink} strokeWidth="4.5" strokeLinecap="round" />
                  </g>
                  <path ref={r(`e${i}lt`)} fill="#cd8443" stroke={C.ink} strokeWidth="4.5" />
                  <path ref={r(`e${i}lb`)} d="M-80 150L80 150L80 0Q0 -12 -80 0Z" fill="#c47b3c" stroke={C.ink} strokeWidth="3.5" />
                </g>
                <circle r="39" fill="none" stroke={C.ink} strokeWidth="5" />
              </g>
              <path ref={r(`e${i}arc`)} d="M-25 9Q0 -26 25 9" fill="none" stroke={C.ink} strokeWidth="7.5" strokeLinecap="round" opacity="0" />
              <path
                ref={r(`e${i}ch`)}
                d={side < 0 ? 'M-17 -15L15 0L-17 15' : 'M17 -15L-15 0L17 15'}
                fill="none"
                stroke={C.ink}
                strokeWidth="7.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0"
              />
            </g>
          </g>
        )
      })}
      <path ref={r('browL')} fill="none" stroke={C.brow} strokeWidth="17" strokeLinecap="round" />
      <path ref={r('browR')} fill="none" stroke={C.brow} strokeWidth="17" strokeLinecap="round" />
      <path ref={r('mFolds')} fill="none" stroke={C.woodDeep} strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      <path d="M250 410Q282 421 314 410" fill="none" stroke={C.woodDeep} strokeWidth="3.5" strokeLinecap="round" opacity="0.3" />
      <path ref={r('mLip')} fill="none" stroke="#f3b878" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
      <path ref={r('mShape')} fill={C.mouth} />
      <clipPath id={id.mouth}>
        <path ref={r('mClip')} />
      </clipPath>
      <g clipPath={`url(#${id.mouth})`}>
        <ellipse ref={r('mTongueIn')} rx="34" ry="15" fill="#b8325a" />
      </g>
      <g ref={r('mTeethG')} clipPath={`url(#${id.mouth})`} opacity="0">
        <path ref={r('mTeeth')} fill={C.teeth} />
        <path ref={r('mGaps')} fill="none" stroke="#c9b096" strokeWidth="2.5" />
      </g>
      <g ref={r('tongue')} visibility="hidden">
        <path d="M-15 -4C-18 16 -11 36 1 38C14 38 19 18 16 -4Z" fill={C.tongue} stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
        <path d="M1 4L2 22" stroke={C.tongueDark} strokeWidth="3" strokeLinecap="round" />
      </g>
      <path ref={r('mLine')} fill="none" stroke={C.ink} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      <path ref={r('mDimp')} fill="none" stroke={C.ink} strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
      <g ref={r('blush')} opacity="0">
        <ellipse cx="214" cy="304" rx="23" ry="11" fill={C.blush} opacity="0.6" />
        <ellipse cx="350" cy="304" rx="23" ry="11" fill={C.blush} opacity="0.6" />
        <path d="M203 308l6-10M213 310l6-10M223 308l6-10M339 308l6-10M349 310l6-10M359 308l6-10" stroke="#d6336a" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </>
  )
}

/** sweat drops sliding down the log (exhausted) */
function Sweat() {
  const drops = [
    { x: 200, y: 128, d: 0 },
    { x: 382, y: 150, d: 0.45 },
    { x: 366, y: 96, d: 0.9 },
  ]
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      {drops.map((q, i) => (
        <g key={i} transform={`translate(${q.x} ${q.y})`}>
          <motion.g
            initial={{ y: 0, opacity: 0, scale: 0.4 }}
            animate={{ y: [0, 10, 46], opacity: [0, 1, 0], scale: [0.4, 1, 0.85] }}
            transition={{ duration: 1.25, repeat: Infinity, delay: q.d, ease: 'easeIn', times: [0, 0.25, 1] }}
          >
            <path d={TEARDROP} fill={C.sweat} stroke={C.ink} strokeWidth="3" />
            <ellipse cx="-3" cy="3" rx="2.5" ry="4" fill="#fff" opacity="0.85" />
          </motion.g>
        </g>
      ))}
    </motion.g>
  )
}

function createSim(now: number): Sim {
  return {
    last: now,
    pose: null,
    poseT0: now,
    from: { ...BASE },
    out: { ...BASE },
    expr: null,
    exprT0: now - 10,
    face: { ...EXPRESSIONS.creepy },
    blinkNext: now + 1 + Math.random() * 2,
    blinkT0: -10,
    blinkDur: 0.2,
    dartNext: now,
    dartX: 0,
    dartY: 0,
    lookX: 0,
    lookY: 0,
    talkNext: now,
    talkTarget: 0,
    talkCur: 0,
    talkPulse: -10,
    bat: { kx: 0, ky: 0, b: 0, l: 1 },
    dropSnap: null,
    ground: null,
    arm: { bend: -1, stretch: 1.3, len: 1 },
    prevArm: { bend: -1, stretch: 1.3, len: 1 },
    tips: [],
    hadBat: true,
    batPop: -10,
    stars: 0,
    steam: 0,
    layers: { r: false, l: false, bat: false },
    prevLayers: { r: false, l: false, bat: false },
    drawn: false,
    cache: new WeakMap(),
  }
}

export default Tung
