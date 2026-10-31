/**
 * The interruptions — one async routine per press of the button. Each one choreographs Peter,
 * the present, sounds and lines through the scene's Director, and resolves when the gag is over.
 */
import { animate, type MotionValue } from 'motion/react'
import type { SfxName, SfxOpts } from '../../audio/sfx'
import type { PeterExpression, PeterPose } from '../../characters/types'
import type { ShakeOptions } from '../../components/ui/shake'
import type { GiftPhase } from './GiftBox'
import type { RoomMode } from './LivingRoom'
import { LINES } from './script'
import { danceBeat, scrape } from './sounds'
import type { GiftSpot, PeterSpot, StageLayout } from './useStageLayout'

export type Intensity = 0 | 1 | 2 | 3

export interface Look {
  pose: PeterPose
  expression: PeterExpression
  intensity: number
  flip: boolean
}

export type RigMove = 'anticipate' | 'hop' | 'fall' | 'laugh' | 'land' | 'pop'

export interface BurstOpts {
  at?: 'head' | 'knee' | 'gift'
  color?: string
  textColor?: string
  scale?: number
  dx?: number
  rotate?: number
}

/** `[substring, fn]`: fn runs the moment the typewriter reaches that part of the line (or when the line is skipped to the end) */
export type Cue = readonly [string, () => void]

/** Everything a gag is allowed to do to the stage. */
export interface Director {
  wait(ms: number): Promise<void>
  after(ms: number, fn: () => void): void
  peter(patch: Partial<Look>): void
  play(name: SfxName, opts?: SfxOpts): void
  /** type a line in Peter's bubble; resolves when it's fully shown. Beats can ride on `cues`. */
  say(text: string, o?: { intensity?: Intensity; cps?: number; cues?: Cue[] }): Promise<void>
  move(spot: PeterSpot, o?: { walk?: boolean; dash?: boolean; duration?: number }): Promise<void>
  /** squash & stretch on top of Peter's own animation */
  rig(kind: RigMove): void
  giftWobble(strength?: number): void
  slideGift(spot: GiftSpot, duration?: number): Promise<void>
  /** the present hops somewhere by itself */
  hopGift(spot: GiftSpot, hops: number): Promise<void>
  giftAt(): GiftSpot
  burst(text: string, o?: BurstOpts): void
  /** the button runs after the shoved present */
  chaseCta(on: boolean): void
  /** dip the soundtrack under a gag's own music (false = bring it back) */
  duck(on: boolean): void
  shake(o?: ShakeOptions): void
  setRoom(mode: RoomMode): void
  setNotes(on: boolean): void
  setGiftPhase(phase: GiftPhase): void
  setSpotOn(on: boolean): void
  laugh(volume?: number): void
  layout(): StageLayout
  peterX: MotionValue<number>
}

export const GAGS: Array<(d: Director) => Promise<void>> = [
  // 1 — stepping in front of it
  async (d) => {
    d.play('recordScratch')
    d.peter({ expression: 'surprised', intensity: 0.6 })
    d.rig('anticipate')
    await d.wait(210)
    d.play('whoosh', { pitch: 1.25 })
    const dash = d.move('front', { dash: true })
    // arms fly out once he's under way (from his home mark they'd poke off a phone's edge)
    await d.wait(90)
    d.peter({ pose: 'block' })
    await dash
    d.play('squeak')
    d.play('stomp', { volume: 0.7 })
    d.giftWobble(0.8)
    d.rig('land')
    d.shake({ strength: 'small', duration: 0.3 })
    d.burst('WHOA!', { color: 'var(--sun)' })
    d.peter({ expression: 'annoyed', intensity: 0.7 })
    await d.say(LINES.block, { intensity: 2 })
    await d.wait(450)
    d.peter({ expression: 'smug', intensity: 0.2 })
    await d.move('home', { walk: true })
    d.peter({ pose: 'idle', flip: false })
  },
  // 2 — the official Griffin birthday dance
  async (d) => {
    d.peter({ expression: 'grin', intensity: 0.4 })
    d.rig('hop')
    d.play('jump', { volume: 0.6 })
    // narrow screens: hop to where both fists fit
    if (Math.abs(d.layout().peter.stage - d.peterX.get()) > 2) void d.move('stage', { dash: true, duration: 0.42 })
    await d.say(LINES.dance, { intensity: 1 })
    // the setup, a beat, then the cue — the music cuts out for his solo
    await d.wait(260)
    d.duck(true)
    d.peter({ expression: 'mischievous', intensity: 0.6 })
    d.rig('anticipate')
    await d.say(LINES.danceGo, { intensity: 2, cps: 26 })
    d.setRoom('disco')
    d.play('recordScratch', { volume: 0.5, pitch: 1.3 })
    await d.wait(280)
    const beat = danceBeat()
    d.peter({ pose: 'dance', expression: 'laughing', intensity: 0.85 })
    d.setNotes(true)
    d.setGiftPhase('excited')
    await d.wait(beat * 1000 + 50)
    d.setNotes(false)
    d.peter({ pose: 'thumbsUp', expression: 'smug', intensity: 0.2 })
    d.rig('pop')
    d.play('rimshot')
    d.burst('NAILED IT!', { color: 'var(--acid)', scale: 0.8 })
    d.setRoom('normal')
    d.setGiftPhase('idle')
    d.duck(false)
    await d.wait(1000)
    d.peter({ pose: 'idle', expression: 'neutral' })
    if (Math.abs(d.layout().peter.home - d.peterX.get()) > 2) {
      await d.move('home', { walk: true })
      d.peter({ pose: 'idle', flip: false })
    }
  },
  // 3 — shoving the present out of the way
  async (d) => {
    d.peter({ expression: 'annoyed', intensity: 0.3 })
    await d.move('nearGift', { walk: true })
    // he braces on "Lemme just…" (the shove itself waits for the pause after it)
    await d.say(LINES.push, {
      intensity: 1,
      cues: [
        [
          'Lemme',
          () => {
            d.peter({ pose: 'push', expression: 'pain', intensity: 0.9, flip: false })
            d.play('slideUp', { volume: 0.45, pitch: 0.8 })
            d.rig('anticipate')
          },
        ],
      ],
    })
    await d.wait(380)
    // *SCOOOOCH*
    scrape(0.62)
    d.play('whoosh')
    const l = d.layout()
    animate(d.peterX, l.peter.nearGift + (l.gift.pushed - l.gift.home) * 0.4, { duration: 0.5, ease: [0.2, 0.7, 0.3, 1] })
    d.chaseCta(true)
    const said = d.say(LINES.scooch, { intensity: 2, cps: 40 })
    await d.slideGift('pushed')
    d.play('bonk', { volume: 0.7 })
    d.giftWobble(0.6)
    d.burst('BONK!', { at: 'gift', color: 'var(--cyan)' })
    d.peter({ pose: 'idle', expression: 'smug', intensity: 0.2 })
    await said
    await d.wait(500)
    // steps back to admire his view (on phones this is left of home, clear of the TV)
    await d.move('watch', { walk: true })
    d.peter({ pose: 'idle', flip: false, expression: 'neutral' })
  },
  // 4 — the knee
  async (d) => {
    d.chaseCta(false)
    d.peter({ expression: 'neutral', intensity: 0.2 })
    const first = d.say(LINES.kneeStart, { cps: 30 })
    await d.wait(200)
    void d.move('mid', { walk: true })
    await first
    d.peterX.stop()
    d.play('crack', { volume: 1.4 })
    d.play('hurt', { delay: 0.05 })
    d.peter({ pose: 'kneePain', expression: 'pain', intensity: 1, flip: false })
    d.rig('fall')
    d.shake({ strength: 'medium', duration: 0.35, rotate: true })
    d.burst('CRACK!', { at: 'knee', color: 'var(--danger)', textColor: 'var(--white)' })
    await d.wait(380)
    await d.say(LINES.knee, { intensity: 3 })
    d.peter({ intensity: 0.45 })
    await d.wait(450)
    // …meanwhile the present waddles back by itself (and stops just short of him)
    d.peter({ expression: 'surprised', intensity: 0.3 })
    await d.hopGift('peek', 4)
    await d.say(LINES.kneeAfter)
    d.peter({ expression: 'pain', intensity: 0.35 })
  },
  // 5 — cracking himself up
  async (d) => {
    d.play('jump')
    d.peter({ pose: 'idle', expression: 'grin', intensity: 0.5, flip: false })
    d.rig('hop')
    d.burst("I'M FINE!", { color: 'var(--cyan)', scale: 0.8 })
    await d.wait(420)
    // the box tags along home with him
    if (d.giftAt() !== 'home') void d.hopGift('home', 2)
    await d.move('home', { walk: true })
    d.peter({ pose: 'laugh', expression: 'laughing', intensity: 0.95, flip: false })
    d.laugh()
    d.rig('laugh')
    await d.say(LINES.laugh, {
      intensity: 1,
      cues: [
        [
          'HEHEHEHEH',
          () => {
            d.laugh(0.9)
            d.rig('laugh')
            d.burst('HEH!', { color: 'var(--lavender)', scale: 0.7, rotate: 12 })
          },
        ],
      ],
    })
    d.laugh(0.8)
    await d.wait(700)
    d.peter({ pose: 'idle', expression: 'neutral', intensity: 0.1 })
  },
  // 6a — "okay, go ahead…"
  async (d) => {
    d.peter({ pose: 'shrug', expression: 'neutral', intensity: 0.1 })
    d.play('slideDown', { volume: 0.4 })
    const said = d.say(LINES.fakeoutA, { cps: 26 })
    await d.wait(550)
    await d.move('aside', { walk: true })
    d.peter({ pose: 'present', expression: 'warm', flip: true })
    d.setGiftPhase('excited')
    await said
  },
  // 6b — …NOPE
  async (d) => {
    d.play('recordScratch')
    d.peter({ expression: 'mischievous', intensity: 0.8 })
    d.play('whoosh', { pitch: 1.3 })
    const dash = d.move('front', { dash: true, duration: 0.3 })
    await d.wait(90)
    d.peter({ pose: 'block', flip: false })
    await dash
    d.play('vineBoom')
    d.setGiftPhase('idle')
    d.giftWobble(1)
    d.rig('land')
    d.shake({ strength: 'medium', duration: 0.4 })
    d.burst('NOPE!', { color: 'var(--hot)', textColor: 'var(--white)', scale: 1.2 })
    await d.say(LINES.fakeoutB, { intensity: 2 })
    await d.wait(400)
    d.peter({ expression: 'smug', intensity: 0.2 })
    await d.move('home', { walk: true })
    d.peter({ pose: 'idle', flip: false, expression: 'mischievous' })
  },
  // 7 — he finally gives in
  async (d) => {
    d.peter({ pose: 'shrug', expression: 'annoyed', intensity: 0 })
    d.play('slideDown', { volume: 0.5, pitch: 0.8 })
    await d.wait(650)
    d.peter({ expression: 'warm', pose: 'idle' })
    const said = d.say(LINES.giveIn, { cps: 24 })
    await d.wait(800)
    void d.hopGift('center', 3)
    await d.move('aside', { walk: true })
    d.peter({ pose: 'present', flip: true, expression: 'warm', intensity: 0.15 })
    d.play('sparkle', { volume: 0.7 })
    d.setSpotOn(true)
    await said
    d.setGiftPhase('excited')
  },
]
