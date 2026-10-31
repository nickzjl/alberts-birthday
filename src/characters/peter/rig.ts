/**
 * Procedural animation rig for Peter.
 *
 * Every joint is a channel: value = spring(base target) + Σ layers(weight · waves(t)).
 *  - base targets come from the pose + expression, and are reached with a slightly bouncy spring
 *    (overshoot), so pose changes never snap.
 *  - looping motion (dance, walk, breathing…) lives in "wave layers" that cross-fade in/out.
 *  - legs are solved with 2-bone IK every frame so feet stay planted while the hips move.
 * The rig writes SVG attributes directly (no React renders per frame).
 */
import type { PeterExpression, PeterPose } from '../types'
import { EXPRESSIONS, GEO, POSES, type Wave, type WaveMap } from './poses'

export const CHANNELS = [
  'rootX', 'rootY', 'rootR', 'rootSX', 'rootSY',
  'hipX', 'hipY', 'hipR',
  'upX', 'upY', 'upR',
  'headX', 'headY', 'headR',
  'bellyX', 'bellyY',
  'fA', 'fF', 'fW', 'fS', 'bA', 'bF', 'bW', 'bS', 'shrug',
  'fFootX', 'fFootY', 'fFootR', 'bFootX', 'bFootY', 'bFootR', 'fKnee', 'bKnee', 'fThigh', 'fLegW',
  'lidLU', 'lidLR', 'lidLL', 'lidRU', 'lidRR', 'lidRL', 'pupLX', 'pupLY', 'pupRX', 'pupRY', 'pupS', 'lens',
  'jaw',
] as const
export type Ch = (typeof CHANNELS)[number]

const N = CHANNELS.length
const IDX = Object.fromEntries(CHANNELS.map((c, i) => [c, i])) as Record<Ch, number>
const FACE_START = IDX.lidLU

/** channels that default to 1 instead of 0 */
const ONE: Partial<Record<Ch, number>> = { pupS: 1, lens: 1, fKnee: 1, bKnee: 1, fThigh: 1, fLegW: 1 }

const TAU = Math.PI * 2
const DEG = Math.PI / 180
const frac = (x: number) => x - Math.floor(x)

const SHAPES = {
  sin: (x: number) => Math.sin(TAU * x),
  cos: (x: number) => Math.cos(TAU * x),
  /** one hump per cycle, 0..1 */
  hop: (x: number) => Math.abs(Math.sin(Math.PI * x)),
  /** positive half of a sine (lift on half the cycle) */
  lift: (x: number) => Math.max(0, Math.sin(TAU * x)),
  /** walk foot x: slides back during stance, swings forward (eased) */
  stepX: (x: number) => {
    const p = frac(x)
    if (p < 0.5) return 1 - 4 * p
    return -1 + (1 - Math.cos(Math.PI * ((p - 0.5) / 0.5)))
  },
  /** walk foot lift during the swing half */
  stepY: (x: number) => {
    const p = frac(x)
    return p < 0.5 ? 0 : Math.sin(Math.PI * ((p - 0.5) / 0.5))
  },
}
export type Shape = keyof typeof SHAPES

interface Layer {
  waves: [number, Wave][] // [channel index, wave]
  hz: number
  ph: number
  w: number
  wv: number
  target: number
  kind: 'pose' | 'expr' | 'talk'
}

type V2 = [number, number]

const rot = (x: number, y: number, deg: number): V2 => {
  const c = Math.cos(deg * DEG)
  const s = Math.sin(deg * DEG)
  return [x * c - y * s, x * s + y * c]
}
/** direction of a limb rotated `deg` clockwise from hanging straight down */
const down = (deg: number): V2 => [-Math.sin(deg * DEG), Math.cos(deg * DEG)]
const f2 = (n: number) => Math.round(n * 100) / 100
const f3 = (n: number) => Math.round(n * 1000) / 1000

/** 2-bone IK. Returns knee/elbow position and absolute segment angles (deg, clockwise from straight down). */
function ik(sx: number, sy: number, tx: number, ty: number, l1: number, l2: number, bend: number) {
  const dx = tx - sx
  const dy = ty - sy
  let d = Math.hypot(dx, dy)
  d = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.001)
  const base = Math.atan2(dy, dx)
  const a = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))))
  const t1 = base - bend * a
  const kx = sx + l1 * Math.cos(t1)
  const ky = sy + l1 * Math.sin(t1)
  const t2 = Math.atan2(ty - ky, tx - kx)
  // convert from atan2 angle (0 = +x) to "clockwise from down" (0 = +y)
  return { kx, ky, upper: t1 / DEG - 90, lower: t2 / DEG - 90 }
}

/**
 * Limb outline: tapered upper segment + round joint + tapered lower segment, as one path.
 * Drawn twice (thick ink stroke behind, plain fill on top) so the union gets a single clean outline.
 */
function limb(a: V2, j: V2, b: V2, wa: number, wj: number, wb: number, ra = 0) {
  const seg = (p: V2, q: V2, wp: number, wq: number) => {
    const dx = q[0] - p[0]
    const dy = q[1] - p[1]
    const l = Math.hypot(dx, dy) || 1
    const nx = -dy / l
    const ny = dx / l
    const hp = wp / 2
    const hq = wq / 2
    return `M${f2(p[0] + nx * hp)} ${f2(p[1] + ny * hp)}L${f2(q[0] + nx * hq)} ${f2(q[1] + ny * hq)}L${f2(q[0] - nx * hq)} ${f2(q[1] - ny * hq)}L${f2(p[0] - nx * hp)} ${f2(p[1] - ny * hp)}Z`
  }
  const disc = (c: V2, r: number) => `M${f2(c[0] - r)} ${f2(c[1])}a${f2(r)} ${f2(r)} 0 1 0 ${f2(r * 2)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-r * 2)} 0Z`
  return seg(a, j, wa, wj) + disc(j, wj / 2) + seg(j, b, wj, wb) + (ra > 0.5 ? disc(a, ra) : '')
}

/** polyline points → "M x y L …" */
const poly = (pts: V2[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${f2(p[0])} ${f2(p[1])}`).join('')

/** offset a polyline sideways (positive = to the limb's left when walking along it) */
function offsetPoly(pts: V2[], off: number): V2[] {
  const n: V2[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0]
    const dy = pts[i + 1][1] - pts[i][1]
    const l = Math.hypot(dx, dy) || 1
    n.push([-dy / l, dx / l])
  }
  return pts.map((p, i) => {
    const a = n[Math.max(0, i - 1)]
    const b = n[Math.min(n.length - 1, i)]
    let nx = a[0] + b[0]
    let ny = a[1] + b[1]
    const l = Math.hypot(nx, ny) || 1
    nx /= l
    ny /= l
    return [p[0] + nx * off, p[1] + ny * off] as V2
  })
}

export type HandShape = 'rest' | 'open' | 'fist' | 'thumb' | 'claw'

export class PeterRig {
  private x = new Float64Array(N) // spring position (base)
  private v = new Float64Array(N) // spring velocity
  private tgt = new Float64Array(N)
  private out = new Float64Array(N)
  private layers: Layer[] = []
  private els = new Map<string, (Element | null)[]>()
  private binders = new Map<string, (el: Element | null) => void>()
  private t = 0
  private pose: PeterPose
  private expr: PeterExpression
  private talking = false
  private intensity = 0
  private reduced = false
  private jaw = 0
  private blinkAt = 1.5 + Math.random() * 2
  private blinkT = -1
  private doubleBlink = false
  private anticUntil = 0
  private antic = new Float64Array(N)
  private backFront = false
  private kneePos: V2 = [0, 0]
  /** last written attribute values, so unchanged attributes are not touched */
  private last = new Map<string, string>()

  constructor(pose: PeterPose, expr: PeterExpression) {
    this.pose = pose
    this.expr = expr
    this.computeTargets()
    this.x.set(this.tgt)
    this.pushLayer('pose', true)
    this.pushLayer('expr', true)
  }

  /** stable ref callback for an element; several elements may share a key via `slot` */
  bind(key: string, slot = 0) {
    const id = `${key}#${slot}`
    let b = this.binders.get(id)
    if (!b) {
      b = (el: Element | null) => {
        const arr = this.els.get(key) ?? []
        arr[slot] = el
        this.els.set(key, arr)
        // a (re)mounted element needs its attributes written again
        if (el) for (const k of this.last.keys()) if (k.startsWith(key)) this.last.delete(k)
      }
      this.binders.set(id, b)
    }
    return b
  }

  setPose(p: PeterPose) {
    if (p === this.pose) return
    const prev = new Float64Array(this.tgt)
    this.pose = p
    this.computeTargets()
    // anticipation: briefly lean the other way before committing to the new pose
    for (let i = 0; i < FACE_START; i++) this.antic[i] = this.x[i] - (this.tgt[i] - prev[i]) * 0.12
    this.anticUntil = this.t + 0.09
    // a little squash on every pose change
    this.v[IDX.rootSY] -= 0.55
    this.v[IDX.rootSX] += 0.4
    this.pushLayer('pose')
  }

  setExpression(e: PeterExpression) {
    if (e === this.expr) return
    this.expr = e
    this.computeTargets()
    // head reacts to every face change
    this.v[IDX.headY] -= 22
    this.v[IDX.headR] += (Math.random() > 0.5 ? 1 : -1) * 30
    if (e === 'surprised') {
      this.v[IDX.rootY] -= 160
      this.v[IDX.rootSY] += 0.9
    }
    this.pushLayer('expr')
  }

  setTalking(t: boolean) {
    if (t === this.talking) return
    this.talking = t
    if (t) this.pushLayer('talk')
    else for (const l of this.layers) if (l.kind === 'talk') l.target = 0
  }

  setIntensity(i: number) {
    this.intensity = Math.min(1, Math.max(0, i || 0))
  }

  setReduced(r: boolean) {
    this.reduced = r
  }

  setJaw(j: number) {
    this.jaw = j
  }

  private pushLayer(kind: Layer['kind'], instant = false) {
    for (const l of this.layers) if (l.kind === kind) l.target = 0
    let waves: WaveMap | undefined
    let hz = 1
    if (kind === 'pose') {
      waves = POSES[this.pose].waves
      hz = POSES[this.pose].hz ?? 1
    } else if (kind === 'expr') {
      waves = EXPRESSIONS[this.expr].waves
      hz = EXPRESSIONS[this.expr].hz ?? 1
    } else {
      waves = TALK_WAVES
      hz = 2.6
    }
    const list: [number, Wave][] = []
    if (waves) for (const k in waves) for (const w of waves[k as Ch] ?? []) list.push([IDX[k as Ch], w])
    if (!list.length) return
    this.layers.push({ waves: list, hz, ph: 0, w: instant ? 1 : 0, wv: 0, target: 1, kind })
  }

  private computeTargets() {
    const P = POSES[this.pose]
    const E = EXPRESSIONS[this.expr]
    for (let i = 0; i < N; i++) this.tgt[i] = ONE[CHANNELS[i]] ?? 0
    for (const k in P.base) this.tgt[IDX[k as Ch]] = P.base[k as Ch] ?? 0
    for (const k in E.body) this.tgt[IDX[k as Ch]] += E.body[k as Ch] ?? 0
    const [L, R] = [E.eyes.L, E.eyes.R]
    this.tgt[IDX.lidLU] = L[0]
    this.tgt[IDX.lidLR] = L[1]
    this.tgt[IDX.lidLL] = L[2]
    this.tgt[IDX.lidRU] = R[0]
    this.tgt[IDX.lidRR] = R[1]
    this.tgt[IDX.lidRL] = R[2]
    const g = P.gaze ?? [0, 0]
    this.tgt[IDX.pupLX] = E.eyes.pupL[0] + g[0]
    this.tgt[IDX.pupLY] = E.eyes.pupL[1] + g[1]
    this.tgt[IDX.pupRX] = E.eyes.pupR[0] + g[0]
    this.tgt[IDX.pupRY] = E.eyes.pupR[1] + g[1]
    this.tgt[IDX.pupS] = E.eyes.size
    this.tgt[IDX.lens] = E.eyes.lens
    this.tgt[IDX.fKnee] = P.knees?.[0] ?? 1
    this.tgt[IDX.bKnee] = P.knees?.[1] ?? 1
    this.tgt[IDX.fThigh] = P.nearLeg?.thigh ?? 1
    this.tgt[IDX.fLegW] = P.nearLeg?.width ?? 1
    this.backFront = !!P.backFront
  }

  step(dtRaw: number) {
    const dt = Math.min(Math.max(dtRaw, 0), 1 / 20)
    this.t += dt
    const inten = this.intensity
    const calm = this.reduced ? 0.22 : 1
    const ampMul = (1 + 0.85 * inten) * calm
    const tempo = 1 + 0.55 * inten

    // jaw target comes from the current mouth shape
    this.tgt[IDX.jaw] = this.jaw

    // arms that reach for the knee (kneePain)
    if (POSES[this.pose].armsToKnee) this.solveArmsToKnee()

    // springs
    const antic = this.t < this.anticUntil
    for (let i = 0; i < N; i++) {
      const face = i >= FACE_START
      const k = i === IDX.jaw ? 900 : face ? 520 : 190
      const c = i === IDX.jaw ? 24 : face ? 34 : 17
      const target = antic && !face ? this.antic[i] : this.tgt[i]
      this.v[i] += (k * (target - this.x[i]) - c * this.v[i]) * dt
      this.x[i] += this.v[i] * dt
      this.out[i] = this.x[i]
    }

    // wave layers
    for (let li = this.layers.length - 1; li >= 0; li--) {
      const l = this.layers[li]
      l.wv += (70 * (l.target - l.w) - 17 * l.wv) * dt
      l.w = Math.min(1.15, Math.max(0, l.w + l.wv * dt))
      if (l.target === 0 && l.w < 0.003 && Math.abs(l.wv) < 0.01) {
        this.layers.splice(li, 1)
        continue
      }
      l.ph += dt * l.hz * tempo
      const wm = l.w * ampMul
      for (const [ci, wave] of l.waves) {
        const [amp, phase = 0, harm = 1, shape = 'sin'] = wave
        this.out[ci] += wm * amp * SHAPES[shape](l.ph * harm + phase)
      }
    }

    // trembling with rage / pain
    const tremble = (EXPRESSIONS[this.expr].tremble ?? 0) * (0.25 + inten) * calm
    if (tremble > 0) {
      const t = this.t
      this.out[IDX.rootX] += tremble * 1.3 * (Math.sin(t * 61) + Math.sin(t * 47.3) * 0.6)
      this.out[IDX.headR] += tremble * 1.6 * Math.sin(t * 53.7)
    }

    this.blink(dt)
    this.write()
  }

  private blink(dt: number) {
    const mode = EXPRESSIONS[this.expr].eyes.mode
    if (this.blinkT < 0 && this.t > this.blinkAt) {
      this.blinkT = 0
    }
    if (this.blinkT >= 0) {
      this.blinkT += dt
      const d = 0.15
      const p = this.blinkT / d
      const amt = p < 0.4 ? p / 0.4 : Math.max(0, 1 - (p - 0.4) / 0.6)
      if (mode === 'open') {
        this.out[IDX.lidLU] += (1.08 - this.out[IDX.lidLU]) * amt
        this.out[IDX.lidRU] += (1.08 - this.out[IDX.lidRU]) * amt
      }
      if (p >= 1) {
        this.blinkT = -1
        if (!this.doubleBlink && Math.random() < 0.18) {
          this.doubleBlink = true
          this.blinkAt = this.t + 0.12
        } else {
          this.doubleBlink = false
          this.blinkAt = this.t + 1.8 + Math.random() * 3.6
        }
      }
    }
  }

  /** pelvis-local coordinates of a root-space point */
  private toPelvis(x: number, y: number): V2 {
    const o = this.out
    const [cx, cy] = GEO.pelvisPivot
    const [rx, ry] = rot(x - o[IDX.hipX] - cx, y - o[IDX.hipY] - cy, -o[IDX.hipR])
    return [rx + cx, ry + cy]
  }

  /** upper-body-local coordinates of a pelvis-local point */
  private toUpper(x: number, y: number): V2 {
    const o = this.out
    const [cx, cy] = GEO.upperPivot
    const [rx, ry] = rot(x - o[IDX.upX] - cx, y - o[IDX.upY] - cy, -o[IDX.upR])
    return [rx + cx, ry + cy]
  }

  private solveArmsToKnee() {
    const P = POSES[this.pose]
    const [kx, ky] = this.kneePos
    const o = this.out
    const sh = o[IDX.shrug]
    const reach = (S: V2, t: V2, len: [number, number], bend: number) => {
      const [tx, ty] = this.toUpper(t[0], t[1])
      return ik(S[0], S[1] - sh, tx, ty, len[0], len[1], bend)
    }
    const offF = P.kneeGrab?.[0] ?? [0, 0]
    const offB = P.kneeGrab?.[1] ?? [0, 0]
    const sF = 1 + o[IDX.fS]
    const sB = 1 + o[IDX.bS]
    const fr = reach(GEO.shoulderF, [kx + offF[0], ky + offF[1]], [GEO.upperArm * sF, GEO.foreArm * sF], -1)
    const br = reach(GEO.shoulderB, [kx + offB[0], ky + offB[1]], [GEO.upperArm * sB, GEO.foreArm * sB], 1)
    // front: rotation = a, elbow = -f ; back: rotation = -a, elbow = +f
    this.tgt[IDX.fA] = fr.upper
    this.tgt[IDX.fF] = -(fr.lower - fr.upper)
    this.tgt[IDX.bA] = -br.upper
    this.tgt[IDX.bF] = br.lower - br.upper
  }

  /** write an attribute to every element bound to `key`, skipping unchanged values */
  private set(key: string, attr: string, val: string) {
    const arr = this.els.get(key)
    if (!arr) return
    const id = key + attr
    if (this.last.get(id) === val) return
    this.last.set(id, val)
    for (const el of arr) if (el) el.setAttribute(attr, val)
  }

  private write() {
    const o = this.out
    const g = GEO
    const [rpx, rpy] = g.rootPivot

    // whole body
    const sx = 1 + o[IDX.rootSX]
    const sy = 1 + o[IDX.rootSY]
    const rootT = `translate(${f2(o[IDX.rootX])} ${f2(o[IDX.rootY])}) rotate(${f2(o[IDX.rootR])} ${rpx} ${rpy}) translate(${rpx} ${rpy}) scale(${f3(sx)} ${f3(sy)}) translate(${-rpx} ${-rpy})`
    this.set('root', 'transform', rootT)
    const lift = Math.max(0, -o[IDX.rootY])
    const shadowS = Math.max(0.4, 1 - lift / 120)
    this.set('shadow', 'transform', `translate(${f2(o[IDX.rootX] + 160)} 497) scale(${f2(shadowS)} 1)`)
    this.set('shadow', 'opacity', String(f2(0.9 * shadowS)))

    // image mode: approximate the whole rig on the image wrapper
    const img = this.els.get('img')
    if (img) {
      const tx = ((o[IDX.rootX] + o[IDX.hipX] * 0.7 + o[IDX.upX] * 0.4) / g.W) * 100
      const ty = ((o[IDX.rootY] + o[IDX.hipY] * 0.7 + o[IDX.upY] * 0.4) / g.H) * 100
      const r = o[IDX.rootR] + o[IDX.hipR] * 0.5 + o[IDX.upR] * 0.6
      const bx = sx * (1 + o[IDX.bellyX] * 0.4)
      const by = sy * (1 + o[IDX.bellyY] * 0.4)
      for (const el of img) if (el) (el as HTMLElement).style.transform = `translate(${f2(tx)}%, ${f2(ty)}%) rotate(${f2(r)}deg) scale(${f3(bx)}, ${f3(by)})`
      return
    }

    // pelvis
    const [ppx, ppy] = g.pelvisPivot
    this.set('pelvis', 'transform', `translate(${f2(o[IDX.hipX])} ${f2(o[IDX.hipY])}) rotate(${f2(o[IDX.hipR])} ${ppx} ${ppy})`)

    // legs (IK in pelvis space)
    const leg = (key: 'F' | 'B') => {
      const hip = key === 'F' ? g.hipF : g.hipB
      const foot = key === 'F' ? g.footF : g.footB
      const l1 = key === 'F' ? g.legF[0] * o[IDX.fThigh] : g.legB[0]
      const l2 = key === 'F' ? g.legF[1] : g.legB[1]
      const w = key === 'F' ? g.legWF * o[IDX.fLegW] : g.legWB
      const fx = foot[0] + o[IDX[`${key === 'F' ? 'f' : 'b'}FootX`]]
      const fy = foot[1] + o[IDX[`${key === 'F' ? 'f' : 'b'}FootY`]]
      const fr = o[IDX[`${key === 'F' ? 'f' : 'b'}FootR`]]
      const [tx, ty] = this.toPelvis(fx, fy)
      // fat legs squash a little before the knees visibly bend
      const reach = Math.hypot(tx - hip[0], ty - hip[1])
      const sq = Math.min(1, Math.max(0.93, reach / (l1 + l2 - 0.5)))
      const s = ik(hip[0], hip[1], tx, ty, l1 * sq, l2 * sq, o[IDX[key === 'F' ? 'fKnee' : 'bKnee']])
      const d1 = down(s.upper)
      const d2 = down(s.lower)
      const ax = s.kx + d2[0] * l2 * sq
      const ay = s.ky + d2[1] * l2 * sq
      if (key === 'F') this.kneePos = [s.kx, s.ky]
      // a foreshortened thigh (knee towards camera) gets a rounded hip instead of the hidden top extension
      const fore = key === 'F' ? Math.min(1, Math.max(0, (1 - o[IDX.fThigh]) / 0.5)) : 0
      const ext = 16 * (1 - fore)
      const top: V2 = [hip[0] - d1[0] * ext, hip[1] - d1[1] * ext]
      const pts: V2[] = [top, [s.kx, s.ky], [ax, ay]]
      const d = limb(top, pts[1], pts[2], w, w * 0.97, w * 1.04, (w / 2) * fore)
      this.set(`leg${key}.ink`, 'd', d)
      this.set(`leg${key}.fill`, 'd', d)
      this.set(`leg${key}.shade`, 'd', poly(offsetPoly(pts, -(w / 2 - 9))))
      this.set(`foot${key}`, 'transform', `translate(${f2(ax)} ${f2(ay)}) rotate(${f2(fr - o[IDX.hipR])})`)
    }
    leg('B')
    leg('F')

    // upper body
    const [upx, upy] = g.upperPivot
    this.set('upper', 'transform', `translate(${f2(o[IDX.upX])} ${f2(o[IDX.upY])}) rotate(${f2(o[IDX.upR])} ${upx} ${upy})`)
    const [bpx, bpy] = g.bellyPivot
    this.set('belly', 'transform', `translate(${bpx} ${bpy}) scale(${f3(1 + o[IDX.bellyX])} ${f3(1 + o[IDX.bellyY])}) translate(${-bpx} ${-bpy})`)
    const [hpx, hpy] = g.headPivot
    this.set('head', 'transform', `translate(${f2(o[IDX.headX])} ${f2(o[IDX.headY] + o[IDX.shrug] * 0.55)}) rotate(${f2(o[IDX.headR])} ${hpx} ${hpy}) translate(${hpx} ${hpy}) scale(${g.headScale}) translate(${-hpx} ${-hpy})`)

    // arms
    const arm = (key: 'F' | 'B') => {
      const front = key === 'F'
      const S = front ? g.shoulderF : g.shoulderB
      const a = o[IDX[front ? 'fA' : 'bA']]
      const f = o[IDX[front ? 'fF' : 'bF']]
      const wr = o[IDX[front ? 'fW' : 'bW']]
      const st = 1 + o[IDX[front ? 'fS' : 'bS']]
      const sx0 = S[0]
      const sy0 = S[1] - o[IDX.shrug]
      const upperRot = front ? a : -a
      const foreRot = upperRot + (front ? -f : f)
      const handRot = foreRot + (front ? wr : -wr)
      const d1 = down(upperRot)
      const d2 = down(foreRot)
      const ex = sx0 + d1[0] * g.upperArm * st
      const ey = sy0 + d1[1] * g.upperArm * st
      const wx = ex + d2[0] * g.foreArm * st
      const wy = ey + d2[1] * g.foreArm * st
      const start: V2 = [sx0 + d1[0] * g.cuffEnd, sy0 + d1[1] * g.cuffEnd]
      const pts: V2[] = [start, [ex, ey], [wx, wy]]
      this.set(`sleeve${key}`, 'transform', `translate(${f2(sx0)} ${f2(sy0)}) rotate(${f2(upperRot)})${front ? '' : ' scale(-1 1)'}`)
      const d = limb(start, pts[1], pts[2], g.armW, g.armW + 2, g.armW * 0.8)
      this.set(`arm${key}.ink`, 'd', d)
      this.set(`arm${key}.fill`, 'd', d)
      this.set(`arm${key}.shade`, 'd', poly(offsetPoly([pts[1], pts[2]], front ? -10 : 10)))
      this.set(`hand${key}`, 'transform', `translate(${f2(wx)} ${f2(wy)}) rotate(${f2(handRot)})${front ? '' : ' scale(-1 1)'}`)
    }
    arm('F')
    arm('B')
    const bf = this.backFront
    this.set('armBslot0', 'visibility', bf ? 'hidden' : 'visible')
    this.set('armBslot1', 'visibility', bf ? 'visible' : 'hidden')
    // only bring the near leg in front of the belly once its knee is actually raised
    const lf = !!POSES[this.pose].legFront && this.kneePos[1] < g.hipF[1] - 12
    this.set('legFslot0', 'visibility', lf ? 'hidden' : 'visible')
    this.set('legFslot1', 'visibility', lf ? 'visible' : 'hidden')
    // the near leg can be drawn inside the upper body (in front of the belly): undo the upper transform
    this.set('upperInv', 'transform', `rotate(${f2(-o[IDX.upR])} ${upx} ${upy}) translate(${f2(-o[IDX.upX])} ${f2(-o[IDX.upY])})`)

    // face
    const eye = (key: 'L' | 'R') => {
      const [cx, cy, r] = key === 'L' ? g.lensL : g.lensR
      const u = o[IDX[`lid${key}U`]]
      const ur = o[IDX[`lid${key}R`]]
      const lo = o[IDX[`lid${key}L`]]
      this.set(`lidU${key}`, 'transform', `translate(${cx} ${f2(cy + u * r)}) rotate(${f2(ur)})`)
      this.set(`lidL${key}`, 'transform', `translate(${cx} ${f2(cy + lo * r)}) rotate(${f2(-ur * 0.25)})`)
      const px = cx + o[IDX[`pup${key}X`]]
      const py = cy + o[IDX[`pup${key}Y`]]
      this.set(`pup${key}`, 'transform', `translate(${f2(px)} ${f2(py)}) scale(${f2(o[IDX.pupS])})`)
      const ls = o[IDX.lens]
      this.set(`lens${key}`, 'transform', `translate(${cx} ${cy}) scale(${f3(ls)}) translate(${-cx} ${-cy})`)
    }
    eye('L')
    eye('R')
    this.set('chin', 'transform', `translate(0 ${f2(o[IDX.jaw])})`)
  }
}

/** talking: little head bobs on top of everything */
const TALK_WAVES: WaveMap = {
  headR: [[1.6, 0, 1, 'sin'], [0.7, 0.3, 2.3, 'sin']],
  headY: [[0.9, 0.1, 2, 'hop']],
  upY: [[0.5, 0.2, 2, 'hop']],
  bellyY: [[0.006, 0.2, 2, 'hop']],
}
