import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { audio } from '../../audio/engine'
import { sfx, type SfxName, type SfxOpts } from '../../audio/sfx'
import { soundtrack } from '../../audio/soundtrack'
import { voice } from '../../audio/voice'
import { Peter } from '../../characters/peter/Peter'
import type { PeterPose } from '../../characters/types'
import { BigButton, type BigButtonVariant } from '../../components/ui/BigButton'
import { ComicBurst } from '../../components/ui/ComicBurst'
import { confettiRain, fireConfetti, PURPLE_CONFETTI } from '../../components/ui/confetti'
import { SceneShell } from '../../components/ui/SceneShell'
import { useShake } from '../../components/ui/shake'
import { SpeechBubble } from '../../components/ui/SpeechBubble'
import { useApp, type SceneProps } from '../../state/app'
import { GiftBox, type GiftPhase } from './GiftBox'
import { RetroTv } from './RetroTv'
import { LivingRoom, type RoomMode } from './LivingRoom'
import { LABELS, LINES, NOTES, OPEN_FOR_REAL } from './script'
import { GAGS, type BurstOpts, type Cue, type Director, type Intensity, type Look, type RigMove } from './gags'
import { ahh, drumroll, duckMusic, hiss, shimmer, thud } from './sounds'
import { Theater } from './Theater'
import { fitPose, reachOf, useStageLayout, type GiftSpot, type PeterSpot, type StageLayout } from './useStageLayout'
import type { VideoPlayerHandle } from './VideoPlayer'
import './gift.css'
import './peter.css'
import './room.css'
import './theater.css'

type Phase = 'gags' | 'opening' | 'video' | 'finale'

interface Line {
  /** lineSeq at the time it was said (stale callbacks from an exiting bubble are ignored) */
  id: number
  text: string
  intensity: Intensity
  cps?: number
}

interface Burst {
  id: number
  text: string
  x: number
  y: number
  size: number
  /** text scale so long words stay inside the star */
  fit: number
  color: string
  textColor: string
  rotate: number
}

/** how far left of Peter's center (× his width) the side bubble's tail sits, per pose */
const SIDE_REACH: Partial<Record<PeterPose, number>> = { block: 0.62, dance: 0.42, laugh: 0.34, push: 0.3, kneePain: 0.36 }

const VARIANTS: BigButtonVariant[] = ['acid', 'hot', 'sun', 'cyan', 'hot', 'sun', 'acid', 'danger', 'acid']
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export default function PeterScene({ onComplete, go }: SceneProps) {
  const { transitioning, setCalm } = useApp()
  const shake = useShake()
  const reduced = useReducedMotion() ?? false

  // ---------------------------------------------------------------- render state
  const [phase, setPhase] = useState<Phase>('gags')
  const [look, setLook] = useState<Look>({ pose: 'idle', expression: 'neutral', intensity: 0.1, flip: false })
  const [line, setLine] = useState<Line | null>(null)
  const [typing, setTyping] = useState(false)
  const [step, setStep] = useState(0)
  const [ctaReady, setCtaReady] = useState(false)
  const [ctaBusy, setCtaBusy] = useState(false)
  const [giftPhase, setGiftPhase] = useState<GiftPhase>('idle')
  const [giftMoving, setGiftMoving] = useState(false)
  const [room, setRoom] = useState<RoomMode>('normal')
  const [notes, setNotes] = useState(false)
  const [bursts, setBursts] = useState<Burst[]>([])
  const [spotOn, setSpotOn] = useState(false)
  const [from, setFrom] = useState<DOMRect | null>(null)
  const [bubbleMode, setBubbleMode] = useState<'side' | 'top'>('top')
  const [compact, setCompact] = useState(false)
  /** he walked off during the video: stop animating a Peter nobody can see */
  const [offstage, setOffstage] = useState(false)

  // ---------------------------------------------------------------- refs
  const stageRef = useRef<HTMLDivElement>(null)
  const peterRig = useRef<HTMLDivElement>(null)
  const giftRig = useRef<HTMLDivElement>(null)
  const giftBox = useRef<HTMLDivElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  /** the CTA's wrapper (stays mounted for the whole gag phase, so focus and measuring survive label changes) */
  const ctaRef = useRef<HTMLDivElement>(null)
  /** inner wrapper for the per-label pop and the "not now!" wiggle */
  const ctaPop = useRef<HTMLDivElement>(null)
  const player = useRef<VideoPlayerHandle>(null)
  const timers = useRef(new Set<number>())
  const busy = useRef(false)
  const typingRef = useRef(false)
  const lineDone = useRef<(() => void) | null>(null)
  const lineSeq = useRef(0)
  const burstSeq = useRef(0)
  const stepRef = useRef(0)
  const peterSpot = useRef<PeterSpot>('home')
  const giftSpot = useRef<GiftSpot>('home')
  const calmOn = useRef(false)
  const faded = useRef(false)
  const stopRain = useRef<(() => void) | null>(null)
  const bubbleModeRef = useRef<'side' | 'top'>('top')
  const poseRef = useRef<PeterPose>('idle')
  const flipRef = useRef(false)
  /** beats riding on the current line (fired as the typewriter reaches them) */
  const cues = useRef<Array<{ at: number; fn: () => void }>>([])
  const typed = useRef(0)
  /** the music bus is dipped for a gag (dance / drumroll) */
  const musicDucked = useRef(false)

  // ---------------------------------------------------------------- motion values (no re-renders)
  const peterX = useMotionValue(0)
  const giftX = useMotionValue(0)
  /** the TV stays parked at the present's home mark */
  const tvX = useMotionValue(0)
  const bubbleX = useMotionValue(0)
  const bubbleY = useMotionValue(0)
  const ctaX = useMotionValue(0)
  const peterOpacity = useMotionValue(1)

  // ---------------------------------------------------------------- timing helpers
  const wait = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(() => {
          timers.current.delete(id)
          resolve()
        }, ms)
        timers.current.add(id)
      }),
    [],
  )
  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, ms)
    timers.current.add(id)
  }, [])

  // ---------------------------------------------------------------- layout
  const placeBubble = useCallback(() => {
    const l = layoutRef.current
    const wrap = bubbleRef.current
    const bw = wrap?.offsetWidth ?? 300
    const bh = wrap?.offsetHeight ?? 90
    const px = peterX.get()
    if (bubbleModeRef.current === 'side') {
      const reach = SIDE_REACH[poseRef.current] ?? 0.27
      // anchor = the bubble's right edge (tail tip), kept on screen
      const right = Math.max(px - l.pw * reach, bw + 10)
      bubbleX.set(right)
      // it pops in from its tail, overshooting to ~1.2×: near the left edge, move the pop origin
      // left just enough that the overshoot stays on screen (pinned: it grows from that edge)
      wrap?.style.setProperty('--pop-x', `${Math.round(clamp(5 * (right - bw - 4), 0, bw))}px`)
      // centered on his head, but never poking out of the top of the stage
      const dy = Math.max(0, l.floor + l.ph * 0.9 + bh / 2 - (l.H - 6))
      bubbleY.set(dy)
      // …and when it's up against the top, it grows downwards from there
      const topGap = l.H - (l.floor + l.ph * 0.9 + bh / 2) + dy
      wrap?.style.setProperty('--pop-y', topGap < bh * 0.12 ? '0%' : '50%')
    } else {
      const x = clamp(px - l.pw * 0.42, 10, Math.max(10, l.W - bw - 10))
      bubbleX.set(x)
      // a long line on a short stage: slide down over his head rather than over the title
      bubbleY.set(Math.max(0, l.floor + l.ph + 28 + bh + 16 - l.H))
      // the tail follows his head (it's a wide bubble on phones)
      const head = px + (flipRef.current ? -0.03 : 0.03) * l.pw
      wrap?.style.setProperty('--tail-x', `${Math.round(clamp(head - x - 14, 22, bw - 50))}px`)
    }
  }, [bubbleX, bubbleY, peterX])

  /** decided once per line: beside Peter's head when there's room, otherwise above it */
  const chooseBubbleMode = useCallback(() => {
    const l = layoutRef.current
    const reach = SIDE_REACH[poseRef.current] ?? 0.27
    // he may walk left while talking, so budget for his leftmost mark
    const room = Math.min(peterX.get(), l.peter.home, l.peter.aside) - l.pw * reach - 22
    // short stages have no headroom: the bubble always goes beside him there
    const mode = l.mode === 'short' || (l.mode === 'wide' && room >= 260) ? 'side' : 'top'
    bubbleModeRef.current = mode
    stageRef.current?.style.setProperty('--bubble-max', `${Math.round(mode === 'side' ? clamp(room, l.mode === 'short' ? 200 : 260, 460) : 440)}px`)
    setBubbleMode(mode)
  }, [peterX])

  /**
   * Wall decor vs. Peter: the clock hangs at a fixed spot on the wall, which on some screens is
   * exactly where his head ends up (it read as a hat / antenna). If it's anywhere in the band his
   * head travels through (hops included), slide it between the window and him, else lift it above
   * his head, else take it down.
   */
  const placeDecor = useCallback((l: StageLayout) => {
    const st = stageRef.current
    const shell = st?.closest('.pt-shell')
    const room = shell?.querySelector<HTMLElement>('.pt-room')
    const clock = room?.querySelector<HTMLElement>('.pt-room__frame--clock')
    if (!st || !room || !clock) return
    for (const v of ['--pt-clock-top', '--pt-clock-left', '--pt-clock-vis']) room.style.removeProperty(v)
    const c = clock.getBoundingClientRect()
    if (!c.width) return // hidden on this screen anyway
    const s = st.getBoundingClientRect()
    const r = room.getBoundingClientRect()
    const xs = [l.peter.home, l.peter.front, l.peter.stage, l.peter.mid, l.peter.aside, l.peter.watch]
    const zone = {
      // (the mirrored "ta-da" pose leans his head ~0.15 × his width to the left)
      left: s.left + Math.min(...xs) - 0.42 * l.pw,
      right: s.left + Math.max(...xs) + 0.36 * l.pw,
      // tallest pose + a hop
      top: s.bottom - l.floor - l.ph * 1.2 - 30,
    }
    if (c.right <= zone.left || c.left >= zone.right || c.bottom <= zone.top) return
    const win = room.querySelector('.pt-room__window')?.getBoundingClientRect()
    const left = zone.left - 8 - c.width
    if (left >= (win && win.width ? win.right : r.left) + 6) {
      room.style.setProperty('--pt-clock-left', `${Math.round(left - r.left)}px`)
      return
    }
    const header = shell?.querySelector('.shell__header')?.getBoundingClientRect()
    const lifted = zone.top - c.height
    if (lifted >= (header ? header.bottom : r.top) + 10) {
      room.style.setProperty('--pt-clock-top', `${Math.round(lifted - r.top)}px`)
      return
    }
    room.style.setProperty('--pt-clock-vis', 'hidden')
  }, [])

  const onLayout = useCallback(
    (l: StageLayout) => {
      peterX.stop()
      giftX.stop()
      peterX.set(l.peter[peterSpot.current])
      giftX.set(l.gift[giftSpot.current])
      tvX.set(l.gift.home)
      setCompact(l.compact)
      chooseBubbleMode()
      placeBubble()
      placeDecor(l)
    },
    [peterX, giftX, tvX, chooseBubbleMode, placeBubble, placeDecor],
  )
  const { layout: layoutRef } = useStageLayout(stageRef, onLayout)

  // the bubble follows Peter around (and makes room for wide poses)
  useEffect(() => peterX.on('change', placeBubble), [peterX, placeBubble])
  useEffect(() => {
    poseRef.current = look.pose
    placeBubble()
  }, [look.pose, placeBubble])
  useLayoutEffect(() => {
    const el = bubbleRef.current
    if (!el) return
    const ro = new ResizeObserver(placeBubble)
    ro.observe(el)
    return () => ro.disconnect()
  }, [placeBubble])

  // ---------------------------------------------------------------- director primitives
  const peter = useCallback((patch: Partial<Look>) => {
    if (patch.pose) poseRef.current = patch.pose
    if (patch.flip !== undefined) flipRef.current = patch.flip
    setLook((l) => ({ ...l, ...patch }))
  }, [])

  const play = useCallback((name: SfxName, opts?: SfxOpts) => sfx.play(name, opts), [])

  const say = useCallback(
    (text: string, o: { intensity?: Intensity; cps?: number; cues?: Cue[] } = {}) =>
      new Promise<void>((resolve) => {
        lineDone.current?.()
        lineDone.current = resolve
        typingRef.current = true
        // cue positions in the typed (asterisk-free) text
        const plain = text.replace(/\*/g, '')
        cues.current = (o.cues ?? []).map(([needle, fn]) => ({ at: Math.max(1, plain.indexOf(needle) + 1), fn })).sort((a, b) => a.at - b.at)
        typed.current = 0
        chooseBubbleMode()
        setTyping(true)
        const id = ++lineSeq.current
        setLine({ id, text, intensity: o.intensity ?? 0, cps: o.cps })
      }),
    [chooseBubbleMode],
  )

  const hush = useCallback(() => {
    cues.current = []
    lineDone.current?.()
    lineDone.current = null
    typingRef.current = false
    setTyping(false)
    setLine(null)
  }, [])

  const onLineChar = useCallback((id: number, ch: string, text: string) => {
    if (id !== lineSeq.current) return
    typed.current++
    while (cues.current.length && cues.current[0].at <= typed.current) cues.current.shift()?.fn()
    if (text === LINES.knee) {
      if (ch === 'S') hiss(0.5)
      else if (ch === 'A') ahh()
    }
  }, [])

  const onLineDone = useCallback((id: number) => {
    if (id !== lineSeq.current) return
    // skipped to the end: whatever beats were still waiting happen now, in order
    const left = cues.current
    cues.current = []
    left.forEach((c) => c.fn())
    typingRef.current = false
    setTyping(false)
    const r = lineDone.current
    lineDone.current = null
    r?.()
  }, [])

  const move = useCallback(
    (spot: PeterSpot, o: { walk?: boolean; dash?: boolean; duration?: number } = {}) => {
      const l = layoutRef.current
      peterSpot.current = spot
      const to = l.peter[spot]
      const fromX = peterX.get()
      const dist = Math.abs(to - fromX)
      if (dist < 2) return Promise.resolve()
      if (o.walk) peter({ pose: 'walk', flip: to < fromX })
      const duration = o.duration ?? (o.dash ? 0.38 : clamp(dist / (l.ph * 0.95), 0.45, 1.7))
      animate(peterX, to, o.dash ? { duration, ease: [0.2, 1.3, 0.4, 1] } : { duration, ease: o.walk ? 'linear' : [0.3, 0, 0.2, 1] })
      return wait(duration * 1000)
    },
    [layoutRef, peter, peterX, wait],
  )

  const rig = useCallback(
    (kind: RigMove) => {
      const el = peterRig.current
      if (!el || reduced) return
      const opts = { ease: 'easeOut' as const }
      // short landscape stages have no headroom above him: a little hop, no stretch
      const low = layoutRef.current.mode === 'short'
      if (kind === 'anticipate') animate(el, { scaleX: [1, 1.08, 0.97, 1], scaleY: [1, 0.9, 1.05, 1] }, { duration: 0.42, ...opts })
      else if (kind === 'hop') animate(el, { y: [0, low ? -5 : -26, 0, 0], scaleY: [1, low ? 1 : 1.07, 0.9, 1], scaleX: [1, 0.96, 1.08, 1] }, { duration: 0.46, ...opts })
      else if (kind === 'land') animate(el, { scaleY: [1, 0.86, 1.04, 1], scaleX: [1, 1.1, 0.98, 1] }, { duration: 0.4, ...opts })
      else if (kind === 'fall') animate(el, { y: [0, -18, 6, 0], rotate: [0, -8, 4, 0] }, { duration: 0.5, ...opts })
      else if (kind === 'pop') animate(el, { scale: [1, low ? 1.04 : 1.12, 0.96, 1] }, { duration: 0.35, ...opts })
      else animate(el, { y: [0, -8, 0, -10, 0, -7, 0, -9, 0], rotate: [0, -2.5, 1, -3, 1, -2, 1, -2.5, 0] }, { duration: 2.2, ease: 'easeInOut' })
    },
    [layoutRef, reduced],
  )

  const giftWobble = useCallback(
    (strength = 1) => {
      const el = giftRig.current
      if (!el || reduced) return
      animate(el, { rotate: [0, 7 * strength, -5 * strength, 3 * strength, -1, 0], x: [0, 12 * strength, -5 * strength, 2, 0] }, { duration: 0.6, ease: 'easeOut' })
    },
    [reduced],
  )

  const slideGift = useCallback(
    (spot: GiftSpot, duration = 0.62) => {
      giftSpot.current = spot
      const el = giftRig.current
      setGiftMoving(true)
      animate(giftX, layoutRef.current.gift[spot], { duration, ease: [0.12, 0.65, 0.3, 1] })
      if (el && !reduced) animate(el, { rotate: [0, -8, -6, 4, 0], scaleX: [1, 1.05, 1, 0.98, 1] }, { duration: duration + 0.3, ease: 'easeOut' })
      after(duration * 1000 + 300, () => setGiftMoving(false))
      return wait(duration * 1000)
    },
    [after, giftX, layoutRef, reduced, wait],
  )

  /** the present waddles somewhere by itself (it's alive!) */
  const hopGift = useCallback(
    (spot: GiftSpot, hops: number) => {
      giftSpot.current = spot
      const l = layoutRef.current
      if (Math.abs(l.gift[spot] - giftX.get()) < 2) return Promise.resolve()
      const per = 0.34
      const duration = hops * per
      setGiftMoving(true)
      animate(giftX, l.gift[spot], { duration, ease: 'linear' })
      const el = giftRig.current
      if (el && !reduced) {
        const h = l.gs * 0.12
        const y: number[] = []
        const sy: number[] = []
        const r: number[] = []
        for (let i = 0; i < hops; i++) {
          y.push(0, -h, 0)
          sy.push(0.9, 1.06, 0.94)
          r.push(0, i % 2 ? 5 : -5, 0)
        }
        y.push(0)
        sy.push(1)
        r.push(0)
        animate(el, { y, scaleY: sy, rotate: r }, { duration, ease: 'easeInOut' })
      }
      for (let i = 0; i < hops; i++) play('boing', { pitch: 0.9 + i * 0.12, volume: 0.55, delay: i * per })
      play('land', { delay: duration - 0.05, volume: 0.6 })
      after(duration * 1000 + 100, () => setGiftMoving(false))
      return wait(duration * 1000 + 80)
    },
    [after, giftX, layoutRef, play, reduced, wait],
  )

  const burst = useCallback(
    (text: string, o: BurstOpts = {}) => {
      const l = layoutRef.current
      const id = ++burstSeq.current
      // longer words get a bigger star, and the text shrinks to stay inside it
      // (the burst's font is 0.2 × its size and a display-font letter is ~0.7 em wide, so
      // ~6 letters fill the star)
      const size = clamp(l.ph * 0.4, 96, 180) * (o.scale ?? 1) * clamp(text.length / 6, 1, 1.35)
      const fit = Math.min(1, 6.2 / text.length)
      let x: number
      let y: number
      if (o.at === 'gift') {
        x = giftX.get()
        y = l.floor + l.gs * 0.95
      } else if (o.at === 'knee') {
        x = peterX.get() + (o.dx ?? 0.5) * l.pw
        y = l.floor + l.ph * 0.4
      } else {
        // beside his head, never on his face (the face is usually the punchline): to the right,
        // or to the left when the right side would run off screen
        const head = peterX.get() + (flipRef.current ? -0.03 : 0.03) * l.pw
        const off = l.pw * 0.36 + size * 0.42 + (o.dx ?? 0) * l.pw
        x = head + off
        if (x + size / 2 > l.W - 4 && head - off - size / 2 >= 4) x = head - off
        y = l.floor + l.ph
      }
      // (it pops to 1.25× its size: keep that on screen too)
      x = clamp(x, size * 0.64, l.W - size * 0.64)
      y = clamp(y, size * 0.64, l.H - size * 0.64)
      setBursts((b) => [
        ...b,
        { id, text, x, y, size, fit, color: o.color ?? 'var(--sun)', textColor: o.textColor ?? 'var(--ink)', rotate: o.rotate ?? (id % 2 ? -10 : 8) },
      ])
      after(1200, () => setBursts((b) => b.filter((i) => i.id !== id)))
    },
    [after, giftX, layoutRef, peterX],
  )

  const duck = useCallback((level: number, seconds: number) => {
    musicDucked.current = level < 1
    duckMusic(level, seconds)
  }, [])

  const chaseCta = useCallback(
    (on: boolean) => {
      if (!on) {
        animate(ctaX, 0, { type: 'spring', stiffness: 260, damping: 20 })
        return
      }
      // (measured: the dock isn't always centered on the stage — short screens shift it right)
      const el = ctaRef.current
      const st = stageRef.current
      if (!el || !st) return
      const r = el.getBoundingClientRect()
      const left = r.left - ctaX.get()
      const target = st.getBoundingClientRect().left + layoutRef.current.gift.pushed
      const room = Math.max(0, document.documentElement.clientWidth - (left + r.width) - 12)
      // (the bouncy spring overshoots ~17%: budget for it so the button never leaves the screen)
      const dx = clamp(target - (left + r.width / 2), 0, room / 1.18)
      animate(ctaX, dx, { type: 'spring', stiffness: 120, damping: 11, delay: 0.15 })
    },
    [ctaX, layoutRef],
  )

  // ---------------------------------------------------------------- the interruptions (gags.ts)
  const director: Director = {
    wait,
    after,
    peter,
    play,
    say,
    move,
    rig,
    giftWobble,
    slideGift,
    hopGift,
    giftAt: () => giftSpot.current,
    burst,
    chaseCta,
    duck: (on) => (on ? duck(0.12, 0.25) : duck(1, 0.9)),
    shake,
    setRoom,
    setNotes,
    setGiftPhase,
    setSpotOn,
    laugh: (volume) => voice.laughPeter(volume),
    layout: () => layoutRef.current,
    peterX,
  }

  // ---------------------------------------------------------------- THE OPENING
  const runOpening = useCallback(async () => {
    setPhase('opening')
    setCtaReady(false)
    setRoom('dim')
    setSpotOn(true)
    setGiftPhase('rumble')
    peter({ expression: 'grin', intensity: 0.3 })
    void say(LINES.reveal, { cps: 20 })
    // the music drops out: silence, then the roll (it fades out for good when the video comes up)
    duck(0.05, 0.3)
    // a long, swelling drumroll; the box puffs up like it's about to burst
    const roll = drumroll(2.1)
    shake({ strength: 'tiny', duration: roll })
    const box = giftRig.current
    if (box && !reduced) animate(box, { scaleX: [1, 1.02, 1.07], scaleY: [1, 1.04, 1.11] }, { duration: roll, ease: 'easeIn' })
    await wait(roll * 1000 - 620)
    play('ribbonZip', { volume: 1.2 })
    play('boing', { pitch: 1.5, volume: 0.6, delay: 0.08 })
    setGiftPhase('untied')
    // he leans in…
    rig('anticipate')
    peter({ expression: 'mischievous', intensity: 0.5 })
    await wait(620)
    // climax — the lid rockets off on the crash
    hush()
    setGiftPhase('launched')
    if (box && !reduced) animate(box, { scaleX: [1.07, 0.9, 1.04, 1], scaleY: [1.11, 0.84, 1.04, 1] }, { duration: 0.55, ease: 'easeOut' })
    play('pop', { volume: 1.2 })
    play('whoosh', { pitch: 0.75 })
    play('sparkle')
    shimmer()
    shake({ strength: 'big', duration: 0.55, rotate: true })
    // he flinches: arms up, a startled hop (nudged in if his hands would leave a narrow screen)
    peter({ pose: 'block', expression: 'surprised', intensity: 0.7 })
    // (short landscape stages have no headroom for the hop: a squash instead)
    rig(layoutRef.current.mode === 'short' ? 'land' : 'hop')
    const l = layoutRef.current
    // (+10% for the hop's squash, which widens him for a moment)
    const fx = Math.max(fitPose(l, peterX.get(), 'block', flipRef.current), Math.min(l.W / 2, reachOf('block', flipRef.current)[0] * 1.1 * l.pw + l.edge))
    if (Math.abs(fx - peterX.get()) > 1) animate(peterX, fx, { duration: 0.2, ease: 'easeOut' })
    const r = giftBox.current?.getBoundingClientRect()
    if (r) {
      const x = (r.left + r.width * 0.49) / window.innerWidth
      const y = (r.top + r.height * 0.3) / window.innerHeight
      const k = clamp(window.innerWidth / 1100, 0.55, 1)
      // heavier than the default: it's all landed before the calm video screen comes up
      fireConfetti({ x, y, count: Math.round(170 * k), spread: 48, velocity: 21 * Math.sqrt(k), gravity: 0.55, colors: PURPLE_CONFETTI })
      fireConfetti({ x, y, count: Math.round(60 * k), spread: 80, velocity: 12.5 * Math.sqrt(k), gravity: 0.5, colors: PURPLE_CONFETTI, shapes: ['star'] })
    }
    await wait(700)
    setGiftPhase('unfolded')
    thud()
    play('land', { volume: 0.5, delay: 0.12 })
    // …and recovers into a proud "ta-da" as the screen rises out of the box
    peter({ pose: 'present', expression: 'grin', intensity: 0.3 })
    await wait(520)
    // the screen rises out of the box → calm mode
    const g = giftBox.current?.getBoundingClientRect()
    setFrom(g ? new DOMRect(g.left + g.width * 0.12, g.top + g.height * 0.3, g.width * 0.76, g.height * 0.6) : null)
    setPhase('video')
    play('tada')
    calmOn.current = true
    setCalm(true)
    faded.current = true
    // the bus is already dipped: finish the fade properly (pauses the track, the player says
    // "Shh… video"), then hand the bus back (nothing is playing through it by then)
    void soundtrack.fadeOut(900).then(() => {
      if (faded.current && musicDucked.current) duck(1, 0.05)
    })
    setRoom('calm')
    setSpotOn(false)
    await wait(700)
    // Peter quietly walks off
    peter({ pose: 'walk', flip: true, expression: 'warm', intensity: 0 })
    peterSpot.current = 'off'
    animate(peterX, layoutRef.current.peter.off, { duration: 3.2, ease: 'linear' })
    animate(peterOpacity, 0, { duration: 1.8, delay: 1 })
    after(3400, () => setOffstage(true))
    await wait(500)
    setGiftPhase('gone')
  }, [after, duck, hush, layoutRef, peter, peterOpacity, peterX, play, reduced, rig, say, setCalm, shake, wait])

  // ---------------------------------------------------------------- the button
  const press = useCallback(() => {
    if (busy.current) {
      // mid-gag: the button protests (he's not letting you anyway)
      sfx.play('squeak', { volume: 0.4, pitch: 0.75 + Math.random() * 0.3 })
      const el = ctaPop.current
      if (el && !reduced) animate(el, { rotate: [0, -4, 4, -2, 0], x: [0, -5, 5, -2, 0] }, { duration: 0.32 })
      return
    }
    const n = stepRef.current
    if (n > GAGS.length) return
    // a fresh start for the next interruption: whatever he was still saying is cut off (most people
    // mash the button during the intro — he gets interrupted, then immediately interrupts you)
    hush()
    sfx.play('click')
    if (n === GAGS.length) {
      busy.current = true
      setCtaBusy(true)
      void runOpening()
      return
    }
    busy.current = true
    setCtaBusy(true)
    void GAGS[n](director)
      .catch(() => {})
      .then(() => {
        busy.current = false
        stepRef.current = n + 1
        setStep(n + 1)
        setCtaBusy(false)
        // let the last line linger a moment, then clear the stage
        const seq = lineSeq.current
        after(2600, () => {
          if (seq === lineSeq.current && !busy.current && !typingRef.current) hush()
        })
      })
  }, [after, director, hush, reduced, runOpening])

  // ---------------------------------------------------------------- intro (after the brain-wipe clears)
  useEffect(() => {
    if (transitioning) return
    let cancelled = false
    const t0 = window.setTimeout(() => {
      if (cancelled) return
      peter({ expression: 'grin', intensity: 0.3 })
      rig('pop')
      void say(LINES.intro).then(() => {
        if (!cancelled) setCtaReady(true)
      })
    }, 650)
    // the button shows up a bit before he finishes, so impatient people can mash it
    const t1 = window.setTimeout(() => !cancelled && setCtaReady(true), 2600)
    return () => {
      cancelled = true
      window.clearTimeout(t0)
      window.clearTimeout(t1)
    }
  }, [transitioning, peter, rig, say])

  // ---------------------------------------------------------------- finale / replay
  const startFinale = useCallback(() => {
    setPhase('finale')
    if (calmOn.current) {
      calmOn.current = false
      setCalm(false)
    }
    if (faded.current) {
      faded.current = false
      soundtrack.fadeIn(2500)
    }
    setRoom('party')
    onComplete()
    play('fanfare', { volume: 0.8 })
    play('partyHorn', { delay: 0.35, volume: 0.7 })
    // the same density on every screen (a phone shouldn't drown the title in confetti)
    const k = clamp(window.innerWidth / 1100, 0.45, 1)
    fireConfetti({ x: 0.15, y: 0.75, angle: -65, spread: 40, velocity: 21, count: Math.round(140 * k) })
    fireConfetti({ x: 0.85, y: 0.75, angle: -115, spread: 40, velocity: 21, count: Math.round(140 * k) })
    after(900, () => fireConfetti({ x: 0.5, y: 0.35, count: Math.round(160 * k), spread: 120, velocity: 13 }))
    stopRain.current?.()
    stopRain.current = confettiRain({ duration: 7000, perFrame: Math.max(1, Math.round(3 * k)), colors: PURPLE_CONFETTI })
  }, [after, onComplete, play, setCalm])

  const replay = useCallback(() => {
    player.current?.replay()
    stopRain.current?.()
    stopRain.current = null
    setPhase('video')
    setRoom('calm')
    calmOn.current = true
    setCalm(true)
    faded.current = true
    void soundtrack.fadeOut(1800)
  }, [setCalm])

  // ---------------------------------------------------------------- dev helper (QA screenshots)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__peterDebug = {
      look: (p: Partial<Look>) => peter(p),
      at: (spot: PeterSpot) => {
        peterSpot.current = spot
        peterX.stop()
        peterX.set(layoutRef.current.peter[spot])
      },
      gift: (spot: GiftSpot) => {
        giftSpot.current = spot
        giftX.stop()
        giftX.set(layoutRef.current.gift[spot])
      },
      say: (text: string, intensity: Intensity = 0) => say(text, { intensity }),
      layout: () => layoutRef.current,
      /** music bus gain (the scene's duck) */
      bus: () => audio.musicBus?.gain.value ?? null,
      /** jump to attempt n (0-based) with the button ready */
      step: (n: number) => {
        stepRef.current = n
        setStep(n)
        setCtaReady(true)
      },
    }
    return () => {
      delete w.__peterDebug
    }
  }, [giftX, layoutRef, peter, peterX, say])

  // ---------------------------------------------------------------- cleanup on unmount
  useEffect(() => {
    const t = timers.current
    return () => {
      t.forEach((id) => window.clearTimeout(id))
      t.clear()
      stopRain.current?.()
      stopRain.current = null
      if (calmOn.current) {
        calmOn.current = false
        setCalm(false)
      }
      if (musicDucked.current) {
        musicDucked.current = false
        duckMusic(1, 0.4)
      }
      if (faded.current) {
        faded.current = false
        soundtrack.fadeIn(1500)
      }
    }
  }, [setCalm])

  // ---------------------------------------------------------------- the button: a pop per new label
  // (one persistent button, so keyboard focus survives every gag)
  const shownLabel = useRef<string | null>(null)

  // ---------------------------------------------------------------- render
  const theater = phase === 'video' || phase === 'finale'
  const finalStep = step >= GAGS.length
  const label = finalStep ? OPEN_FOR_REAL : LABELS[Math.min(step, LABELS.length - 1)]
  const note = NOTES[Math.min(step, NOTES.length - 1)]
  const variant = VARIANTS[Math.min(step, VARIANTS.length - 1)]
  const showCta = ctaReady && phase === 'gags'

  useEffect(() => {
    if (shownLabel.current === label) return
    const first = shownLabel.current === null
    shownLabel.current = label
    const el = ctaPop.current
    if (first || !el || reduced) return
    animate(el, { scale: [0.45, 1], rotate: [-7, 0] }, { type: 'spring', stiffness: 480, damping: 19 })
  }, [label, reduced])

  const dock = (
    <div className="pt-dock">
      <AnimatePresence mode="popLayout">
        {showCta && (
          <motion.p
            key={note}
            className="pt-dock__note"
            initial={{ opacity: 0, y: 8, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
          >
            {note}
          </motion.p>
        )}
      </AnimatePresence>
      <motion.div className="pt-dock__cta" style={{ x: ctaX }}>
        <AnimatePresence>
          {showCta && (
            <motion.div
              key="cta"
              ref={ctaRef}
              className="pt-cta-wrap"
              initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.14 } }}
              transition={{ type: 'spring', stiffness: 460, damping: 17 }}
            >
              <div ref={ctaPop} className="pt-cta-pop">
                <BigButton
                  variant={finalStep ? 'acid' : variant}
                  size="lg"
                  wiggle={!ctaBusy}
                  sound={false}
                  className={`pt-cta ${ctaBusy && !typing ? 'is-busy' : ''} ${finalStep ? 'is-final' : ''}`}
                  data-busy={ctaBusy ? 'true' : 'false'}
                  onClick={press}
                  icon={step === 0 || finalStep ? <span aria-hidden="true">🎁</span> : undefined}
                >
                  {label}
                </BigButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )

  return (
    <SceneShell
      chapter={3}
      title="Peter Griffin's Birthday Present"
      className={`pt-shell pt-shell--${phase}`}
      hideHeader={theater}
      backdrop={<LivingRoom mode={room} />}
      dock={dock}
    >
      <div ref={stageRef} className={`pt-stage pt-stage--bubble-${bubbleMode} ${offstage ? 'is-offstage' : ''}`}>
        <div className="pt-floor">
          <motion.div className="pt-tv-pos" style={{ x: tvX }}>
            <RetroTv />
          </motion.div>
          <motion.div className="pt-gift-pos" style={{ x: giftX }}>
            <div className={`pt-spot ${spotOn || phase === 'opening' ? 'is-on' : ''}`} aria-hidden="true" />
            <div ref={giftRig} className={`pt-gift-rig ${giftMoving ? '' : giftPhase === 'idle' ? 'is-idle' : giftPhase === 'excited' ? 'is-excited' : ''}`}>
              <GiftBox ref={giftBox} phase={giftPhase} tagSide={compact ? 'right' : 'left'} />
            </div>
          </motion.div>

          <motion.div className="pt-peter-pos" style={{ x: peterX, opacity: peterOpacity }}>
            <div ref={peterRig} className="pt-peter-rig">
              {!offstage && <Peter pose={look.pose} expression={look.expression} intensity={look.intensity} flip={look.flip} talking={typing} />}
            </div>
            {notes && (
              <div className="pt-notes" aria-hidden="true">
                {['♪', '♫', '♪', '♬', '♫'].map((n, i) => (
                  <span key={i} style={{ animationDelay: `${i * 0.38}s` }}>
                    {n}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <motion.div className={`pt-bubble-anchor pt-bubble-anchor--${bubbleMode}`} style={{ x: bubbleX, y: bubbleY }}>
          <div ref={bubbleRef} className="pt-bubble-wrap">
            <SpeechBubble
              visible={!!line && !theater}
              text={line?.text}
              voice="peter"
              speaker="Peter"
              tail={bubbleMode === 'side' ? 'right' : 'bottom-left'}
              intensity={line?.intensity ?? 0}
              cps={line?.cps}
              onDone={() => line && onLineDone(line.id)}
              onChar={(ch) => line && onLineChar(line.id, ch, line.text)}
              className="pt-bubble"
            />
          </div>
        </motion.div>

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
            className="pt-burst"
            style={{ left: b.x - b.size / 2, bottom: b.y - b.size / 2, '--fit': b.fit } as CSSProperties}
          />
        ))}
      </div>

      {theater && <Theater ref={player} mode={phase === 'finale' ? 'finale' : 'video'} from={from} onEnded={startFinale} onReplay={replay} onStartOver={() => go('landing')} />}
    </SceneShell>
  )
}
