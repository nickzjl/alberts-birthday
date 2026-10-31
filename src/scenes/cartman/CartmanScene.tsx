import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { sfx } from '../../audio/sfx'
import { voice } from '../../audio/voice'
import { Cartman } from '../../characters/cartman/Cartman'
import type { CartmanExpression, CartmanPose } from '../../characters/types'
import { BigButton } from '../../components/ui/BigButton'
import { ComicBurst } from '../../components/ui/ComicBurst'
import { fireConfetti, PURPLE_CONFETTI } from '../../components/ui/confetti'
import { NextCta } from '../../components/ui/NextCta'
import { SceneShell } from '../../components/ui/SceneShell'
import { useShake, type ShakeOptions } from '../../components/ui/shake'
import { SpeechBubble } from '../../components/ui/SpeechBubble'
import { toast } from '../../components/ui/toast'
import { useApp, type SceneProps } from '../../state/app'
import { CakePlate, Contract } from './Props'
import { RoastHud, type AngerState } from './RoastHud'
import { BEATS, FINALE_ASK, FINALE_BUSY, FINALE_QUIET, FINALE_WAIT, OUTRO, TANTRUM_BURSTS, TANTRUM_LINE, type Beat, type Reaction, type Readout } from './script'
import { TownBackdrop } from './TownBackdrop'
import './cartman.css'

/* ------------------------------------------------------------------ */

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const plain = (s: string) => s.replace(/\*/g, '')

interface Face {
  expression: CartmanExpression
  pose: CartmanPose
  intensity: number
  redness: number
  steam: boolean
}

interface Line {
  key: number
  text: string
  intensity: 0 | 1 | 2 | 3
  cps?: number
}

interface BurstItem {
  id: number
  text: string
  x: number
  y: number
  size: number
  color?: string
  textColor?: string
  rotate?: number
}

type BurstSpec = NonNullable<Reaction['burst']>

const POKES: BurstSpec[] = [
  { text: 'HEY!', x: 0.85, y: 0, color: 'var(--acid)', rotate: 10 },
  { text: 'RUDE!', x: 0.15, y: 0, color: 'var(--cyan)', rotate: -10 },
  { text: 'OW!', x: 0.8, y: 0, color: 'var(--sun)', rotate: 6 },
  { text: 'MOM!', x: 0.2, y: 0, color: 'var(--hot)', textColor: 'var(--white)', rotate: -6 },
]
/** each poke gets a quicker fuse: startled → offended → livid */
const POKE_FACES: CartmanExpression[] = ['shocked', 'shocked', 'annoyed', 'annoyed', 'angry', 'furious']
/** once he's said happy birthday, poking him only gets cake demands */
const DONE_POKES: BurstSpec[] = [
  { text: 'HEY!', x: 0.85, y: 0, color: 'var(--acid)', rotate: 10 },
  { text: 'CAKE?', x: 0.15, y: 0, color: 'var(--sun)', rotate: -8 },
  { text: 'MINE!', x: 0.82, y: 0, color: 'var(--cyan)', rotate: 6 },
  { text: 'MOM!', x: 0.2, y: 0, color: 'var(--hot)', textColor: 'var(--white)', rotate: -6 },
]

const INTRO_FACE: Face = { expression: 'smug', pose: 'handsOnHips', intensity: 0.1, redness: 0, steam: false }
const LAST = BEATS.length - 1

/**
 * Bubble beside his head (laptops, desktops, landscape phones) vs. stacked above him.
 * Keep in sync with the matching @media block in cartman.css.
 */
const SIDE_MQ = '(min-width: 860px), (orientation: landscape) and (max-height: 500px) and (min-width: 560px)'
/** 1200–1439px: the desktop music pill sits bottom-left, so the end dock has to slim down to clear it */
const SQUEEZE_MQ = '(min-width: 1200px) and (max-width: 1439px)'

/** same scale as the shared shake; re-declared so we can soften it on small screens */
const SHAKE_AMP = { tiny: 3, small: 6, medium: 12, big: 22, huge: 36 } as const

type Finale = false | 'tantrum' | 'quiet' | 'outro'

/* ------------------------------------------------------------------ */

export default function CartmanScene({ onComplete, onNext }: SceneProps) {
  const { transitioning } = useApp()
  const shakeScreen = useShake()
  const reduced = useReducedMotion()
  const side = useMedia(SIDE_MQ)
  const narrow = !side
  const compact = useMedia('(max-width: 599px)')
  const squeeze = useMedia(SQUEEZE_MQ)

  // --- render state -------------------------------------------------
  const [beat, setBeat] = useState(0)
  const [face, setFace] = useState<Face>(INTRO_FACE)
  const [line, setLine] = useState<Line | null>(null)
  const [typing, setTyping] = useState(false)
  const [skip, setSkip] = useState(false)
  const [apology, setApology] = useState<Readout>(BEATS[0].apology)
  const [anger, setAnger] = useState(0)
  const [angerReadout, setAngerReadout] = useState<string | undefined>()
  const [angerState, setAngerState] = useState<AngerState>('normal')
  const [contract, setContract] = useState(false)
  const [bursts, setBursts] = useState<BurstItem[]>([])
  const [heat, setHeat] = useState(0)
  const [lit, setLit] = useState(2)
  const [finale, setFinale] = useState<Finale>(false)
  const [rattle, setRattle] = useState(false)
  const [done, setDone] = useState(false)
  const [rewinding, setRewinding] = useState(false)
  /** a quick facial reaction to being poked, laid over whatever face the beat wants */
  const [pokeFace, setPokeFace] = useState<CartmanExpression | null>(null)

  // --- refs for the timeline ---------------------------------------
  const stageRef = useRef<HTMLDivElement>(null)
  const rigPosRef = useRef<HTMLDivElement>(null)
  const rigRef = useRef<HTMLDivElement>(null)
  const timers = useRef(new Set<number>())
  const burstTimers = useRef(new Set<number>())
  const busy = useRef(true)
  const typingRef = useRef(false)
  const beatRef = useRef(0)
  const lineSeq = useRef(0)
  const lineState = useRef<{ key: number; chars: number; cues: Array<{ idx: number; r: Reaction; fired: boolean }>; onDone?: () => void }>({ key: -1, chars: 0, cues: [] })
  const burstSeq = useRef(0)
  /** a scheduled second half of a beat (pressing during the pause plays it right away) */
  const pending = useRef<{ id: number; run: () => void } | null>(null)
  const compactRef = useRef(compact)
  const rigAnim = useRef<ReturnType<typeof animate> | null>(null)
  const askRef = useRef<HTMLButtonElement | null>(null)
  /** after "Do it again", hand keyboard focus to the ask button once it's back */
  const refocus = useRef(false)
  const narrowRef = useRef(narrow)
  useEffect(() => {
    narrowRef.current = narrow
    compactRef.current = compact
  }, [narrow, compact])

  // camera push-in + pointer parallax (motion values: no re-renders).
  // The town pushes in fully; Cartman himself only a little when he's stacked under the bubble,
  // otherwise the tantrum grows him into the bubble / off the sides of a phone.
  const cam = useSpring(1, { stiffness: 60, damping: 18 })
  const rigCam = useSpring(1, { stiffness: 60, damping: 18 })
  const pxRaw = useMotionValue(0)
  const pyRaw = useMotionValue(0)
  const px = useSpring(pxRaw, { stiffness: 40, damping: 14 })
  const py = useSpring(pyRaw, { stiffness: 40, damping: 14 })

  const setCam = useCallback(
    (v: number) => {
      const stacked = narrowRef.current
      cam.set(1 + (v - 1) * (stacked ? 0.6 : 1))
      rigCam.set(1 + (v - 1) * (stacked ? 0.3 : 0.85))
    },
    [cam, rigCam],
  )

  /** screen shake, softened on small screens (36px of shake on a 375px phone is a blur) */
  const shake = useCallback(
    (o: ShakeOptions = {}) => {
      const s = o.strength ?? 'medium'
      const amp = typeof s === 'number' ? s : SHAKE_AMP[s]
      const k = clamp(Math.min(window.innerWidth, window.innerHeight * 1.4) / 1100, 0.45, 1)
      shakeScreen({ ...o, strength: amp * k })
    },
    [shakeScreen],
  )

  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, ms)
    timers.current.add(id)
    return id
  }, [])

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current.clear()
    pending.current = null
  }, [])

  useEffect(() => {
    const t = timers.current
    const bt = burstTimers.current
    return () => {
      t.forEach((id) => window.clearTimeout(id))
      bt.forEach((id) => window.clearTimeout(id))
      t.clear()
      bt.clear()
      rigAnim.current?.stop()
    }
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      pxRaw.set((e.clientX / window.innerWidth - 0.5) * 2)
      pyRaw.set((e.clientY / window.innerHeight - 0.5) * 2)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [pxRaw, pyRaw])

  // --- character rig (squash & stretch on top of the character's own animation) ---
  const squash = useCallback(
    (kind: 'small' | 'big' | 'hop') => {
      const el = rigRef.current
      if (!el || reduced) return
      rigAnim.current?.stop()
      // stacked layouts have only a few px between his mittens and the screen edge: widen him less
      const wx = (v: number) => 1 + (v - 1) * (narrowRef.current ? 0.5 : 1)
      if (kind === 'small') {
        rigAnim.current = animate(el, { scaleX: [1, wx(1.07), wx(0.97), 1], scaleY: [1, 0.92, 1.04, 1], y: 0 }, { duration: 0.4, ease: 'easeOut' })
      } else if (kind === 'big') {
        rigAnim.current = animate(el, { scaleX: [1, wx(1.14), wx(0.93), wx(1.02), 1], scaleY: [1, 0.84, 1.1, 0.98, 1], y: [0, 4, -18, 0, 0] }, { duration: 0.6, ease: 'easeOut' })
      } else {
        rigAnim.current = animate(el, { y: [0, -14, 0, 0], scaleY: [1, 1.05, 0.9, 1], scaleX: [1, wx(0.97), wx(1.08), 1] }, { duration: 0.34, ease: 'easeOut' })
      }
    },
    [reduced],
  )

  const startBounce = useCallback(() => {
    const el = rigRef.current
    if (!el || reduced) return
    rigAnim.current?.stop()
    // thrashing on his back: the rig does the kicking; the whole box just jolts against the snow
    rigAnim.current = animate(
      el,
      { y: ['0%', '-2%', '0%', '-1%', '0%'], scaleY: [1, 1.02, 0.95, 1.01, 1], scaleX: [1, 0.995, 1.015, 0.998, 1] },
      { duration: 0.56, repeat: Infinity, ease: 'easeOut' },
    )
  }, [reduced])

  const stopBounce = useCallback(() => {
    const el = rigRef.current
    rigAnim.current?.stop()
    if (el) rigAnim.current = animate(el, { y: 0, scaleX: 1, scaleY: 1 }, { duration: 0.25 })
  }, [])

  // --- bursts --------------------------------------------------------
  const spawnBurst = useCallback((b: BurstSpec, scale = 1) => {
    const stage = stageRef.current
    const rig = rigPosRef.current
    if (!stage || !rig) return
    const sr = stage.getBoundingClientRect()
    const rr = rig.getBoundingClientRect()
    const size = Math.round(clamp(rr.width * 0.25 * scale, 54, 130))
    // (the pop-in overshoots to 1.25x and the pop-out to 1.5x: keep most of that inside the stage too)
    const m = size * 0.7 + 4
    const wantX = rr.left - sr.left + b.x * rr.width
    const x = clamp(wantX, m, sr.width - m)
    // no room out past his side (phones): the burst would land on his arm/cheek, so lift it into the free upper corner
    const fy = Math.abs(x - wantX) > rr.width * 0.08 ? Math.min(b.y, 0.26) : b.y
    const y = clamp(rr.top - sr.top + fy * rr.height, m, sr.height - size / 2)
    const id = ++burstSeq.current
    setBursts((list) => [...list.slice(-5), { id, text: b.text, x, y, size, color: b.color, textColor: b.textColor, rotate: b.rotate ?? -8 }])
    const t = window.setTimeout(() => {
      burstTimers.current.delete(t)
      setBursts((list) => list.filter((it) => it.id !== id))
    }, 1300)
    burstTimers.current.add(t)
  }, [])

  // --- reactions -----------------------------------------------------
  const runReaction = useCallback(
    (r: Reaction) => {
      const go = () => {
        if (r.sfx) sfx.play(r.sfx, { volume: r.volume, pitch: r.pitch })
        if (r.shake) shake(r.shake)
        if (r.burst) spawnBurst(r.burst)
        if (r.squash) squash(r.squash)
        if (r.whine) voice.whineCartman(0.9, r.whine)
        if (r.apology) setApology(r.apology)
        if (r.contract !== undefined) setContract(r.contract)
        if (r.face) setFace((f) => ({ ...f, ...r.face }))
      }
      if (r.at) after(r.at, go)
      else go()
    },
    [after, shake, spawnBurst, squash],
  )

  // --- lines ---------------------------------------------------------
  const say = useCallback((text: string, intensity: Line['intensity'], opts: { cps?: number; cues?: Beat['cues']; onDone?: () => void } = {}) => {
    const key = ++lineSeq.current
    const flat = plain(text)
    lineState.current = {
      key,
      chars: 0,
      cues: (opts.cues ?? []).map((c) => ({ idx: flat.indexOf(c.after) + c.after.length, r: c, fired: false })),
      onDone: opts.onDone,
    }
    typingRef.current = true
    setTyping(true)
    setSkip(false)
    setLine({ key, text, intensity, cps: opts.cps })
  }, [])

  const hush = useCallback(() => {
    lineState.current = { key: -1, chars: 0, cues: [] }
    typingRef.current = false
    setTyping(false)
    setLine(null)
  }, [])

  const fireCue = useCallback(
    (c: { r: Reaction; fired: boolean }) => {
      if (c.fired) return
      c.fired = true
      runReaction(c.r)
    },
    [runReaction],
  )

  const onLineChar = useCallback(
    (key: number) => {
      const ls = lineState.current
      if (ls.key !== key) return
      ls.chars += 1
      for (const c of ls.cues) if (!c.fired && ls.chars >= c.idx) fireCue(c)
    },
    [fireCue],
  )

  const onLineDone = useCallback(
    (key: number) => {
      const ls = lineState.current
      if (ls.key !== key) return
      ls.cues.forEach(fireCue)
      typingRef.current = false
      setTyping(false)
      setSkip(false)
      const cb = ls.onDone
      ls.onDone = undefined
      cb?.()
    },
    [fireCue],
  )

  // --- beats ---------------------------------------------------------
  const playBeat = useCallback(
    (i: number) => {
      const b = BEATS[i]
      beatRef.current = i
      busy.current = false
      setBeat(i)
      setFace({ expression: b.expression, pose: b.pose, intensity: b.intensity, redness: b.redness, steam: !!b.steam })
      setAnger(b.anger)
      setAngerReadout(undefined)
      setApology(b.apology)
      setHeat(b.anger)
      setLit(2 + i)
      setCam(1 + i * 0.014)
      const cps = b.bubble === 3 ? 38 : undefined
      const then = b.then
      say(b.line, b.bubble, {
        cps,
        cues: b.cues,
        onDone: () => {
          b.onDone?.forEach(runReaction)
          if (!then) return
          const run = () => {
            if (pending.current) window.clearTimeout(pending.current.id)
            pending.current = null
            say(then.line, b.bubble, { cps, cues: then.cues, onDone: () => then.onDone?.forEach(runReaction) })
          }
          pending.current = { id: after(then.pause, run), run }
        },
      })
      b.onStart?.forEach(runReaction)
    },
    [after, say, runReaction, setCam],
  )

  // intro once the brain-wipe has cleared
  useEffect(() => {
    if (transitioning) return
    const id = window.setTimeout(() => {
      if (beatRef.current === 0 && lineSeq.current === 0) playBeat(0)
    }, 650)
    return () => window.clearTimeout(id)
  }, [transitioning, playBeat])

  const toasted = useRef(false)
  const finish = useCallback(() => {
    setDone(true)
    setApology({ value: 0.02, readout: compactRef.current ? '2%!!' : '2% · NEW RECORD' })
    sfx.play('sparkle')
    onComplete()
  }, [onComplete])

  /** the achievement pops once the cake punchline has landed (not on top of it), and only the first time */
  const achievement = useCallback(() => {
    if (toasted.current) return
    after(650, () => {
      toasted.current = true
      toast('Impossible achievement', { body: 'Cartman said something nice. Screenshot it.', icon: '🎂' })
    })
  }, [after])

  /**
   * The grudging resolution. Quick-ish: the comedy is in the pauses, not in waiting.
   * The NEXT button arrives together with the happy wave so nobody is left staring at a grey button.
   */
  const outro = useCallback(() => {
    setFace((f) => ({ ...f, expression: 'sheepish', pose: 'sitting' }))
    say(OUTRO[0].line, 0, {
      cps: OUTRO[0].cps,
      onDone: () =>
        after(520, () => {
          setFace((f) => ({ ...f, expression: 'annoyed' }))
          say(OUTRO[1].line, 0, {
            cps: OUTRO[1].cps,
            onDone: () =>
              after(380, () => {
                setFace({ expression: 'happy', pose: 'wave', intensity: 0.25, redness: 0.1, steam: false })
                squash('hop')
                sfx.play('partyHorn')
                const rr = rigPosRef.current?.getBoundingClientRect()
                if (rr) {
                  fireConfetti({
                    x: (rr.left + rr.width / 2) / window.innerWidth,
                    y: (rr.top + rr.height * 0.35) / window.innerHeight,
                    count: 70,
                    spread: 80,
                    velocity: 11,
                    colors: PURPLE_CONFETTI,
                    scalar: 0.9,
                  })
                }
                say(OUTRO[2].line, 1, { cps: OUTRO[2].cps, onDone: achievement })
                finish()
              }),
          })
        }),
    })
  }, [after, say, squash, finish, achievement])

  /**
   * Last press: meter overload (1s) → full tantrum on his back (~2.6s) → hard cut to dead silence + crickets (~1.5s)
   * → grudging outro (~5s). NEXT shows up ≈10s after the press.
   */
  const startFinale = useCallback(() => {
    clearTimers()
    busy.current = true
    beatRef.current = LAST + 1
    setFinale('tantrum')
    setContract(false)
    hush()
    setFace({ expression: 'shocked', pose: 'idle', intensity: 0.7, redness: 0.95, steam: true })
    squash('small')
    setCam(1.15)
    setHeat(1)
    setLit(9)
    setAnger(1)
    setAngerReadout('100%')
    setAngerState('overload')
    setApology({ value: 0, readout: 'N/A' })
    sfx.play('heartbeat')

    after(340, () => {
      setAngerReadout('250%')
      sfx.play('glitch', { volume: 0.8 })
    })
    after(680, () => {
      setAngerReadout('999%')
      sfx.play('heartbeat', { pitch: 1.25 })
    })

    const T = 1000
    const STEP = 320
    // the pressure valve shuts a beat before he blows
    after(T - 200, () => setFace((f) => ({ ...f, steam: false })))
    after(T, () => {
      setAngerState('broken')
      sfx.play('shatter')
      sfx.play('wail')
      voice.whineCartman(1, 1)
      shake({ strength: 'huge', duration: 0.9, rotate: true })
      // no steam on the floor (he's bawling now, not fuming); flushed, but not so red that the
      // squeezed eyes + wailing mouth stop reading
      setFace({ expression: 'crying', pose: 'tantrum', intensity: 1, redness: 0.7, steam: false })
      setRattle(true)
      startBounce()
    })
    // the wail lands first; the words follow once he has hit the floor
    after(T + 260, () => say(TANTRUM_LINE, 3, { cps: 30 }))
    TANTRUM_BURSTS.forEach((b, i) => {
      after(T + 200 + i * STEP, () => {
        // reduced motion: half the bursts (they can't pop, so fewer is calmer)
        if (!reduced || i % 2 === 0) spawnBurst(b)
        voice.whineCartman(0.75, 0.85 + (i % 3) * 0.18)
        if (i % 2 === 0) shake({ strength: 'big', duration: 0.4, rotate: true })
        if (i % 3 === 2) sfx.play('stomp', { pitch: 0.9 })
      })
    })
    after(T + 1300, () => sfx.play('wail', { pitch: 1.15, volume: 0.9 }))
    after(T + 2300, () => sfx.play('wail', { pitch: 0.92, volume: 0.8 }))

    // …and stop. Dead silence. Crickets.
    const STOP = T + 200 + TANTRUM_BURSTS.length * STEP + 200
    after(STOP, () => {
      stopBounce()
      setRattle(false)
      // hard cut: every scream bubble and burst gone at once
      setBursts([])
      hush()
      setFinale('quiet')
      setFace({ expression: 'neutral', pose: 'sitting', intensity: 0.05, redness: 0.35, steam: false })
      setCam(1)
      setHeat(0.12)
    })
    after(STOP + 250, () => sfx.play('crickets'))
    // one tiny post-tantrum sniffle
    after(STOP + 850, () => {
      squash('small')
      setFace((f) => ({ ...f, expression: 'sheepish' }))
    })
    after(STOP + 1500, () => {
      setFinale('outro')
      outro()
    })
  }, [after, clearTimers, hush, say, setCam, shake, spawnBurst, squash, startBounce, stopBounce, outro, reduced])

  const takeThenPlay = useCallback(
    (i: number) => {
      clearTimers()
      busy.current = true
      hush()
      const b = BEATS[i]
      setFace((f) => ({ ...f, expression: b.take?.expression ?? 'shocked' }))
      squash('small')
      after(b.take?.ms ?? 350, () => playBeat(i))
    },
    [after, clearTimers, hush, playBeat, squash],
  )

  const onAsk = () => {
    if (busy.current) return
    if (typingRef.current) {
      setSkip(true)
      return
    }
    if (pending.current) {
      pending.current.run()
      return
    }
    const next = beatRef.current + 1
    if (next <= LAST) takeThenPlay(next)
    else startFinale()
  }

  // poking him doesn't advance anything — it just annoys him (more each time, cooling off after a few seconds)
  const pokes = useRef(0)
  const lastPoke = useRef(0)
  const pokeTimer = useRef(0)
  const pokeable = !finale || done
  const poke = () => {
    if (!done && (finale || busy.current)) return
    const now = performance.now()
    if (now - lastPoke.current > 4000) pokes.current = 0
    lastPoke.current = now
    const n = pokes.current++
    squash(n >= 4 && !done ? 'hop' : 'small')
    sfx.play(n % 2 ? 'squeak' : 'boing', { pitch: 1 + (n % 3) * 0.12 })
    spawnBurst(done ? { ...DONE_POKES[n % DONE_POKES.length], y: 0.06 } : { ...POKES[n % POKES.length], y: 0.06 }, 0.9)
    setPokeFace(done ? (n % 2 ? 'annoyed' : 'shocked') : POKE_FACES[Math.min(n, POKE_FACES.length - 1)])
    window.clearTimeout(pokeTimer.current)
    burstTimers.current.delete(pokeTimer.current)
    const t = window.setTimeout(() => {
      burstTimers.current.delete(t)
      setPokeFace(null)
    }, 520)
    pokeTimer.current = t
    burstTimers.current.add(t)
  }

  const replay = () => {
    clearTimers()
    stopBounce()
    setBursts([])
    setDone(false)
    setFinale(false)
    setRattle(false)
    setContract(false)
    hush()
    // rewind the HUD, face and button right away, so the end state (999% / BROKEN / red button) never flashes back
    beatRef.current = 0
    setBeat(0)
    setFace(INTRO_FACE)
    setPokeFace(null)
    setAnger(BEATS[0].anger)
    setAngerReadout(undefined)
    setAngerState('normal')
    setApology(BEATS[0].apology)
    setHeat(0)
    setLit(2)
    setCam(1)
    pokes.current = 0
    busy.current = true
    refocus.current = true
    setRewinding(true)
    after(450, () => {
      setRewinding(false)
      playBeat(0)
    })
  }

  // "Do it again" unmounts the button that had focus: once the ask button is back (and enabled), focus moves there
  useEffect(() => {
    if (rewinding || done || !refocus.current) return
    refocus.current = false
    askRef.current?.focus({ preventScroll: true })
  }, [rewinding, done])

  // dev-only shortcuts for checking beats / the finale without clicking through
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__cartmanDebug = {
      beat: (i: number) => {
        clearTimers()
        hush()
        setContract(false)
        playBeat(clamp(Math.round(i), 0, LAST))
      },
      finale: () => {
        beatRef.current = LAST
        startFinale()
      },
      state: () => ({ beat: beatRef.current, typing: typingRef.current, busy: busy.current, pending: !!pending.current }),
    }
    return () => {
      delete w.__cartmanDebug
    }
  })

  // --- derived -------------------------------------------------------
  const nextBeat = BEATS[beat + 1]
  const askLabel = rewinding ? 'Rewinding…' : finale === 'outro' ? FINALE_WAIT : finale === 'quiet' ? FINALE_QUIET : finale ? FINALE_BUSY : nextBeat ? nextBeat.ask : FINALE_ASK
  const slimEnd = compact || squeeze
  const askVariant = finale ? 'danger' : nextBeat ? nextBeat.variant : 'danger'
  const lineKey = line?.key ?? -1

  return (
    <SceneShell
      className="cms"
      chapter={1}
      title="Cartman's Birthday Roast"
      kicker="He ate Albert's cake. He will NOT be apologizing."
      backdrop={<TownBackdrop heat={heat} lit={lit} cam={cam} px={px} py={py} />}
      hud={<RoastHud apology={apology.value} apologyReadout={apology.readout} anger={anger} angerReadout={angerReadout} angerState={angerState} compact={compact} />}
      dock={
        <div className="cms-dock">
          <AnimatePresence mode="wait" initial={false}>
            {!done ? (
              <motion.div key="ask" className="cms-dock__ask" exit={{ y: 50, opacity: 0, scale: 0.85, transition: { duration: 0.22 } }}>
                <BigButton
                  ref={askRef}
                  variant={askVariant}
                  size="lg"
                  className={`cms-ask ${beat >= 5 && !finale ? 'cms-ask--jitter' : ''}`}
                  wiggle={beat === 0 && !typing && !finale && !rewinding}
                  disabled={!!finale || rewinding}
                  onClick={onAsk}
                  aria-label={typing ? `${askLabel} (finish his sentence)` : askLabel}
                >
                  <motion.span
                    key={askLabel}
                    className="cms-ask__label"
                    initial={{ y: 14, opacity: 0, scale: 0.7 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 20 }}
                  >
                    {askLabel}
                  </motion.span>
                </BigButton>
              </motion.div>
            ) : (
              <motion.div key="end" className="cms-dock__end" initial={{ opacity: 1 }}>
                <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.5 }}>
                  <BigButton
                    variant="ghost"
                    size="md"
                    sound="recordScratch"
                    onClick={replay}
                    className={`cms-replay ${slimEnd ? 'cms-replay--icon' : ''}`}
                    aria-label="Make him do it again"
                    title="Do it again"
                    icon={<ReplayIcon />}
                  >
                    {!slimEnd && <span>Do it again</span>}
                  </BigButton>
                </motion.div>
                <NextCta show label={slimEnd ? 'Next: boss fight' : 'Next: Tung Tung boss fight'} onClick={onNext} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      }
    >
      <div className="cms-stage" ref={stageRef}>
        <div className={`cms-layout ${finale === 'tantrum' ? 'cms-layout--tantrum' : ''}`}>
          <motion.div className={`cms-rigpos ${face.pose === 'sitting' || face.pose === 'tantrum' ? 'cms-rigpos--sit' : ''}`} ref={rigPosRef} style={{ scale: rigCam }}>
            <div className="cms-shadow" />
            <motion.div className={`cms-rig ${pokeable ? 'cms-rig--poke' : ''}`} ref={rigRef} onPointerDown={poke}>
              <Cartman
                expression={pokeFace ?? face.expression}
                pose={face.pose}
                talking={typing}
                intensity={face.intensity}
                redness={face.redness}
                steam={face.steam}
                label="Eric Cartman"
              />
            </motion.div>
            <CakePlate rattle={rattle} />
            <Contract show={contract} side={!narrow} />
          </motion.div>

          <div className="cms-bursts" aria-hidden="true">
            {bursts.map((b) => (
              <ComicBurst
                key={b.id}
                id={b.id}
                text={b.text}
                size={b.size}
                color={b.color}
                textColor={b.textColor}
                rotate={b.rotate}
                duration={950}
                className={reduced ? 'cms-burst--still' : undefined}
                style={{ left: b.x - b.size / 2, top: b.y - b.size / 2, '--rot': `${b.rotate ?? -8}deg` } as CSSProperties}
              />
            ))}
          </div>

          <div className={`cms-bubblepos ${narrow ? '' : 'cms-bubblepos--side'} ${face.steam ? 'cms-bubblepos--steam' : ''}`}>
            {/* the dead-silence beat after the tantrum, captioned for everyone watching on mute */}
            <AnimatePresence>
              {finale === 'quiet' && (
                <motion.p
                  key="crickets"
                  className="cms-caption"
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 380, damping: 24 }}
                  role="status"
                >
                  [crickets chirping]
                </motion.p>
              )}
            </AnimatePresence>
            <SpeechBubble
              text={line?.text}
              visible={!!line}
              voice="cartman"
              speaker="Cartman"
              tail={narrow ? 'bottom' : 'left'}
              intensity={line?.intensity ?? 0}
              cps={line?.cps}
              skip={skip}
              onChar={() => onLineChar(lineKey)}
              onDone={() => onLineDone(lineKey)}
            />
          </div>
        </div>
      </div>
    </SceneShell>
  )
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <path d="M5,12 a7,7 0 1,0 2.2,-5.1" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M4,3.5 L7.6,7.2 L3.4,8.6 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
