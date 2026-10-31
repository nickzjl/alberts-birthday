import type { SfxName } from '../../audio/sfx'
import type { CartmanExpression, CartmanPose } from '../../characters/types'
import type { BigButtonVariant } from '../../components/ui/BigButton'
import type { ShakeOptions } from '../../components/ui/shake'

export interface Readout {
  value: number
  readout: string
}

/** One comedic "hit": a sound, a shake, a burst, a squash… all optional, fired together. */
export interface Reaction {
  /** ms after the trigger */
  at?: number
  sfx?: SfxName
  volume?: number
  pitch?: number
  shake?: ShakeOptions
  /** comic burst near Cartman; x/y are fractions of his box (0,0 = top-left) */
  burst?: { text: string; x: number; y: number; color?: string; textColor?: string; rotate?: number }
  /** body squash on the character rig */
  squash?: 'small' | 'big' | 'hop'
  /** voice.whineCartman pitch */
  whine?: number
  apology?: Readout
  contract?: boolean
  face?: { expression?: CartmanExpression; pose?: CartmanPose }
}

export interface Beat {
  /** label of the button press that leads to this beat */
  ask: string
  variant: BigButtonVariant
  /** Cartman's line — `*emphasis*` renders as a wobbly punchline */
  line: string
  expression: CartmanExpression
  pose: CartmanPose
  intensity: number
  redness: number
  steam?: boolean
  bubble: 0 | 1 | 2 | 3
  anger: number
  apology: Readout
  /** quick facial take (anticipation) before he answers */
  take?: { expression: CartmanExpression; ms: number }
  onStart?: Reaction[]
  /** fire when the typewriter has revealed past `after` */
  cues?: Array<Reaction & { after: string }>
  onDone?: Reaction[]
  /** a second bubble after a comedic pause (pressing during the pause cuts straight to it) */
  then?: { pause: number; line: string; cues?: Array<Reaction & { after: string }>; onDone?: Reaction[] }
}

/** 0 = the intro (no press). Every press advances one beat; pressing on the last beat starts the finale. */
export const BEATS: Beat[] = [
  {
    ask: '',
    variant: 'acid',
    line: "What? I didn't *eat* Albert's cake. I *tested* it. For poison. You're welcome.",
    expression: 'smug',
    pose: 'handsOnHips',
    intensity: 0.1,
    redness: 0,
    bubble: 0,
    anger: 0.06,
    apology: { value: 0, readout: '0%' },
  },
  {
    ask: 'Make him apologize',
    variant: 'acid',
    line: "Fine. Okay. I'm *sorry*…",
    expression: 'sheepish',
    pose: 'idle',
    intensity: 0.15,
    redness: 0,
    bubble: 0,
    anger: 0.14,
    apology: { value: 0, readout: '0%' },
    take: { expression: 'shocked', ms: 380 },
    cues: [{ after: 'sorry', apology: { value: 0.05, readout: '5%?!' }, sfx: 'sparkle', volume: 0.8 }],
    then: {
      pause: 1100,
      line: "…that you're *so old,* Albert.",
      cues: [
        {
          after: 'so old',
          sfx: 'vineBoom',
          shake: { strength: 'small', duration: 0.35 },
          burst: { text: 'OOF!', x: -0.02, y: 0.14, color: 'var(--hot)', textColor: 'var(--white)', rotate: 8 },
          apology: { value: 0, readout: '0%' },
          face: { expression: 'smug', pose: 'pointing' },
          squash: 'small',
        },
        { after: 'so old', at: 300, sfx: 'slideDown', volume: 0.7 },
      ],
    },
  },
  {
    ask: 'Seriously, apologize',
    variant: 'acid',
    line: "Excuse me?! You got a whole year older *without asking me.* That's a *personal attack.*",
    expression: 'annoyed',
    pose: 'handsOnHips',
    intensity: 0.3,
    redness: 0.12,
    bubble: 1,
    anger: 0.26,
    apology: { value: 0, readout: '0.00%' },
    take: { expression: 'shocked', ms: 300 },
    onStart: [{ sfx: 'recordScratch', squash: 'small' }],
    onDone: [{ at: 250, sfx: 'dramatic', shake: { strength: 'tiny', duration: 0.6 } }],
  },
  {
    ask: 'Say sorry!!!',
    variant: 'sun',
    line: "Okay, I'll apologize. Just *sign this contract* first. Clause one: *it was Albert's fault.*",
    expression: 'smug',
    pose: 'pointing',
    intensity: 0.38,
    redness: 0.2,
    bubble: 1,
    anger: 0.37,
    apology: { value: 0, readout: '-3%' },
    take: { expression: 'smug', ms: 420 },
    cues: [{ after: 'contract', contract: true, sfx: 'slap', squash: 'small' }],
    onDone: [{ at: 280, sfx: 'rimshot' }],
  },
  {
    ask: 'Please???',
    variant: 'sun',
    line: '*Technically* I ate the cake. But you left it *unattended.* That was basically a cry for help.',
    expression: 'annoyed',
    pose: 'idle',
    intensity: 0.48,
    redness: 0.32,
    bubble: 1,
    anger: 0.49,
    apology: { value: 0, readout: '-12%' },
    take: { expression: 'annoyed', ms: 320 },
    onStart: [{ contract: false, sfx: 'swoosh' }],
    // (the crickets are saved for the dead silence after the tantrum)
    onDone: [
      { at: 350, sfx: 'sadTrombone', volume: 0.6, face: { expression: 'sheepish' } },
      { at: 1900, face: { expression: 'annoyed' } },
    ],
  },
  {
    ask: "I'm begging you",
    variant: 'hot',
    line: 'Your cake had *so many candles* the fire department showed up! I was *saving lives!*',
    expression: 'angry',
    pose: 'fistShake',
    intensity: 0.62,
    redness: 0.48,
    bubble: 2,
    anger: 0.63,
    apology: { value: 0, readout: '-40%' },
    take: { expression: 'angry', ms: 300 },
    onStart: [{ sfx: 'punch', squash: 'big', shake: { strength: 'small', duration: 0.3 } }],
    onDone: [
      {
        at: 200,
        sfx: 'airhorn',
        volume: 0.8,
        burst: { text: 'HERO?', x: -0.04, y: 0.1, color: 'var(--cyan)', rotate: 10 },
        shake: { strength: 'small', duration: 0.4 },
      },
    ],
  },
  {
    ask: 'Apologize or else',
    variant: 'hot',
    line: "My mom says I *don't have to* say sorry on other people's birthdays! It's *the law!*",
    expression: 'furious',
    pose: 'stomp',
    intensity: 0.8,
    redness: 0.68,
    steam: true,
    bubble: 2,
    anger: 0.79,
    apology: { value: 0, readout: 'ERROR' },
    take: { expression: 'furious', ms: 260 },
    onStart: [0, 380, 760, 1140, 1520].map((at, i) => ({
      at,
      sfx: 'stomp' as const,
      pitch: 1 - i * 0.03,
      shake: { strength: 'medium' as const, duration: 0.28 },
      squash: 'hop' as const,
    })),
    onDone: [{ at: 150, sfx: 'buzzer', volume: 0.6, burst: { text: 'LAW?!', x: -0.02, y: 0.16, color: 'var(--sun)', rotate: -10 } }],
  },
  {
    ask: 'Last chance, buddy',
    variant: 'danger',
    line: "THAT'S IT! *Respect my authoritah!* I'm not fat, I'm *big-boned,* and you're *OLD!*",
    expression: 'furious',
    pose: 'fistShake',
    intensity: 0.95,
    redness: 0.92,
    steam: true,
    bubble: 3,
    anger: 0.93,
    apology: { value: 0, readout: 'LOL NO' },
    take: { expression: 'shocked', ms: 650 },
    onStart: [{ sfx: 'thunder', shake: { strength: 'big', duration: 0.7, rotate: true }, squash: 'big', whine: 0.9 }],
    cues: [
      {
        after: 'OLD!',
        sfx: 'vineBoom',
        shake: { strength: 'medium', duration: 0.4 },
        burst: { text: 'OLD!', x: -0.02, y: 0.12, color: 'var(--hot)', textColor: 'var(--white)', rotate: 12 },
      },
    ],
  },
]

export const FINALE_ASK = 'Say. Sorry. Now.'

/** Button labels while the finale plays (button disabled). */
export const FINALE_BUSY = 'Uh oh…'
export const FINALE_QUIET = 'Is he… done?'
export const FINALE_WAIT = 'Wait for it…'

export const TANTRUM_LINE = 'NO! NO! NO! NO! *WAAAAAAAAH!*'

/**
 * Positions are fractions of his box (0,0 = top-left). He's flat on his back now, face up front, so the
 * bursts go in the clear space around him: the upper corners, above his hat, and out past his sides —
 * never on his face or on the kicking soles.
 */
export const TANTRUM_BURSTS: Array<{ text: string; x: number; y: number; color: string; textColor?: string; rotate: number }> = [
  { text: 'WAAH!', x: 0.07, y: 0.2, color: 'var(--sun)', rotate: -12 },
  { text: 'NYEH!', x: 0.82, y: 0.1, color: 'var(--hot)', textColor: 'var(--white)', rotate: 10 },
  { text: 'NOO!', x: 0.3, y: 0.08, color: 'var(--acid)', rotate: -8 },
  { text: 'MOM!!', x: 1.08, y: 0.8, color: 'var(--cyan)', rotate: 8 },
  { text: 'UGH!!', x: -0.08, y: 0.58, color: 'var(--lavender)', rotate: 14 },
  { text: 'NO!!', x: 0.7, y: 0.08, color: 'var(--sun)', rotate: -10 },
  { text: 'WAH!', x: 0.1, y: 0.06, color: 'var(--hot)', textColor: 'var(--white)', rotate: 6 },
]

/** The grudging resolution, typed slowly. */
export const OUTRO = [
  { line: '…fine. *Happy birthday,* Albert.', cps: 22 },
  { line: "…don't tell *anyone* I said that.", cps: 26 },
  { line: 'Now can I have *more cake?*', cps: 30 },
] as const
