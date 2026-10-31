import { AnimatePresence, motion } from 'motion/react'
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
import { sfx } from '../../audio/sfx'
import type { RigPose } from '../../characters/tung/poses'
import type { TungExpression } from '../../characters/types'
import { Tung, TungBat } from '../../characters/tung/Tung'
import { TUNG_TIMING } from '../../characters/tung/timing'
import { BigButton } from '../../components/ui/BigButton'
import { ComicBurst } from '../../components/ui/ComicBurst'
import { fireConfetti, PURPLE_CONFETTI } from '../../components/ui/confetti'
import { NextCta } from '../../components/ui/NextCta'
import { SceneShell } from '../../components/ui/SceneShell'
import { useShake } from '../../components/ui/shake'
import { SpeechBubble } from '../../components/ui/SpeechBubble'
import { toast } from '../../components/ui/toast'
import { useApp, type SceneProps } from '../../state/app'
import { AlbertSvg } from './Albert'
import { ALBERT_H, ALBERT_W, A as PHYS, BAT_LEN, BOSS_MAX_HP, FLOOR, H, HEARTS, MAX_W, MIN_W, TUNG_ART_FACING, TUNG_H, TUNG_W, TUNING, WAVE_DELAY, type PhaseNo } from './constants'
import { KeyLegend, TouchPad } from './Controls'
import { Game, type AlbertAnim, type Cue, type FxKind, type GameEvent, type HazardView, type HintKey } from './engine'
import { Hud } from './Hud'
import { HintBanner, HowToCard, PhaseBanner, RespawnCard, VictoryStats, type Banner } from './Overlays'
import { Kentongan, PartyHammer, Shockwave } from './Props'
import { playLocal } from './sounds'
import { useTouchUi } from './useTouchUi'
import { SkyBackdrop, StreetSet } from './Village'
import './tung.css'

type Flow = 'intro' | 'howto' | 'fight' | 'victory'
/** why the fight is frozen: the soundtrack panel is open over it, or the window lost focus */
type PauseReason = 'player' | 'blur' | null

interface Layout {
  W: number
  s: number
  ox: number
  oy: number
  /** stage px covered by overlaid UI at the top (HUD on short landscape screens) */
  top: number
  /** px from the left that floating hints must avoid */
  avoidL: number
  /** stage size (px) */
  sw: number
  sh: number
}

/**
 * Space the stage must keep clear, from CSS custom properties on the stage (media-query driven):
 * --tg-inset-l / -r: side columns for the touch pad, --tg-inset-b: the floor line stays above this
 * (music player / pad / end buttons below it), --tg-inset-t: overlaid HUD height.
 */
interface Insets {
  l: number
  r: number
  b: number
  t: number
  /** px from the left that floating hints must avoid (the music pill on landscape phones) */
  avoidL: number
}
function readInsets(el: HTMLElement): Insets {
  const cs = getComputedStyle(el)
  const n = (name: string) => {
    const v = parseFloat(cs.getPropertyValue(name))
    return Number.isFinite(v) ? v : 0
  }
  return { l: n('--tg-inset-l'), r: n('--tg-inset-r'), b: n('--tg-inset-b'), t: n('--tg-inset-t'), avoidL: n('--tg-avoid-l') }
}

interface Fx {
  id: number
  kind: FxKind | 'tap'
  x: number
  y: number
  text?: string
}

interface Speech {
  id: number
  text: string
  intensity: 0 | 1 | 2 | 3
  /** boss x (arena units) when the line starts */
  x: number
  cps?: number
  /** ms to hold after typing, then run `next` */
  hold: number
  next?: () => void
}

interface Look {
  pose: RigPose
  expression: TungExpression
  hasBat: boolean
  flip: boolean
  intensity: number
}

const BAT_W = Math.round(BAT_LEN * 0.22)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

function computeLayout(sw: number, sh: number, ins: Insets = { l: 0, r: 0, b: 0, t: 0, avoidL: 0 }, fixedW?: number): Layout {
  const aw = Math.max(1, sw - ins.l - ins.r)
  // the whole arena fits the stage, and the floor line stays above the bottom inset
  // (the strip of road below the floor may run under the dock / music player)
  const hs = Math.max(0.1, Math.min(sh / H, (sh - ins.b) / FLOOR))
  const W = fixedW ?? clamp(aw / hs, MIN_W, MAX_W)
  const s = Math.max(0.1, Math.min(aw / W, hs))
  // tall stages (portrait phones): lift the street off the bottom a little so the action sits
  // nearer the middle instead of leaving one big empty sky above it
  const slack = Math.min(sh - H * s, sh - ins.b - FLOOR * s)
  const oy = slack > 0 ? slack * 0.6 : slack
  return { W, s, ox: ins.l + (aw - W * s) / 2, oy, top: ins.t, avoidL: ins.avoidL, sw, sh }
}

function useTimers() {
  const ids = useRef(new Set<number>())
  useEffect(() => {
    const set = ids.current
    return () => {
      set.forEach((id) => window.clearTimeout(id))
      set.clear()
    }
  }, [])
  return useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      ids.current.delete(id)
      fn()
    }, ms)
    ids.current.add(id)
    return id
  }, [])
}

let uid = 0
const nextId = () => ++uid

/** what he says after landing a hit */
const GLOAT = ['tung.', '*TUNG!*', 'sahur time~', 'wake uuup', 'bonk’d.', 'tung tung tung :)']

/* ------------------------------------------------------------------ */
/* Hazard elements (positions written by the game loop)                 */
/* ------------------------------------------------------------------ */

const HazardEl = memo(function HazardEl({ h, onEl }: { h: HazardView; onEl: (id: number, el: HTMLElement | null) => void }) {
  const ref = (el: HTMLElement | null) => onEl(h.id, el)
  const vars = { '--dur': `${h.dur}s` } as CSSProperties
  switch (h.kind) {
    case 'marker':
      return (
        <div className="tg-marker" style={{ ...vars, left: h.x - h.w / 2, width: h.w, top: FLOOR - 24 }}>
          <div className="tg-marker__beam" />
          <div className="tg-marker__ring">
            <div className="tg-marker__fill" />
          </div>
          {h.variant === 1 && (
            <div className="tg-marker__waves" aria-hidden="true">
              <span>«</span>
              <span>»</span>
            </div>
          )}
          <div className="tg-marker__sign">!</div>
        </div>
      )
    case 'band':
      return (
        <div className={`tg-band ${h.dir < 0 ? 'is-left' : ''}`} style={{ ...vars, left: h.x - h.w / 2, width: h.w, top: FLOOR - 62 }}>
          <div className="tg-band__fill" />
          {/* "go up" chevrons across the band (still readable with Albert standing in the middle;
              the timing cue — "JUMP!" — pops over his head) */}
          <div className="tg-band__chevs" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <svg key={i} viewBox="0 0 24 18" style={{ '--i': i } as CSSProperties}>
                <path d="M3 15 L12 5 L21 15" fill="none" stroke="#0e0620" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 15 L12 5 L21 15" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ))}
          </div>
        </div>
      )
    case 'trail':
      return (
        <div className={`tg-trail ${h.dir < 0 ? 'is-left' : ''}`} style={{ ...vars, left: h.x - h.w / 2, width: h.w, top: FLOOR - 52 - 5 }}>
          <span className="tg-trail__label">JUMP ×2</span>
        </div>
      )
    case 'wave':
      return (
        <div className="tg-wave" ref={ref}>
          <Shockwave />
        </div>
      )
    case 'bat':
      return (
        <div className={`tg-bat ${h.dir < 0 ? 'is-ccw' : ''}`} ref={ref} style={{ width: BAT_W, height: BAT_LEN }}>
          <div className="tg-bat__ghost tg-bat__ghost--2">
            <TungBat />
          </div>
          <div className="tg-bat__ghost">
            <TungBat />
          </div>
          <TungBat />
        </div>
      )
    case 'drop':
      return (
        <>
          <div className="tg-drop-shadow" style={{ ...vars, left: h.x - 34 }}>
            <div className="tg-drop-shadow__x" />
          </div>
          <div className="tg-drop" ref={ref}>
            {h.variant === 0 ? <Kentongan /> : <span className="tg-drop__text">TUNG</span>}
          </div>
        </>
      )
  }
})

const FxEl = memo(function FxEl({ f }: { f: Fx }) {
  const style = { left: f.x, top: FLOOR - f.y } as CSSProperties
  if (f.kind === 'hammer')
    return (
      <div className="tg-fx tg-fx--hammer" style={style}>
        <PartyHammer />
      </div>
    )
  if (f.kind === 'dust')
    return (
      <div className="tg-fx tg-fx--dust" style={style}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} style={{ '--i': i } as CSSProperties} />
        ))}
      </div>
    )
  if (f.kind === 'tap') return <div className="tg-fx tg-fx--tap" style={style} />
  if (f.kind === 'slash')
    return (
      <div className={`tg-fx tg-fx--slash ${f.text === 'l' ? 'is-left' : ''}`} style={style}>
        <svg viewBox="0 0 260 110" preserveAspectRatio="none" aria-hidden="true">
          <path d="M4 104 Q 130 -24 256 104 Q 130 26 4 104 Z" fill="#fff" stroke="#0e0620" strokeWidth="4" strokeLinejoin="round" />
          <path d="M30 98 Q 130 10 230 98" fill="none" stroke="#ff3ea5" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
        </svg>
      </div>
    )
  return (
    <div className={`tg-fx tg-fx--${f.kind}`} style={style}>
      <span>{f.text}</span>
    </div>
  )
})

/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */

export default function TungScene({ onComplete, onNext }: SceneProps) {
  const shake = useShake()
  const touchUi = useTouchUi()
  const later = useTimers()
  // the scene mounts under the brain-wipe goo: hold Tung's walk-in until it lifts
  const { transitioning } = useApp()
  const coveredRef = useRef(transitioning)
  useEffect(() => {
    coveredRef.current = transitioning
  }, [transitioning])

  const [flow, setFlowState] = useState<Flow>('intro')
  const flowRef = useRef<Flow>('intro')
  const setFlow = useCallback((f: Flow) => {
    flowRef.current = f
    setFlowState(f)
  }, [])

  const [layout, setLayout] = useState<Layout | null>(null)
  const layoutRef = useRef<Layout | null>(null)
  const [hp, setHp] = useState(BOSS_MAX_HP)
  const [hearts, setHearts] = useState(HEARTS)
  const [phase, setPhase] = useState<PhaseNo>(1)
  const [look, setLook] = useState<Look>({ pose: 'walk', expression: 'creepy', hasBat: true, flip: TUNG_ART_FACING !== -1, intensity: 0.2 })
  const [alb, setAlb] = useState<{ anim: AlbertAnim; left: boolean; blink: boolean }>({ anim: 'sleepy', left: false, blink: false })
  const [dizzy, setDizzy] = useState(false)
  /** which side of Tung has more screen room (for the label on short screens) */
  const [dizzySide, setDizzySide] = useState<'left' | 'right'>('left')
  /** px the label above his head shifts so it stays on screen near the stage edges */
  const [dizzyShift, setDizzyShift] = useState(0)
  /** bonks landed in the current dizzy window (the label eggs you on) */
  const [bonkN, setBonkN] = useState(0)
  const [hazards, setHazards] = useState<HazardView[]>([])
  const [fx, setFx] = useState<Fx[]>([])
  const [banner, setBanner] = useState<Banner | null>(null)
  const [hint, setHint] = useState<{ id: number; key: HintKey } | null>(null)
  const [downed, setDowned] = useState(false)
  const [speech, setSpeech] = useState<Speech | null>(null)
  const [talking, setTalking] = useState(false)
  const [burst, setBurst] = useState<{ id: number; text: string; x: number; y: number; color: string; size: number } | null>(null)
  const [flash, setFlash] = useState<{ id: number; color: string } | null>(null)
  const [done, setDone] = useState(false)
  const [stats, setStats] = useState<Game['stats'] | null>(null)
  const [round, setRound] = useState(1)
  const [settled, setSettled] = useState(false)
  /** measured bubble heights per placement mode (0 = not measured yet) */
  const [sayH, setSayH] = useState({ above: 0, wide: 0, top: 0 })
  const sayRef = useRef<HTMLDivElement>(null)
  const [scriptIntensity, setScriptIntensity] = useState<number | null>(null)
  const [paused, setPaused] = useState<PauseReason>(null)
  /** where the PAUSED stamp goes while the player panel is open: centred in the stage space the panel leaves free (px from the stage left, -1 = centre) */
  const [pauseAt, setPauseAt] = useState<{ x: number } | null>(null)
  /** what Albert should do right now (shown over his head instead of his name tag) */
  const [cue, setCue] = useState<Cue>('')
  /** victory lines: tap / Space / Enter finishes the line being typed (or cuts its hold short) */
  const [skipLine, setSkipLine] = useState(false)
  const holdRef = useRef<{ id: number; next: () => void } | null>(null)
  const vignetteRef = useRef<HTMLDivElement>(null)
  const cueRef = useRef<HTMLDivElement>(null)

  const gameRef = useRef<Game | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const albertRef = useRef<HTMLDivElement>(null)
  const rigRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)
  const bossRef = useRef<HTMLDivElement>(null)
  const bossFxRef = useRef<HTMLDivElement>(null)
  const hazardEls = useRef(new Map<number, HTMLElement>())
  const scriptIntensityRef = useRef<number | null>(null)
  useLayoutEffect(() => {
    scriptIntensityRef.current = scriptIntensity
  }, [scriptIntensity])

  // insets (CSS) depend on the flow + touch classes → re-fit the arena when those change
  const relayoutRef = useRef<() => void>(() => {})
  useLayoutEffect(() => {
    relayoutRef.current()
  }, [flow, touchUi])

  const onHazardEl = useCallback((id: number, el: HTMLElement | null) => {
    if (el) hazardEls.current.set(id, el)
    else hazardEls.current.delete(id)
  }, [])

  const addFx = useCallback(
    (f: Omit<Fx, 'id'>, ttl = 1100) => {
      const id = nextId()
      setFx((list) => [...list.slice(-22), { ...f, id }])
      later(ttl, () => setFx((list) => list.filter((x) => x.id !== id)))
    },
    [later],
  )

  /** screen-space px (relative to the stage) of an arena point; y = height above the floor */
  const toStage = (x: number, y: number) => {
    const L = layoutRef.current ?? { W: 1000, s: 1, ox: 0, oy: 0, top: 0, avoidL: 0, sw: 1000, sh: H }
    return { left: L.ox + x * L.s, top: L.oy + (FLOOR - y) * L.s }
  }

  /* ---------------- scripted bits ---------------- */

  const say = useCallback((line: Omit<Speech, 'id' | 'x'>) => {
    const g = gameRef.current
    holdRef.current = null
    setSkipLine(false)
    setSpeech({ ...line, id: nextId(), x: g?.boss.x ?? 0 })
    setTalking(true)
  }, [])

  /** victory: hurry the current line along (finish typing, or skip the pause after it) */
  const skipAhead = useCallback(() => {
    const h = holdRef.current
    if (h) {
      holdRef.current = null
      window.clearTimeout(h.id)
      h.next()
    } else setSkipLine(true)
  }, [])

  /** a one-off fight line that clears itself */
  const quip = useCallback(
    (text: string, intensity: 0 | 1 | 2 | 3) => {
      say({ text, intensity, cps: 18, hold: 650, next: () => setSpeech((sp) => (sp && sp.text === text ? null : sp)) })
    },
    [say],
  )

  const toHowTo = useCallback(() => {
    if (flowRef.current !== 'intro') return
    gameRef.current?.skipIntro()
    gameRef.current?.setLook('idle', 'creepy', true)
    setSpeech(null)
    setTalking(false)
    setFlow('howto')
  }, [setFlow])

  const introTalk = useCallback(() => {
    const g = gameRef.current
    if (!g || flowRef.current !== 'intro') return
    g.setLook('taunt', 'creepy')
    sfx.play('tungTriple')
    say({
      text: 'tung… tung… tung…',
      intensity: 1,
      cps: 12,
      hold: 250,
      next: () => {
        if (flowRef.current !== 'intro') return
        gameRef.current?.setLook('hop', 'windup')
        sfx.play('vineBoom')
        sfx.play('airhorn', { volume: 0.5, delay: 0.05 })
        shake({ strength: 'big', duration: 0.5 })
        say({ text: '*SAHUR!!!*', intensity: 3, cps: 20, hold: 900, next: toHowTo })
      },
    })
  }, [say, shake, toHowTo])

  const startFight = useCallback(
    (isRematch: boolean) => {
      const g = gameRef.current
      if (!g) return
      ;(document.activeElement as HTMLElement | null)?.blur?.()
      setSpeech(null)
      setTalking(false)
      setDone(false)
      setStats(null)
      setScriptIntensity(null)
      if (isRematch) {
        g.reset()
        setRound((r) => r + 1)
      } else g.startFight()
      setFlow('fight')
      setBanner({ id: nextId(), kind: 'phase', phase: 1, round: isRematch ? round + 1 : 1 })
      sfx.play('drumroll', { volume: 0.6 })
      sfx.play('airhorn', { delay: 0.75, volume: 0.8 })
      later(2000, () => setBanner((b) => (b?.kind === 'phase' && b.phase === 1 ? null : b)))
    },
    [later, round, setFlow],
  )

  const victory = useCallback(() => {
    const g = gameRef.current
    if (!g) return
    // a rematch K.O. doesn't need the full dramatic hold
    const koHold = round > 1 ? 1100 : 1700
    setFlow('victory')
    setDizzy(false)
    // no leftover gloat line over the K.O.
    setSpeech(null)
    setTalking(false)
    setScriptIntensity(1)
    setBanner({ id: nextId(), kind: 'ko' })
    sfx.play('vineBoom')
    sfx.play('crash', { delay: 0.05, volume: 0.7 })
    shake({ strength: 'huge', duration: 0.7, rotate: true })
    setFlash({ id: nextId(), color: 'white' })
    later(koHold, () => {
      setBanner(null)
      const gg = gameRef.current
      if (!gg) return
      gg.setLook('exhausted', 'exhausted', true)
      setScriptIntensity(0.5)
      say({
        text: 'huff… huff… tung… *tung*…',
        intensity: 0,
        cps: 16,
        hold: 500,
        next: () => {
          const g3 = gameRef.current
          if (!g3) return
          // the rig drops the bat and keeps it lying where it lands (hasBat=false afterwards)
          g3.setLook('dropBat', 'exhausted', true)
          setScriptIntensity(0.35)
          later(TUNG_TIMING.dropReleaseMs, () => sfx.play('whoosh', { volume: 0.4, pitch: 0.75 }))
          later(TUNG_TIMING.dropLandMs, () => {
            sfx.play('clatter')
            shake({ strength: 'tiny', duration: 0.2 })
          })
          later(TUNG_TIMING.dropRestMs + 450, () => {
            const g4 = gameRef.current
            if (!g4) return
            g4.setLook('idle', 'sheepish', false)
            setScriptIntensity(0.3)
            say({
              text: 'ok. OK. you win. I’m too tired to sahur you.',
              intensity: 0,
              hold: 700,
              next: () => {
                const g5 = gameRef.current
                if (!g5) return
                // the party beat first (wave, fanfare, confetti from the bottom corners, stats)…
                g5.setLook('wave', 'happy', false)
                setScriptIntensity(0.2)
                setSpeech(null)
                setTalking(false)
                sfx.play('fanfare')
                fireConfetti({ x: 0.1, y: 0.92, angle: -72, spread: 22, velocity: 17, count: 90, colors: PURPLE_CONFETTI })
                fireConfetti({ x: 0.9, y: 0.92, angle: -108, spread: 22, velocity: 17, count: 90, colors: PURPLE_CONFETTI })
                setStats({ ...g5.stats })
                // …then, once the confetti has mostly fallen, the line it was all for
                later(1250, () => {
                  if (!gameRef.current) return
                  say({
                    text: '*selamat ulang tahun*, Albert! (that’s “happy birthday”.) now go eat something. it’s 3 AM.',
                    intensity: 0,
                    hold: 600,
                    next: () => toast('Achievement: sahur survivor', { body: 'Out-tired a wooden man at 3 AM', icon: '🥁' }),
                  })
                  later(700, () => {
                    setDone(true)
                    onComplete()
                  })
                })
              },
            })
          })
        },
      })
    })
  }, [later, onComplete, round, say, setFlow, shake])

  /* ---------------- game events ---------------- */

  const handleEvent = (e: GameEvent) => {
    const g = gameRef.current
    switch (e.type) {
      case 'sfx':
        sfx.play(e.name, { volume: e.volume, pitch: e.pitch })
        break
      case 'local':
        playLocal(e.name, e.arg)
        break
      case 'shake':
        shake({ strength: e.strength, duration: e.duration, rotate: e.rotate })
        break
      case 'fx':
        addFx({ kind: e.kind, x: e.x, y: e.y, text: e.text }, e.kind === 'dust' ? 800 : 1150)
        // he just bonked himself with his own boomerang. he is aware.
        if (e.kind === 'selfbonk')
          later(450, () => {
            if (flowRef.current === 'fight') quip(Math.random() < 0.5 ? '…tung?' : 'ow. tung.', 1)
          })
        break
      case 'beat':
        // phase 3: the red edges thump along with the kentongan
        if (!reducedMotion()) vignetteRef.current?.animate([{ opacity: e.n < 2 ? 1 : 0.8 }, { opacity: 0.35 }], { duration: 300, easing: 'ease-out' })
        break
      case 'hazards':
        if (g) setHazards(g.hazardViews())
        break
      case 'hint': {
        const id = nextId()
        setHint({ id, key: e.key })
        later(2800, () => setHint((h) => (h?.id === id ? null : h)))
        break
      }
      case 'bonk': {
        setBonkN(e.count)
        const texts = ['BONK!', 'BONK BONK!', 'CRIT BONK!!']
        const crit = e.count >= 3
        // alternate sides so his hurt face stays visible; the crit lands dead centre
        // beside his head, alternating sides (the prompt above him and his hurt face stay visible);
        // the crit lands dead centre
        const p = toStage(e.x + (crit ? 0 : (e.count === 1 ? 1 : -1) * (TUNG_W * 0.5 + 40)), TUNG_H - (crit ? 60 : 80))
        const L = layoutRef.current
        const k = clamp(L?.s ?? 1, 0.62, 1.1)
        const size = Math.round((crit ? 180 : 140) * k)
        const bx = L ? clamp(p.left, size * 0.45, L.sw - size * 0.45) : p.left
        setBurst({ id: nextId(), text: texts[Math.min(2, e.count - 1)], x: bx, y: Math.max(size * 0.4 + (L?.top ?? 0), p.top), color: crit ? 'var(--hot)' : 'var(--sun)', size })
        sfx.play('bonk', { pitch: 0.9 + e.count * 0.12 })
        sfx.play('squeak', { volume: 0.7, pitch: 0.9 + e.count * 0.15 })
        if (crit) sfx.play('punch')
        shake({ strength: crit ? 'medium' : 'small', duration: 0.25 })
        bossFxRef.current?.animate(
          [
            { transform: 'scale(1, 1)' },
            { transform: 'scale(1.14, 0.82)' },
            { transform: 'scale(0.94, 1.08)' },
            { transform: 'scale(1, 1)' },
          ],
          { duration: 340, easing: 'ease-out' },
        )
        break
      }
      case 'hit':
        // he gloats (sometimes) — short, quick, gone
        if (e.hearts > 0 && !speech && Math.random() < 0.6) quip(GLOAT[Math.floor(Math.random() * GLOAT.length)], 2)
        break
      case 'phase': {
        // let the bonk that did it land first, then slam the title card in
        later(380, () => {
          setBurst(null)
          setBanner({ id: nextId(), kind: 'phase', phase: e.phase, round: 1 })
          sfx.play('airhorn')
          sfx.play('vineBoom', { delay: 0.2 })
          if (e.phase === 3) sfx.play('glitch', { delay: 0.5 })
          shake({ strength: 'big', duration: 0.6, rotate: true })
          setFlash({ id: nextId(), color: e.phase === 3 ? 'hot' : 'white' })
          later(2400, () => setBanner((b) => (b?.kind === 'phase' && b.phase === e.phase ? null : b)))
        })
        break
      }
      case 'downed':
        quip('SAHUR’D.', 3)
        setDowned(true)
        sfx.play('sadTrombone', { delay: 0.3 })
        later(1600, () => sfx.play('powerUp'))
        break
      case 'revived':
        setDowned(false)
        sfx.play('sparkle')
        break
      case 'ko':
        victory()
        break
      case 'flash':
        setFlash({ id: nextId(), color: e.color })
        break
      case 'introArrived':
        later(250, introTalk)
        break
      case 'dodge':
        if (e.streak === 3) toast('DODGE STREAK', { body: '3 in a row. Tung is wheezing.', icon: '💨', duration: 2200 })
        break
    }
  }
  const handleRef = useRef(handleEvent)
  useLayoutEffect(() => {
    handleRef.current = handleEvent
  })

  /* ---------------- game loop ---------------- */

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const L0 = computeLayout(stage.clientWidth, stage.clientHeight, readInsets(stage))
    layoutRef.current = L0
    setLayout(L0)
    const game = new Game(L0.W, (e) => handleRef.current(e))
    gameRef.current = game
    // re-mounted mid-fight (hot reload): pick up where the flow is
    if (flowRef.current !== 'intro') {
      game.skipIntro()
      if (flowRef.current === 'fight') game.startFight()
    }

    const settleId = window.setTimeout(() => setSettled(true), 900)
    const relayout = () => {
      const width = stage.clientWidth
      const height = stage.clientHeight
      if (width < 10 || height < 10) return
      const ins = readInsets(stage)
      const prev = layoutRef.current
      let L = computeLayout(width, height, ins)
      // same stage, new insets (flow change): keep the arena width if that costs no size, so the
      // street and everyone on it don't jump sideways (e.g. the pad columns going away at the KO)
      if (prev && prev.sw === width && prev.sh === height && Math.abs(prev.W - L.W) > 0.5) {
        const keep = computeLayout(width, height, ins, prev.W)
        if (keep.s >= L.s * 0.97) L = keep
      }
      if (prev && Math.abs(prev.W - L.W) < 0.5 && Math.abs(prev.s - L.s) < 0.001 && Math.abs(prev.ox - L.ox) < 0.5 && Math.abs(prev.oy - L.oy) < 0.5 && prev.top === L.top && prev.avoidL === L.avoidL && prev.sw === L.sw && prev.sh === L.sh) return
      layoutRef.current = L
      setLayout(L)
      game.setWidth(L.W)
    }
    relayoutRef.current = relayout
    const ro = new ResizeObserver(relayout)
    ro.observe(stage)

    // last values pushed to React, so we only set state on change
    const ui = { anim: '', left: false, blink: false, look: game.boss.look, flip: false, intensity: -1, hp: game.hp, hearts: game.hearts, phase: game.phase as PhaseNo, dizzy: false, cue: '' as Cue, cueShift: 0, alertAt: 0, paused: null as PauseReason }
    let blurred = false

    const render = () => {
      const a = game.albert
      const b = game.boss
      if (albertRef.current) albertRef.current.style.transform = `translate3d(${a.x - ALBERT_W / 2}px, ${FLOOR - ALBERT_H - a.y}px, 0)`
      if (rigRef.current) {
        let sx = 1
        let sy = 1
        if (!a.grounded) {
          sy = 1 + Math.min(0.2, Math.abs(a.vy) / 3200)
          sx = 1 - (sy - 1) * 0.7
        } else if (a.land > 0) {
          sy = 1 - 0.24 * a.land
          sx = 1 + 0.28 * a.land
        }
        const lean = a.anim === 'ko' ? 0 : clamp(a.vx / PHYS.speed, -1, 1) * (a.grounded ? 10 : 5)
        rigRef.current.style.transform = `rotate(${lean}deg) scale(${sx}, ${sy})`
      }
      if (shadowRef.current) {
        const k = 1 - Math.min(0.55, a.y / 320)
        shadowRef.current.style.transform = `translate3d(${a.x - 32}px, ${FLOOR - 8}px, 0) scale(${k})`
        shadowRef.current.style.opacity = String(0.35 + 0.4 * k)
      }
      if (bossRef.current) bossRef.current.style.transform = `translate3d(${b.x - TUNG_W / 2}px, ${FLOOR - TUNG_H - b.y}px, 0)`
      // keep the cue over his head on screen when he's backed against a wall
      const cueEl = cueRef.current
      const Lc = layoutRef.current
      if (cueEl && Lc) {
        const half = (ui.cue === 'jump' ? 50 : 14) * Math.max(1, 0.8 / Lc.s)
        const lo = (8 - Lc.ox) / Lc.s + half
        const hi = (Lc.sw - 8 - Lc.ox) / Lc.s - half
        const shift = Math.round(lo < hi ? clamp(a.x, lo, hi) - a.x : 0)
        if (shift !== ui.cueShift) {
          ui.cueShift = shift
          cueEl.style.translate = `${shift}px 0`
        }
      } else ui.cueShift = 0
      for (const h of game.hazards) {
        const el = hazardEls.current.get(h.id)
        if (!el) continue
        if (h.kind === 'wave') {
          // rising out of the road for WAVE_DELAY, then launched
          const rise = h.t < 0 ? 1 + h.t / WAVE_DELAY : 1
          el.style.transform = `translate3d(${h.x - 40}px, ${FLOOR - 60}px, 0) scale(${h.dir * (0.55 + 0.45 * rise)}, ${0.15 + 0.85 * rise})`
        }
        else if (h.kind === 'bat') el.style.transform = `translate3d(${h.x - BAT_W / 2}px, ${FLOOR - h.y - BAT_LEN / 2}px, 0) rotate(${h.rot}deg)`
        else if (h.kind === 'drop') el.style.transform = `translate3d(${h.x - 23}px, ${FLOOR - h.y - 48}px, 0) rotate(${h.rot}deg)`
      }
    }

    const sync = () => {
      const a = game.albert
      const b = game.boss
      const left = a.facing < 0
      const blink = a.invuln > 0 && game.mode === 'fight'
      if (a.anim !== ui.anim || left !== ui.left || blink !== ui.blink) {
        ui.anim = a.anim
        ui.left = left
        ui.blink = blink
        setAlb({ anim: a.anim, left, blink })
      }
      const flip = b.facing !== TUNG_ART_FACING
      const si = scriptIntensityRef.current
      const intensity = si ?? (b.mode === 'dizzy' ? 0.35 : TUNING[game.phase].intensity)
      if (b.look !== ui.look || flip !== ui.flip || intensity !== ui.intensity) {
        ui.look = b.look
        ui.flip = flip
        ui.intensity = intensity
        setLook({ ...b.look, flip, intensity })
      }
      if (game.hp !== ui.hp) setHp((ui.hp = game.hp))
      if (game.hearts !== ui.hearts) setHearts((ui.hearts = game.hearts))
      if (game.phase !== ui.phase) setPhase((ui.phase = game.phase))
      const c = game.cue
      if (c !== ui.cue) {
        // stealth-game "!" when he's standing where the bat is about to land
        if (c === 'danger' && performance.now() - ui.alertAt > 700) {
          ui.alertAt = performance.now()
          playLocal('alert')
        }
        setCue((ui.cue = c))
      }
      const dz = game.canBonk
      if (dz !== ui.dizzy) {
        if (dz) {
          setDizzySide(b.x > game.W / 2 ? 'left' : 'right')
          const Lc = layoutRef.current
          if (Lc) {
            const sx = Lc.ox + b.x * Lc.s
            const half = 84
            setDizzyShift(Math.max(0, half + 8 - sx) - Math.max(0, sx + half + 8 - Lc.sw))
          }
          setBonkN(0)
        }
        setDizzy((ui.dizzy = dz))
      }
    }

    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = (now - last) / 1000
      last = now
      if (document.hidden) return
      if (coveredRef.current && flowRef.current === 'intro') return
      // the fight freezes while the soundtrack panel is open over it, or the window isn't focused
      const reason: PauseReason = flowRef.current === 'fight' ? (document.querySelector('.mp.is-open') ? 'player' : blurred ? 'blur' : null) : null
      if (reason !== ui.paused) {
        if (reason === 'player') setPauseAt(null)
        // closing the soundtrack panel hands focus back to its button: give the keys back to the
        // fight instead (otherwise Space re-opens the player rather than jumping)
        if (ui.paused === 'player' && !reason) {
          const a = document.activeElement
          if (a instanceof HTMLElement && a.closest('.mp')) a.blur()
        }
        ui.paused = reason
        if (reason) game.clearInput()
        setPaused(reason)
      }
      if (reason) return
      game.step(dt)
      render()
      sync()
    }
    raf = requestAnimationFrame(frame)

    const onVis = () => {
      last = performance.now()
      game.clearInput()
    }
    const onBlur = () => {
      blurred = true
      onVis()
    }
    const onFocus = () => {
      blurred = false
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)

    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__tungDebug = {
        game,
        setHp: (n: number) => game.debugSetHp(n),
        hurt: () => {
          game.albert.invuln = 0
          ;(game as unknown as { hitAlbert: (x: number, id: number) => void }).hitAlbert(game.albert.x + 1, -1)
        },
        god: () => {
          game.albert.invuln = 9999
        },
      }
    }

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(settleId)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      relayoutRef.current = () => {}
      gameRef.current = null
      if (import.meta.env.DEV) delete (window as unknown as Record<string, unknown>).__tungDebug
    }
  }, [])

  // measure the open soundtrack panel once it has sprung open, and put the stamp beside it
  useEffect(() => {
    if (paused !== 'player') return
    const id = window.setTimeout(() => {
      const panel = document.querySelector('.mp-panel')
      const stage = stageRef.current
      if (!panel || !stage) return setPauseAt({ x: -1 })
      const p = panel.getBoundingClientRect()
      const st = stage.getBoundingClientRect()
      const right = p.right - st.left
      const free = st.width - right
      setPauseAt({ x: p.left - st.left < st.width * 0.3 && free > 320 ? right + free / 2 : -1 })
    }, 380)
    return () => window.clearTimeout(id)
  }, [paused])

  /* ---------------- input ---------------- */

  useEffect(() => {
    const isLeft = (e: KeyboardEvent) => e.key === 'ArrowLeft' || e.code === 'KeyA'
    const isRight = (e: KeyboardEvent) => e.key === 'ArrowRight' || e.code === 'KeyD'
    const isJump = (e: KeyboardEvent) => e.key === ' ' || e.key === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space'
    const isBonk = (e: KeyboardEvent) => e.code === 'KeyE' || e.key === 'Enter'
    const down = (e: KeyboardEvent) => {
      const g = gameRef.current
      if (!g || e.metaKey || e.ctrlKey || e.altKey) return
      // keys aimed at the soundtrack player (its sliders, buttons) aren't fight input
      if ((e.target as HTMLElement | null)?.closest?.('.mp')) return
      if (flowRef.current === 'intro') {
        if (e.key !== 'Tab' && e.key !== 'Shift') toHowTo()
        return
      }
      if (flowRef.current === 'victory') {
        // Space / Enter hurry the ending lines along (unless they're pressing a focused button)
        if ((isJump(e) || isBonk(e)) && !e.repeat && !(e.target as HTMLElement | null)?.closest?.('button, a')) {
          e.preventDefault()
          skipAhead()
        }
        return
      }
      if (flowRef.current !== 'fight') return
      if (isLeft(e)) g.input.left = true
      else if (isRight(e)) g.input.right = true
      else if (isJump(e)) g.pressJump(true)
      else if (isBonk(e)) {
        if (!e.repeat) g.tryBonk('key')
      } else return
      e.preventDefault()
    }
    const up = (e: KeyboardEvent) => {
      const g = gameRef.current
      if (!g) return
      if (isLeft(e)) g.input.left = false
      else if (isRight(e)) g.input.right = false
      else if (isJump(e)) g.pressJump(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [skipAhead, toHowTo])

  const onStagePointer = (e: RPointerEvent<HTMLDivElement>) => {
    const g = gameRef.current
    const stage = stageRef.current
    const L = layoutRef.current
    if (!g || !stage || !L) return
    if ((e.target as HTMLElement).closest('button, a, .tg-card')) return
    if (flowRef.current === 'intro') return toHowTo()
    if (flowRef.current === 'victory') return skipAhead()
    if (flowRef.current !== 'fight' || g.mode !== 'fight') return
    const r = stage.getBoundingClientRect()
    const ux = (e.clientX - r.left - L.ox) / L.s
    const uy = (e.clientY - r.top - L.oy) / L.s
    const b = g.boss
    if (g.canBonk && Math.abs(ux - b.x) < TUNG_W * 0.8 && uy > FLOOR - TUNG_H - 60 && uy < FLOOR + 40) {
      g.tryBonk('pointer')
      return
    }
    const tx = clamp(ux, PHYS.margin, g.W - PHYS.margin)
    g.input.target = tx
    addFx({ kind: 'tap', x: tx, y: 0 }, 500)
  }

  // measure the bubble in each placement it tries ('above' his head, narrow → 'wide' → 'top' across
  // the whole stage → 'beside' his head) and use the first that fits
  const speechId = speech?.id
  useLayoutEffect(() => {
    setSayH({ above: 0, wide: 0, top: 0 })
    const el = sayRef.current
    if (!el || speechId === undefined) return
    const measure = () => {
      const mode = el.dataset.mode
      if (mode === 'above' || mode === 'wide' || mode === 'top') {
        const h = el.offsetHeight
        setSayH((m) => (m[mode] === h ? m : { ...m, [mode]: h }))
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [speechId])

  /* ---------------- render ---------------- */

  const L = layout
  const arenaStyle = (L ? { width: L.W, height: H, transform: `translate(${L.ox}px, ${L.oy}px) scale(${L.s})`, '--inv': 1 / L.s } : { visibility: 'hidden' }) as CSSProperties
  const fighting = flow === 'fight'
  const bubblePos = speech ? toStage(speech.x, TUNG_H + 10) : null
  // dizzy "BONK HIM!" label: above his head when there's headroom, else on his belly
  const promptLow = !!L && L.oy + (FLOOR - TUNG_H) * L.s - 48 * L.s - 44 < L.top + 4
  // tutorial hints sit in the road just below everyone's feet (never over heads / the prompt)
  let hintStyle: CSSProperties | undefined
  let hintRoad = true
  if (L) {
    const below = L.oy + (FLOOR + 30) * L.s
    const x0 = Math.max(L.ox, L.avoidL) + 8
    const x1 = Math.min(L.ox + L.W * L.s, L.sw) - 8
    const pos = { left: (x0 + x1) / 2, maxWidth: x1 - x0 }
    // no room in the road (phones on their side): just under the floating HUD instead
    hintRoad = L.sh - below >= 58
    hintStyle = hintRoad ? { ...pos, top: below } : L.top > 0 ? { ...pos, top: L.top + 4 } : { ...pos, bottom: 6 }
  }
  // the 'bonk' hint only adds a second pink label saying the same as the prompt over his head
  // when it can't sit down in the road (short landscape phones): the prompt carries it alone there
  const showHint = !!hint && fighting && !banner && !paused && ((hint.key !== 'bonk' && hint.key !== 'mercy') || dizzy) && !(hint.key === 'bonk' && !hintRoad)
  // speech bubble: above Tung's head growing toward the side with more room; if that's too tall,
  // full-width across the top of the stage; if even that doesn't fit (short phones), beside his head
  let bubbleStyle: CSSProperties | undefined
  let bubbleTail: 'bottom-right' | 'bottom-left' | 'right' | 'left' = 'bottom-right'
  let bubbleMode: 'above' | 'wide' | 'top' | 'beside' = 'above'
  if (bubblePos && L) {
    const stageW = L.sw
    const minTop = L.top + 6
    const roomL = bubblePos.left + 46 - 8
    const roomR = stageW - (bubblePos.left - 46) - 8
    const room = Math.max(roomL, roomR)
    const fitsAbove = sayH.above === 0 || bubblePos.top - sayH.above - 24 >= minTop
    // 'wide' only differs from 'above' when there's more than 400px of room
    const fitsWide = room > 420 && (sayH.wide === 0 || bubblePos.top - sayH.wide - 24 >= minTop)
    const fitsTop = sayH.top === 0 || bubblePos.top - sayH.top - 14 >= minTop
    if (fitsAbove || fitsWide) {
      bubbleMode = fitsAbove ? 'above' : 'wide'
      const cap = fitsAbove ? 400 : 640
      if (roomL >= roomR) {
        bubbleStyle = { right: Math.max(8, stageW - bubblePos.left - 46), top: bubblePos.top, maxWidth: Math.min(cap, roomL) }
        bubbleTail = 'bottom-right'
      } else {
        bubbleStyle = { left: Math.max(8, bubblePos.left - 46), top: bubblePos.top, maxWidth: Math.min(cap, roomR) }
        bubbleTail = 'bottom-left'
      }
    } else if (fitsTop) {
      bubbleMode = 'top'
      const right = bubblePos.left > stageW / 2
      bubbleStyle = { left: 8, right: 8, top: bubblePos.top - 4, justifyContent: right ? 'flex-end' : 'flex-start' }
      bubbleTail = right ? 'bottom-right' : 'bottom-left'
    } else {
      bubbleMode = 'beside'
      const half = TUNG_W * L.s * 0.42
      const roomL = bubblePos.left - half - 20
      const roomR = stageW - (bubblePos.left + half) - 20
      const top = Math.max(minTop, bubblePos.top + 24 * L.s)
      if (roomL >= roomR) {
        bubbleStyle = { right: stageW - (bubblePos.left - half) + 12, top, maxWidth: Math.min(400, roomL) }
        bubbleTail = 'right'
      } else {
        bubbleStyle = { left: bubblePos.left + half + 12, top, maxWidth: Math.min(400, roomR) }
        bubbleTail = 'left'
      }
    }
  }

  let dock = null
  if (flow === 'fight') dock = touchUi ? <TouchPad game={gameRef} dizzy={dizzy} /> : <KeyLegend dizzy={dizzy} />
  else if (flow === 'victory' && done)
    dock = (
      <div className="tg-endrow">
        <span className="tg-endrow__pad" aria-hidden="true" />
        <NextCta show label="NEXT: PETER’S PRESENT" onClick={onNext} />
        <div className="tg-endrow__sub">
          <BigButton variant="ghost" size="sm" sound="tungTriple" onClick={() => startFight(true)} icon={<span aria-hidden="true">↺</span>}>
            Rematch
          </BigButton>
        </div>
      </div>
    )

  return (
    <SceneShell
      chapter={2}
      title="Tung Tung Tung Sahur Boss Fight"
      kicker={flow === 'intro' ? 'it’s 3 AM. something is knocking.' : undefined}
      className={`tg tg--${flow} tg--p${phase} ${touchUi ? 'tg--touch' : ''}`}
      backdrop={<SkyBackdrop />}
      hud={
        flow === 'fight' || flow === 'victory' ? (
          <AnimatePresence mode="wait">
            {flow === 'victory' && stats ? <VictoryStats key="stats" stats={stats} /> : <Hud key="hud" hp={hp} hearts={hearts} phase={phase} />}
          </AnimatePresence>
        ) : undefined
      }
      dock={<div className="tg-dock">{dock}</div>}
    >
      <div className={`tg-stage ${paused && fighting ? 'is-paused' : ''}`} ref={stageRef} onPointerDown={onStagePointer}>
        <div className="tg-wobble">
          <div className={`tg-arena ${settled ? 'is-settled' : ''}`} style={arenaStyle}>
            {L && <StreetSet w={L.W} />}
            {hazards
              .filter((h) => h.kind === 'marker' || h.kind === 'band' || h.kind === 'trail')
              .map((h) => (
                <HazardEl key={h.id} h={h} onEl={onHazardEl} />
              ))}
            <div className="tg-boss" ref={bossRef} style={{ width: TUNG_W, height: TUNG_H }}>
              <div className="tg-boss__fx" ref={bossFxRef}>
                <Tung pose={look.pose} expression={look.expression} hasBat={look.hasBat} flip={look.flip} intensity={look.intensity} talking={talking} paused={!!paused && fighting} label="Tung Tung Tung Sahur" />
              </div>
              <AnimatePresence>
                {dizzy && (
                  <motion.div className={`tg-dizzy ${promptLow ? `is-low is-${dizzySide}` : ''}`} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                    <div className="tg-dizzy__ring">
                      <span>★</span>
                      <span>✦</span>
                      <span>★</span>
                    </div>
                    <div
                      className="tg-dizzy__prompt"
                      style={promptLow || !L ? undefined : ({ '--shift': `${dizzyShift / L.s}px` } as CSSProperties)}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        gameRef.current?.tryBonk('pointer')
                      }}
                    >
                      {bonkN === 0 ? (touchUi ? 'TAP TO BONK!' : 'BONK HIM!') : bonkN === 1 ? 'AGAIN!' : 'ONE MORE!!'}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="tg-albert-shadow" ref={shadowRef} />
            <div className="tg-albert" ref={albertRef} style={{ width: ALBERT_W, height: ALBERT_H }}>
              <div className={`tg-albert__tag ${cue || alb.anim === 'ko' ? 'is-off' : ''}`}>ALBERT</div>
              <AnimatePresence>
                {cue && (
                  <div className="tg-cue" key={cue} ref={cueRef}>
                    <motion.span
                      className={`tg-cue__chip tg-cue__chip--${cue}`}
                      initial={{ scale: 0.2, y: 14, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.1 } }}
                      transition={{ type: 'spring', stiffness: 700, damping: 17 }}
                    >
                      {cue === 'jump' ? 'JUMP!' : '!'}
                    </motion.span>
                  </div>
                )}
              </AnimatePresence>
              <div className="tg-albert__rig" ref={rigRef}>
                <div className={`tg-albert__flip ${alb.left ? 'is-left' : ''} ${alb.blink ? 'is-blink' : ''}`}>
                  <AlbertSvg anim={alb.anim} />
                </div>
              </div>
              {alb.anim === 'sleepy' && (
                <div className="tg-zzz" aria-hidden="true">
                  <span>z</span>
                  <span>z</span>
                  <span>Z</span>
                </div>
              )}
              {alb.anim === 'ko' && (
                <div className={`tg-ko-stars ${alb.left ? 'is-right' : ''}`} aria-hidden="true">
                  ✦ ★ ✦
                </div>
              )}
            </div>
            {hazards
              .filter((h) => h.kind === 'wave' || h.kind === 'bat' || h.kind === 'drop')
              .map((h) => (
                <HazardEl key={h.id} h={h} onEl={onHazardEl} />
              ))}
            {fx.map((f) => (
              <FxEl key={f.id} f={f} />
            ))}
          </div>
        </div>
        <div className="tg-chaos" aria-hidden="true" />
        <div className="tg-vignette" ref={vignetteRef} aria-hidden="true" />

        {/* screen-space UI */}
        <div className="tg-ui">
          {flash && <div key={flash.id} className={`tg-flash tg-flash--${flash.color}`} />}
          {speech && bubblePos && (
            <div ref={sayRef} data-mode={bubbleMode} className={`tg-say tg-say--${bubbleMode === 'wide' ? 'above' : bubbleMode}`} style={bubbleStyle}
            >
              <SpeechBubble
                key={speech.id}
                text={speech.text}
                voice="tung"
                speaker="TUNG"
                intensity={speech.intensity}
                cps={speech.cps}
                tail={bubbleTail}
                skip={skipLine}
                onDone={() => {
                  setTalking(false)
                  const next = speech.next
                  if (!next) return
                  const id = later(speech.hold, () => {
                    if (holdRef.current?.id === id) holdRef.current = null
                    next()
                  })
                  holdRef.current = { id, next }
                }}
              />
            </div>
          )}
          {burst && <ComicBurst key={burst.id} id={burst.id} text={burst.text} color={burst.color} size={burst.size} duration={700} rotate={-10 + (burst.id % 3) * 8} style={{ left: burst.x - burst.size / 2, top: burst.y - burst.size / 2 }} />}
          <AnimatePresence>{banner && <PhaseBanner key={banner.id} banner={banner} />}</AnimatePresence>
          <AnimatePresence>{showHint && hint && <HintBanner key={hint.id} hint={hint.key} touch={touchUi} style={hintStyle} />}</AnimatePresence>
          <AnimatePresence>
            {paused && fighting && (paused !== 'player' || pauseAt) && (
              <motion.div
                key="paused"
                className="tg-paused"
                style={paused === 'player' && pauseAt && pauseAt.x >= 0 ? { left: pauseAt.x } : undefined}
                role="status"
                initial={{ scale: 1.6, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: -4 }}
                exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 520, damping: 20 }}
              >
                <b>PAUSED</b>
                <small>{paused === 'player' ? 'pick a banger, then close the player' : touchUi ? 'tap to keep bonking' : 'click to keep bonking'}</small>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>{downed && <RespawnCard key="respawn" />}</AnimatePresence>
          <AnimatePresence>{flow === 'howto' && <HowToCard key="howto" touch={touchUi} onStart={() => startFight(false)} />}</AnimatePresence>
          <AnimatePresence>
            {flow === 'intro' && (
              <motion.button
                type="button"
                className="tg-skip"
                onClick={toHowTo}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 1.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                skip intro ⏭
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SceneShell>
  )
}
