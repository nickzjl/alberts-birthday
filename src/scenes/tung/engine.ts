/**
 * Boss-fight simulation — plain TS, no React. The scene steps it from a rAF loop, reads
 * positions every frame (written straight to the DOM) and reacts to one-shot events.
 */
import type { SfxName } from '../../audio/sfx'
import type { RigPose } from '../../characters/tung/poses'
import type { TungExpression } from '../../characters/types'
import type { ShakeStrength } from '../../components/ui/shake'
import {
  A,
  ATTACK_SEQ,
  BAT_R,
  BAT_Y,
  BOSS_MAX_HP,
  CUE_LEAD,
  DMG,
  DROP_FALL,
  DROP_R,
  FLOOR,
  HEARTS,
  MAX_BONKS,
  PHASE_AT,
  SLAM_DELAY,
  SLAM_HALF,
  SLAM_HIT_HALF,
  SLAM_REACH,
  SWING_ACTIVE,
  SWING_FROM,
  SWING_HIT_Y,
  SWING_TO,
  THROW_RELEASE,
  TUNING,
  WAVE_DELAY,
  WAVE_HALF,
  WAVE_HIT_Y,
  type AttackKind,
  type PhaseNo,
} from './constants'

export type AlbertAnim = 'sleepy' | 'idle' | 'run' | 'jump' | 'fall' | 'hurt' | 'bonk' | 'win' | 'ko'
export type GameMode = 'intro' | 'fight' | 'respawn' | 'victory'
export type HazardKind = 'marker' | 'band' | 'trail' | 'wave' | 'bat' | 'drop'
export type HintKey = 'slam' | 'bonk' | 'wave' | 'swing' | 'throw' | 'rain' | 'mercy'
export type FxKind = 'dmg' | 'dodge' | 'hit' | 'streak' | 'dust' | 'shatter' | 'hammer' | 'selfbonk' | 'far' | 'heal' | 'crit' | 'slash' | 'wake'
export type LocalSound = 'windup' | 'rumble' | 'whir' | 'ding' | 'alarm' | 'dizzy' | 'alert'
/** what Albert should do right now — shown over his head: '!' = get out, 'jump' = jump NOW */
export type Cue = '' | 'danger' | 'jump'

export interface BossLook {
  pose: RigPose
  expression: TungExpression
  hasBat: boolean
}

export interface Hazard {
  id: number
  kind: HazardKind
  attack: number
  /** center x */
  x: number
  /** center height above the floor */
  y: number
  w: number
  dir: 1 | -1
  t: number
  dur: number
  rot: number
  variant: number
  dead: boolean
  /** can't hurt anyone any more (a shockwave that has rolled past Albert) — no longer holds up the dodge */
  spent: boolean
  /* bat */
  x0: number
  reach: number
  ret: boolean
  whir: number
}

/** Static data React needs to mount a hazard element. */
export interface HazardView {
  id: number
  kind: HazardKind
  x: number
  w: number
  dir: 1 | -1
  dur: number
  variant: number
}

export type GameEvent =
  | { type: 'sfx'; name: SfxName; volume?: number; pitch?: number }
  | { type: 'local'; name: LocalSound; arg?: number }
  | { type: 'shake'; strength: ShakeStrength; duration?: number; rotate?: boolean }
  | { type: 'fx'; kind: FxKind; x: number; y: number; text?: string }
  | { type: 'hazards' }
  | { type: 'hint'; key: HintKey }
  | { type: 'bonk'; dmg: number; count: number; x: number }
  | { type: 'dodge'; dmg: number; streak: number }
  | { type: 'hit'; hearts: number }
  | { type: 'phase'; phase: PhaseNo }
  | { type: 'downed' }
  | { type: 'revived' }
  | { type: 'ko' }
  | { type: 'flash'; color: 'red' | 'white' | 'hot' }
  | { type: 'introArrived' }
  | { type: 'beat'; n: number }

type BossMode = 'off' | 'enter' | 'script' | 'rest' | 'approach' | 'windup' | 'strike' | 'throwWait' | 'rain' | 'dizzy' | 'gloat' | 'recover' | 'phase'

interface AttackRec {
  kind: AttackKind
  hit: boolean
  live: number
  done: boolean
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const approach = (v: number, target: number, step: number) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step))
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo)

export class Game {
  W: number
  mode: GameMode = 'intro'
  phase: PhaseNo = 1
  hp = BOSS_MAX_HP
  hearts = HEARTS
  freeze = 0
  clock = 0
  stats = { dodges: 0, bonks: 0, hits: 0, time: 0, downs: 0 }
  dodgeStreak = 0

  input = { left: false, right: false, jumpHeld: false, jumpPressed: false, target: null as number | null }

  albert = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1 as 1 | -1,
    grounded: true,
    invuln: 0,
    stun: 0,
    land: 0,
    bonkT: 0,
    jumpBuffer: 0,
    coyote: 0,
    anim: 'sleepy' as AlbertAnim,
  }

  boss = {
    x: 0,
    y: 0,
    facing: -1 as 1 | -1,
    mode: 'off' as BossMode,
    t: 0,
    dur: 0,
    targetX: 0,
    attack: 'slam' as AttackKind,
    attackId: 0,
    attackHit: false,
    impacted: false,
    seqIdx: 0,
    impactX: 0,
    bonks: 0,
    bonkCd: 0,
    hurtFlash: 0,
    stepT: 0,
    rainLeft: 0,
    rainT: 0,
    lastDropX: -999,
    look: { pose: 'idle', expression: 'creepy', hasBat: true } as BossLook,
  }

  hazards: Hazard[] = []
  private attacks = new Map<number, AttackRec>()
  private seq = 0
  private hints = new Set<HintKey>()
  private respawnT = 0
  /** after a knock-out he's worn out from all that bonking: the next window is a free dizzy */
  private mercy = false
  private beatT = 0
  private beatN = 0
  private emitFn: (e: GameEvent) => void

  constructor(width: number, emit: (e: GameEvent) => void) {
    this.W = width
    this.emitFn = emit
    this.setupIntro()
  }

  private emit(e: GameEvent) {
    this.emitFn(e)
  }

  /* ------------------------------------------------------------------ */
  /* Flow control (called by the scene)                                  */
  /* ------------------------------------------------------------------ */

  setupIntro() {
    const a = this.albert
    const b = this.boss
    this.mode = 'intro'
    a.x = this.W * 0.24
    a.facing = 1
    b.x = this.W + 170
    b.facing = -1
    b.targetX = this.W * 0.7
    b.mode = 'enter'
    this.setLook('walk', 'creepy')
  }

  skipIntro() {
    const b = this.boss
    if (b.mode !== 'enter') return
    b.x = b.targetX
    b.mode = 'script'
    this.setLook('idle', 'creepy')
    this.emit({ type: 'introArrived' })
  }

  startFight() {
    this.mode = 'fight'
    this.clearInput()
    this.toRest(1.8)
    this.emit({ type: 'fx', kind: 'wake', x: this.albert.x, y: A.hurtH + 50, text: '!?' })
    this.emit({ type: 'sfx', name: 'boing', volume: 0.7, pitch: 1.4 })
  }

  /** Fresh fight (rematch) — skips the intro. */
  reset() {
    this.clearHazards()
    this.phase = 1
    this.hp = BOSS_MAX_HP
    this.hearts = HEARTS
    this.stats = { dodges: 0, bonks: 0, hits: 0, time: 0, downs: 0 }
    this.dodgeStreak = 0
    this.hints.clear()
    this.mercy = false
    Object.assign(this.albert, { x: this.W * 0.24, y: 0, vx: 0, vy: 0, grounded: true, invuln: 0, stun: 0, land: 0, bonkT: 0, facing: 1 })
    Object.assign(this.boss, { x: this.W * 0.7, y: 0, facing: -1, seqIdx: 0, bonks: 0 })
    this.setLook('taunt', 'creepy', true)
    this.startFight()
  }

  setLook(pose: RigPose, expression: TungExpression, hasBat = this.boss.look.hasBat) {
    const l = this.boss.look
    if (l.pose !== pose || l.expression !== expression || l.hasBat !== hasBat) this.boss.look = { pose, expression, hasBat }
  }

  setWidth(w: number) {
    if (Math.abs(w - this.W) < 0.5) return
    const k = w / this.W
    this.W = w
    this.albert.x = clamp(this.albert.x * k, A.margin, w - A.margin)
    this.boss.x *= k
    this.boss.targetX *= k
    this.boss.impactX *= k
    for (const h of this.hazards) {
      h.x *= k
      h.x0 *= k
    }
    if (this.input.target !== null) this.input.target *= k
    this.emit({ type: 'hazards' })
  }

  clearInput() {
    const i = this.input
    i.left = i.right = i.jumpHeld = i.jumpPressed = false
    i.target = null
  }

  get bossMin() {
    return 95
  }
  get bossMax() {
    return this.W - 95
  }
  /** birthday assist: every knock-out makes him a little slower to wind up / slower waves (capped) */
  get assist() {
    return Math.min(3, this.stats.downs)
  }
  get waveSpeed() {
    return TUNING[this.phase].wave * (1 - 0.08 * this.assist)
  }

  /**
   * The cue over Albert's head. '!' while he stands where the bat will land; "JUMP!" only once a
   * jump started now (after a human reaction delay) would clear it — never so early that obeying it
   * makes him land in the hit.
   */
  get cue(): Cue {
    if (this.mode !== 'fight') return ''
    const a = this.albert
    const b = this.boss
    let cue: Cue = ''
    for (const h of this.hazards) {
      if (h.dead || h.spent) continue
      if (h.kind === 'wave') {
        const reach = WAVE_HALF + A.hurtHalfW
        const ahead = (a.x - h.x) * h.dir
        if (ahead < -reach) continue
        const arrive = Math.max(0, -h.t) + Math.max(0, ahead - reach) / this.waveSpeed
        if (arrive < CUE_LEAD) return 'jump'
      } else if (h.kind === 'bat') {
        // out at ~520 u/s, back at ~470: jump when it's this close
        const ahead = (a.x - h.x) * (h.ret ? -h.dir : h.dir)
        if (ahead > -30 && ahead < 250) return 'jump'
      } else if (h.kind === 'drop') {
        if (Math.abs(h.x - a.x) < DROP_R + A.hurtHalfW + 8 && h.dur - h.t < 0.75) cue = 'danger'
      }
    }
    if (b.attack === 'slam' && (b.mode === 'windup' || (b.mode === 'strike' && !b.impacted))) {
      const d = Math.abs(a.x - b.impactX)
      if (d < SLAM_HIT_HALF + A.hurtHalfW) return b.mode === 'windup' ? 'danger' : cue
      if (TUNING[this.phase].wave > 0) {
        // phase 2+: predict when the shockwave will reach him
        const toImpact = b.mode === 'windup' ? b.dur - b.t + SLAM_DELAY : SLAM_DELAY - b.t
        const arrive = toImpact + WAVE_DELAY + Math.max(0, d - 30 - WAVE_HALF - A.hurtHalfW) / this.waveSpeed
        if (arrive < CUE_LEAD) return 'jump'
      }
    }
    if (b.mode === 'windup' || (b.mode === 'strike' && b.attack === 'swing')) {
      if (b.attack === 'swing') {
        const x0 = b.x + b.facing * SWING_FROM
        const x1 = b.x + b.facing * SWING_TO
        if (a.x > Math.min(x0, x1) - A.hurtHalfW && a.x < Math.max(x0, x1) + A.hurtHalfW) {
          const left = b.mode === 'windup' ? b.dur - b.t : -b.t
          if (left < CUE_LEAD - 0.05 && left > -SWING_ACTIVE[1]) return 'jump'
          return 'danger'
        }
      }
    }
    return cue
  }

  get canBonk() {
    return this.mode === 'fight' && this.boss.mode === 'dizzy' && this.boss.bonks < MAX_BONKS
  }

  /** Bonk Tung while he's dizzy. Keyboard bonks need Albert nearby. */
  tryBonk(source: 'pointer' | 'key'): boolean {
    const b = this.boss
    const a = this.albert
    if (!this.canBonk || b.bonkCd > 0) return false
    if (source === 'key' && Math.abs(a.x - b.x) > 250) {
      this.emit({ type: 'fx', kind: 'far', x: a.x, y: A.hurtH + 60, text: 'GET CLOSER!' })
      this.emit({ type: 'sfx', name: 'error', volume: 0.5 })
      return false
    }
    b.bonks++
    b.bonkCd = 0.16
    b.hurtFlash = 0.24
    a.bonkT = 0.3
    if (Math.abs(a.x - b.x) > 30) a.facing = b.x > a.x ? 1 : -1
    this.stats.bonks++
    const crit = b.bonks === MAX_BONKS
    const dmg = crit ? DMG.crit : DMG.bonk
    this.freeze = crit ? 0.12 : 0.06
    this.emit({ type: 'bonk', dmg, count: b.bonks, x: b.x })
    this.emit({ type: 'fx', kind: 'hammer', x: b.x, y: 300 })
    // damage numbers pop beside his head, opposite the BONK! burst (never over the prompt above him)
    const side = b.bonks === 1 ? -1 : 1
    this.emit({ type: 'fx', kind: crit ? 'crit' : 'dmg', x: crit ? b.x : b.x + side * rand(85, 105), y: crit ? 300 : 250, text: `-${dmg}` })
    if (crit) {
      // he shakes it off soon after the third bonk
      b.dur = Math.min(b.dur, b.t + 0.5)
    }
    this.damageBoss(dmg)
    return true
  }

  pressJump(held: boolean) {
    if (held && !this.input.jumpHeld) this.input.jumpPressed = true
    this.input.jumpHeld = held
  }

  /* ------------------------------------------------------------------ */
  /* Simulation                                                          */
  /* ------------------------------------------------------------------ */

  step(rawDt: number) {
    const dt = Math.min(rawDt, 1 / 30)
    if (this.freeze > 0) {
      this.freeze -= dt
      return
    }
    this.clock += dt
    if (this.mode === 'fight') {
      this.stats.time += dt
      if (this.phase === 3) this.ambience(dt)
    }
    if (this.mode === 'respawn') {
      this.respawnT -= dt
      if (this.respawnT <= 0) this.revive()
    }
    this.updateAlbert(dt)
    this.updateBoss(dt)
    this.updateHazards(dt)
    this.resolveAttacks()
  }

  /** phase 3: the pos ronda alarm keeps going — tung-tung . tung-tung-tung, quiet, fast */
  private ambience(dt: number) {
    this.beatT -= dt
    if (this.beatT > 0) return
    const pattern = [0.17, 0.34, 0.17, 0.17, 0.5]
    const i = this.beatN++ % pattern.length
    this.beatT = pattern[i]
    this.emit({ type: 'sfx', name: 'tung', volume: 0.14, pitch: i < 2 ? 1.05 : 1.2 })
    this.emit({ type: 'beat', n: i })
  }

  private updateAlbert(dt: number) {
    const a = this.albert
    const inp = this.input
    const control = this.mode === 'fight' && a.stun <= 0
    let dir = 0
    if (control) {
      dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0)
      if (dir !== 0) inp.target = null
      else if (inp.target !== null) {
        const d = inp.target - a.x
        if (Math.abs(d) < 8) inp.target = null
        else dir = Math.sign(d) * Math.min(1, Math.abs(d) / 45)
      }
    }
    if (inp.jumpPressed) {
      a.jumpBuffer = 0.14
      inp.jumpPressed = false
    }
    a.jumpBuffer -= dt
    a.coyote = a.grounded ? 0.09 : a.coyote - dt

    const acc = a.stun > 0 ? 700 : this.mode !== 'fight' ? 2000 : a.grounded ? A.accel : A.airAccel
    a.vx = approach(a.vx, dir * A.speed, acc * dt)

    if (control && a.jumpBuffer > 0 && a.coyote > 0) {
      a.vy = A.jumpV
      a.grounded = false
      a.coyote = 0
      a.jumpBuffer = 0
      this.emit({ type: 'sfx', name: 'jump', volume: 0.55 })
    }
    if (!a.grounded) {
      // every jump is a full jump (taps on touch = same as holds)
      a.vy -= A.gravity * dt
      a.y += a.vy * dt
      if (a.y <= 0) {
        const impact = -a.vy
        a.y = 0
        a.vy = 0
        a.grounded = true
        a.land = Math.min(1, impact / 1000)
        if (impact > 350) this.emit({ type: 'sfx', name: 'land', volume: 0.35 })
      }
    }
    a.x += a.vx * dt
    if (a.x < A.margin || a.x > this.W - A.margin) {
      a.x = clamp(a.x, A.margin, this.W - A.margin)
      a.vx = 0
    }
    a.invuln -= dt
    a.stun -= dt
    a.bonkT -= dt
    a.land = Math.max(0, a.land - dt * 5)

    if (dir !== 0 && a.stun <= 0) a.facing = dir > 0 ? 1 : -1
    else if (this.mode === 'fight' && Math.abs(a.vx) < 30 && Math.abs(this.boss.x - a.x) > 40 && a.bonkT <= 0) a.facing = this.boss.x > a.x ? 1 : -1

    a.anim =
      this.mode === 'victory'
        ? 'win'
        : this.mode === 'respawn'
          ? 'ko'
          : this.mode === 'intro'
            ? 'sleepy'
            : a.stun > 0
              ? 'hurt'
              : !a.grounded
                ? a.vy > 0
                  ? 'jump'
                  : 'fall'
                : a.bonkT > 0
                  ? 'bonk'
                  : Math.abs(a.vx) > 60
                    ? 'run'
                    : 'idle'
  }

  private faceAlbert() {
    const b = this.boss
    const dx = this.albert.x - b.x
    if (Math.abs(dx) > 26) b.facing = dx > 0 ? 1 : -1
  }

  private walkTo(target: number, speed: number, dt: number) {
    const b = this.boss
    const d = target - b.x
    b.x += clamp(d, -speed * dt, speed * dt)
    b.x = clamp(b.x, this.bossMin - 400, this.bossMax + 400)
    b.stepT -= dt
    if (b.stepT <= 0) {
      b.stepT = this.phase === 3 ? 0.27 : 0.34
      this.emit({ type: 'sfx', name: 'tung', volume: 0.16, pitch: 0.55 + Math.random() * 0.12 })
    }
    return Math.abs(d) < 10
  }

  private updateBoss(dt: number) {
    const b = this.boss
    const tune = TUNING[this.phase]
    b.t += dt
    b.hurtFlash -= dt
    b.bonkCd -= dt
    const angry: TungExpression = this.phase === 1 ? 'creepy' : 'angry'

    switch (b.mode) {
      case 'off':
      case 'script':
        break
      case 'enter': {
        b.facing = -1
        if (this.walkTo(b.targetX, 165, dt)) {
          b.mode = 'script'
          this.setLook('idle', 'creepy')
          this.emit({ type: 'introArrived' })
        }
        break
      }
      case 'rest': {
        this.faceAlbert()
        this.setLook(b.t % 2.4 < 1.2 || this.phase === 1 ? 'idle' : 'taunt', b.hurtFlash > 0 ? 'hurt' : angry, true)
        if (b.t >= b.dur) {
          if (this.mercy) {
            // birthday mercy: nobody gets stuck — every knock-out buys a free bonk window
            this.mercy = false
            this.toDizzy()
            this.hint('mercy')
          } else this.nextAttack()
        }
        break
      }
      case 'approach': {
        const a = this.albert
        let target = b.targetX
        if (b.attack === 'slam' || b.attack === 'swing') {
          this.faceAlbert()
          const reach = b.attack === 'slam' ? SLAM_REACH : 150
          target = a.x - b.facing * reach
        } else {
          b.facing = target > b.x ? 1 : -1
        }
        target = clamp(target, this.bossMin, this.bossMax)
        this.setLook('walk', angry)
        // far away → he charges (so he doesn't give up and slam thin air across the street)
        const far = Math.abs(target - b.x) > 280 ? 1.45 : 1
        const arrived = this.walkTo(target, (b.attack === 'throw' ? tune.walk * 1.35 : tune.walk) * far, dt)
        if (arrived || b.t > 2.6) this.beginWindup()
        break
      }
      case 'windup':
        if (b.t >= b.dur) this.strike()
        break
      case 'strike': {
        if (b.attack === 'slam' && !b.impacted && b.t >= SLAM_DELAY) this.slamImpact()
        if (b.attack === 'throw' && b.t >= b.dur) {
          this.releaseBat()
          break
        }
        if (b.attack === 'swing' && b.t > SWING_ACTIVE[0] && b.t < SWING_ACTIVE[1]) {
          const a = this.albert
          const x0 = b.x + b.facing * SWING_FROM
          const x1 = b.x + b.facing * SWING_TO
          const lo = Math.min(x0, x1) - A.hurtHalfW
          const hi = Math.max(x0, x1) + A.hurtHalfW
          if (a.x > lo && a.x < hi && a.y < SWING_HIT_Y) this.hitAlbert(b.x, b.attackId, true)
        }
        if (b.t >= b.dur) this.afterStrike()
        break
      }
      case 'throwWait': {
        const bat = this.hazards.find((h) => h.kind === 'bat' && !h.dead)
        if (bat && b.t > 0.3) b.facing = bat.x > b.x ? 1 : -1
        this.setLook(b.t < 0.4 ? 'throw' : bat && bat.ret ? 'idle' : 'taunt', b.t < 0.4 ? 'windup' : 'creepy', false)
        break
      }
      case 'rain': {
        this.setLook('hop', 'windup', true)
        b.rainT -= dt
        if (b.rainLeft > 0 && b.rainT <= 0) {
          this.spawnDrop()
          b.rainLeft--
          b.rainT = 0.38
        }
        const rec = this.attacks.get(b.attackId)
        if (b.rainLeft === 0 && rec && !rec.done) rec.done = true
        if (b.rainLeft === 0 && (!rec || rec.live <= 0)) {
          if (b.attackHit) this.toGloat()
          else this.toDizzy()
        }
        break
      }
      case 'dizzy':
        this.setLook('dizzy', b.hurtFlash > 0 ? 'hurt' : 'dizzy', true)
        if (b.t >= b.dur) {
          b.mode = 'recover'
          b.t = 0
          b.dur = 0.6
          this.setLook('hop', 'angry', true)
          this.emit({ type: 'sfx', name: 'tungTriple', volume: 0.6 })
        }
        break
      case 'gloat':
      case 'recover':
      case 'phase':
        if (b.mode === 'phase' && b.t > 1.1) this.setLook('taunt', 'angry', true)
        if (b.t >= b.dur) this.toRest(b.mode === 'phase' ? 0.5 : tune.rest)
        break
    }
  }

  private toRest(dur: number) {
    const b = this.boss
    b.mode = 'rest'
    b.t = 0
    b.dur = dur
  }

  private toGloat() {
    const b = this.boss
    b.mode = 'gloat'
    b.t = 0
    b.dur = 1.1
    this.setLook('taunt', 'happy', true)
  }

  private toDizzy() {
    const b = this.boss
    b.mode = 'dizzy'
    b.t = 0
    b.dur = TUNING[this.phase].dizzy + 0.15 * this.assist
    b.bonks = 0
    this.setLook('dizzy', 'dizzy', true)
    this.emit({ type: 'local', name: 'dizzy' })
    this.hint('bonk')
  }

  private nextAttack() {
    const b = this.boss
    const seq = ATTACK_SEQ[this.phase]
    const kind = seq[b.seqIdx % seq.length]
    b.seqIdx++
    b.attack = kind
    b.attackId = ++this.seq
    b.attackHit = false
    b.t = 0
    this.attacks.set(b.attackId, { kind, hit: false, live: 0, done: false })
    if (kind === 'rain') {
      b.mode = 'rain'
      b.rainLeft = 6
      b.rainT = 0.45
      this.hint('rain')
      this.emit({ type: 'local', name: 'alarm' })
      return
    }
    if (kind === 'throw') {
      // back off to the side away from Albert so the bat has room to fly
      const left = this.albert.x > this.W / 2
      b.targetX = clamp(left ? 150 : this.W - 150, this.bossMin, this.bossMax)
    }
    b.mode = 'approach'
  }

  private beginWindup() {
    const b = this.boss
    const tune = TUNING[this.phase]
    b.mode = 'windup'
    b.t = 0
    if (b.attack === 'throw') b.facing = this.W - b.x > b.x ? 1 : -1
    else this.faceAlbert()
    const windup = tune.windup + 0.1 * this.assist
    b.dur = b.attack === 'throw' ? windup + 0.2 : b.attack === 'swing' ? windup * 0.95 : windup
    // overhead = slam (get out of the zone), batter's crouch = low swing (jump it)
    this.setLook(b.attack === 'swing' ? 'windupLow' : 'windup', 'windup', true)
    this.emit({ type: 'local', name: 'windup', arg: b.dur })
    if (b.attack === 'slam') {
      b.impactX = b.x + b.facing * SLAM_REACH
      // from phase 2 on every slam sends shockwaves both ways: the marker says so (variant 1) and
      // the first time the hint warns BEFORE the impact, so the jump isn't a guess
      const waves = TUNING[this.phase].wave > 0
      this.addHazard({ kind: 'marker', x: b.impactX, w: SLAM_HALF * 2, dur: b.dur, variant: waves ? 1 : 0 })
      this.hint(waves ? 'wave' : 'slam')
    } else if (b.attack === 'swing') {
      this.addHazard({ kind: 'band', x: b.x + (b.facing * (SWING_FROM + SWING_TO)) / 2, w: SWING_TO - SWING_FROM, dir: b.facing, dur: b.dur })
      this.hint('swing')
    } else if (b.attack === 'throw') {
      const start = b.x + b.facing * 40
      const end = b.facing > 0 ? this.W - 40 : 40
      this.addHazard({ kind: 'trail', x: (start + end) / 2, w: Math.abs(end - start), dir: b.facing, dur: b.dur })
      this.hint('throw')
    }
  }

  private strike() {
    const b = this.boss
    b.mode = 'strike'
    b.t = 0
    b.impacted = false
    this.removeTelegraphs()
    if (b.attack === 'slam') {
      // the art's bat hits the ground SLAM_DELAY into the slam pose
      b.dur = 0.62
      this.setLook('slam', 'angry', true)
      this.emit({ type: 'sfx', name: 'whoosh', volume: 0.6, pitch: 0.7 })
    } else if (b.attack === 'swing') {
      b.dur = 0.5
      this.setLook('swing', 'angry', true)
      this.emit({ type: 'sfx', name: 'swoosh', pitch: 0.8 })
      this.emit({ type: 'sfx', name: 'whoosh', volume: 0.7 })
      this.emit({ type: 'fx', kind: 'slash', x: b.x + (b.facing * (SWING_FROM + SWING_TO)) / 2, y: 0, text: b.facing > 0 ? 'r' : 'l' })
      this.emit({ type: 'shake', strength: 'small', duration: 0.25 })
    } else if (b.attack === 'throw') {
      // release happens THROW_RELEASE into the throw pose
      b.dur = THROW_RELEASE
      this.setLook('throw', 'windup', true)
    }
  }

  private slamImpact() {
    const b = this.boss
    const a = this.albert
    b.impacted = true
    if (Math.abs(a.x - b.impactX) < SLAM_HIT_HALF + A.hurtHalfW && a.y < 120) this.hitAlbert(b.impactX, b.attackId, true)
    this.emit({ type: 'sfx', name: 'stomp' })
    this.emit({ type: 'sfx', name: 'tung', pitch: 0.8 })
    this.emit({ type: 'shake', strength: this.phase === 3 ? 'big' : 'medium', duration: 0.4 })
    this.emit({ type: 'fx', kind: 'dust', x: b.impactX, y: 0 })
    if (this.phase === 3) this.emit({ type: 'flash', color: 'hot' })
    // knocked out by the slam itself → no shockwaves into the respawn screen
    if (this.mode === 'fight' && TUNING[this.phase].wave > 0) {
      // they rise out of the cracked road for a beat, then launch — the BOOM is the cue to jump
      for (const dir of [-1, 1] as const) this.addHazard({ kind: 'wave', x: b.impactX + dir * 30, dir, w: WAVE_HALF * 2, dur: 0 }, true).t = -WAVE_DELAY
      this.emit({ type: 'local', name: 'rumble' })
    }
  }

  private releaseBat() {
    const b = this.boss
    const x0 = b.x + b.facing * 60
    const end = b.facing > 0 ? this.W - 50 : 50
    this.setLook('throw', 'windup', false)
    this.emit({ type: 'sfx', name: 'whoosh' })
    const h = this.addHazard({ kind: 'bat', x: x0, dir: b.facing, w: 0, dur: 0 }, true)
    h.x0 = x0
    h.y = 105
    h.reach = Math.max(120, Math.abs(end - x0))
    b.mode = 'throwWait'
    b.t = 0
  }

  private afterStrike() {
    const b = this.boss
    const rec = this.attacks.get(b.attackId)
    if (rec) rec.done = true
    if (b.attackHit) this.toGloat()
    else this.toDizzy()
  }

  private spawnDrop() {
    const b = this.boss
    const a = this.albert
    let x = Math.random() < 0.6 ? a.x + rand(-55, 55) : rand(60, this.W - 60)
    if (Math.abs(x - b.lastDropX) < 80) x += x > b.lastDropX ? 90 : -90
    x = clamp(x, 50, this.W - 50)
    b.lastDropX = x
    const h = this.addHazard({ kind: 'drop', x, w: DROP_R * 2, dur: DROP_FALL, variant: Math.random() < 0.55 ? 0 : 1 }, true)
    h.y = FLOOR + 160
    h.rot = rand(-30, 30)
    this.emit({ type: 'sfx', name: 'tung', volume: 0.5, pitch: 0.9 + Math.random() * 0.4 })
  }

  private updateHazards(dt: number) {
    const a = this.albert
    let changed = false
    for (const h of [...this.hazards]) {
      if (h.dead) continue
      h.t += dt
      if (h.kind === 'wave') {
        if (h.t < 0) continue
        h.x += h.dir * this.waveSpeed * dt
        if (!h.spent) {
          const reach = WAVE_HALF + A.hurtHalfW
          if (Math.abs(a.x - h.x) < reach && a.y < WAVE_HIT_Y) {
            if (this.hitAlbert(h.x - h.dir * 40, h.attack)) this.spend(h)
          } else if ((a.x - h.x) * h.dir < -reach) this.spend(h) // rolled past him: DODGED! right away, not when it leaves the screen
        }
        if (h.x < -60 || h.x > this.W + 60) changed = this.kill(h) || changed
      } else if (h.kind === 'bat') {
        const outT = h.reach / 520 + 0.25
        const backT = h.reach / 470 + 0.2
        h.rot += dt * 900 * h.dir
        h.whir -= dt
        if (h.whir <= 0) {
          h.whir = 0.2
          this.emit({ type: 'local', name: 'whir' })
        }
        if (!h.ret) {
          const p = Math.min(1, h.t / outT)
          const s = h.reach * (0.5 * p + 0.5 * (1 - (1 - p) * (1 - p)))
          h.x = h.x0 + h.dir * s
          h.y = BAT_Y + Math.max(0, 53 * (1 - h.t / 0.18))
          if (p >= 1) {
            h.ret = true
            h.t = 0
            this.emit({ type: 'sfx', name: 'boing', volume: 0.5, pitch: 1.3 })
          }
        } else {
          const p = Math.min(1, h.t / backT)
          const s = h.reach * (1 - (0.5 * p + 0.5 * p * p))
          h.x = h.x0 + h.dir * s
          h.y = BAT_Y
          if (p >= 1) {
            changed = this.kill(h) || changed
            this.selfBonk(h.attack)
            continue
          }
        }
        // circle vs Albert's box
        const cx = clamp(h.x, a.x - A.hurtHalfW, a.x + A.hurtHalfW)
        const cy = clamp(h.y, a.y, a.y + A.hurtH)
        if ((h.x - cx) ** 2 + (h.y - cy) ** 2 < BAT_R * BAT_R) this.hitAlbert(h.x - h.dir * 30, h.attack)
      } else if (h.kind === 'drop') {
        const p = Math.min(1, h.t / h.dur)
        h.y = (FLOOR + 160) * (1 - p * p)
        h.rot += dt * 140 * (h.variant ? 1 : -1)
        if (p >= 1) {
          if (Math.abs(a.x - h.x) < DROP_R + A.hurtHalfW && a.y < 72) this.hitAlbert(h.x, h.attack)
          this.emit({ type: 'fx', kind: 'shatter', x: h.x, y: 0, text: h.variant ? 'TUNG!' : 'TONK!' })
          this.emit({ type: 'sfx', name: 'tung', pitch: 0.75 + Math.random() * 0.5 })
          this.emit({ type: 'sfx', name: 'crack', volume: 0.35 })
          this.emit({ type: 'shake', strength: 'tiny', duration: 0.18 })
          changed = this.kill(h) || changed
        }
      }
    }
    if (changed) {
      this.hazards = this.hazards.filter((h) => !h.dead)
      this.emit({ type: 'hazards' })
    }
  }

  private selfBonk(attackId: number) {
    const b = this.boss
    const rec = this.attacks.get(attackId)
    if (rec) rec.done = true
    if (this.mode !== 'fight') return
    this.setLook('dizzy', 'hurt', true)
    this.emit({ type: 'sfx', name: 'bonk' })
    this.emit({ type: 'sfx', name: 'boing', volume: 0.6, pitch: 0.7 })
    this.emit({ type: 'shake', strength: 'small', duration: 0.3 })
    this.emit({ type: 'fx', kind: 'selfbonk', x: b.x, y: 330, text: 'SELF-BONK!' })
    this.toDizzy()
    b.hurtFlash = 0.35
    this.damageBoss(DMG.selfBonk)
  }

  /** a live hazard stops counting toward its attack (dodge resolves once none are left) */
  private spend(h: Hazard) {
    if (h.spent) return
    h.spent = true
    const rec = this.attacks.get(h.attack)
    if (rec && (h.kind === 'wave' || h.kind === 'bat' || h.kind === 'drop')) rec.live--
  }

  private kill(h: Hazard) {
    if (h.dead) return false
    h.dead = true
    this.spend(h)
    return true
  }

  private removeTelegraphs() {
    let changed = false
    for (const h of this.hazards) {
      if (h.kind === 'marker' || h.kind === 'band' || h.kind === 'trail') changed = this.kill(h) || changed
    }
    if (changed) {
      this.hazards = this.hazards.filter((h) => !h.dead)
      this.emit({ type: 'hazards' })
    }
  }

  private addHazard(p: { kind: HazardKind; x: number; w: number; dur: number; dir?: 1 | -1; variant?: number }, live = false): Hazard {
    const h: Hazard = {
      id: ++this.seq,
      kind: p.kind,
      attack: this.boss.attackId,
      x: p.x,
      y: 0,
      w: p.w,
      dir: p.dir ?? 1,
      t: 0,
      dur: p.dur,
      rot: 0,
      variant: p.variant ?? 0,
      dead: false,
      spent: false,
      x0: p.x,
      reach: 0,
      ret: false,
      whir: 0,
    }
    this.hazards.push(h)
    if (live) {
      const rec = this.attacks.get(h.attack)
      if (rec) rec.live++
    }
    this.emit({ type: 'hazards' })
    return h
  }

  private clearHazards() {
    for (const h of this.hazards) h.dead = true
    this.hazards = []
    this.attacks.clear()
    this.emit({ type: 'hazards' })
  }

  hazardViews(): HazardView[] {
    return this.hazards.map((h) => ({ id: h.id, kind: h.kind, x: h.x, w: h.w, dir: h.dir, dur: h.dur, variant: h.variant }))
  }

  private resolveAttacks() {
    for (const [id, rec] of this.attacks) {
      if (!rec.done || rec.live > 0) continue
      this.attacks.delete(id)
      if (rec.hit || this.mode !== 'fight') continue
      this.dodgeStreak++
      this.stats.dodges++
      const a = this.albert
      this.emit({ type: 'dodge', dmg: DMG.dodge, streak: this.dodgeStreak })
      this.emit({ type: 'fx', kind: 'dodge', x: a.x, y: A.hurtH + a.y + 50, text: 'DODGED!' })
      this.emit({ type: 'fx', kind: 'dmg', x: this.boss.x - this.boss.facing * 95, y: 250, text: `-${DMG.dodge}` })
      if (this.dodgeStreak >= 2) this.emit({ type: 'fx', kind: 'streak', x: a.x, y: A.hurtH + a.y + 100, text: `${this.dodgeStreak}× STREAK` })
      this.emit({ type: 'local', name: 'ding', arg: this.dodgeStreak })
      this.emit({ type: 'shake', strength: 'tiny', duration: 0.2 })
      if (this.boss.mode !== 'dizzy') this.boss.hurtFlash = 0.3
      this.damageBoss(DMG.dodge)
      if (this.mode !== 'fight') return
    }
  }

  private hint(key: HintKey) {
    if (this.hints.has(key)) return
    this.hints.add(key)
    this.emit({ type: 'hint', key })
  }

  /**
   * `direct`: hit by the bat itself (slam / swing) — he gloats instead of getting dizzy. Shockwaves,
   * the boomerang and falling kentongan only cost a heart (and the dodge bonus): he still wears
   * himself out, so one graze never wipes out the whole bonk window.
   */
  private hitAlbert(srcX: number, attackId: number, direct = false): boolean {
    const a = this.albert
    if (a.invuln > 0 || this.mode !== 'fight') return false
    const rec = this.attacks.get(attackId)
    if (rec) rec.hit = true
    if (direct && attackId === this.boss.attackId) this.boss.attackHit = true
    this.hearts = Math.max(0, this.hearts - 1)
    this.stats.hits++
    this.dodgeStreak = 0
    const dir = a.x === srcX ? (a.x < this.W / 2 ? 1 : -1) : a.x > srcX ? 1 : -1
    a.vx = dir * 560
    a.vy = 560
    a.grounded = false
    a.stun = 0.45
    a.invuln = 1.6
    this.input.target = null
    this.emit({ type: 'hit', hearts: this.hearts })
    this.emit({ type: 'sfx', name: 'hurt' })
    this.emit({ type: 'sfx', name: 'bonk', volume: 0.6, pitch: 0.8 })
    this.emit({ type: 'shake', strength: 'medium', duration: 0.35, rotate: true })
    this.emit({ type: 'flash', color: 'red' })
    this.emit({ type: 'fx', kind: 'hit', x: a.x, y: A.hurtH + 60, text: this.hearts > 0 ? 'OUCH!' : 'BONKED!' })
    if (this.hearts <= 0) this.downed()
    return true
  }

  private downed() {
    // the K.O. body lies head-first toward the middle of the street (never off the screen edge)
    this.albert.facing = this.albert.x < this.W / 2 ? -1 : 1
    this.mode = 'respawn'
    this.respawnT = 3.1
    this.stats.downs++
    this.clearHazards()
    this.boss.mode = 'gloat'
    this.boss.t = 0
    this.boss.dur = 99
    this.setLook('taunt', 'happy', true)
    this.emit({ type: 'downed' })
  }

  private revive() {
    this.hearts = HEARTS
    this.mode = 'fight'
    this.albert.invuln = 2.2
    this.clearInput()
    this.mercy = true
    this.toRest(0.8)
    this.emit({ type: 'revived' })
    this.emit({ type: 'fx', kind: 'heal', x: this.albert.x, y: A.hurtH + 70, text: '+5 ♥' })
  }

  /** dev only: jump the boss to an hp value (triggers phase changes / KO) */
  debugSetHp(hp: number) {
    if (this.mode !== 'fight') return
    this.hp = Math.max(1, hp + 1)
    this.damageBoss(1)
  }

  private damageBoss(dmg: number) {
    if (this.mode !== 'fight') return
    this.hp = Math.max(0, this.hp - dmg)
    if (this.hp <= 0) return this.ko()
    if (this.phase === 1 && this.hp <= PHASE_AT[2]) this.enterPhase(2)
    else if (this.phase === 2 && this.hp <= PHASE_AT[3]) this.enterPhase(3)
  }

  private enterPhase(p: PhaseNo) {
    const b = this.boss
    this.phase = p
    this.clearHazards()
    b.mode = 'phase'
    b.t = 0
    b.dur = 2.7
    b.seqIdx = 0
    this.setLook('hop', 'angry', true)
    this.emit({ type: 'phase', phase: p })
  }

  private ko() {
    this.mode = 'victory'
    this.clearHazards()
    this.input.target = null
    this.boss.mode = 'script'
    this.setLook('exhausted', 'exhausted', true)
    this.freeze = 0.4
    this.emit({ type: 'ko' })
  }
}

