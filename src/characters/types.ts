/**
 * Character contracts. Scenes drive characters ONLY through these props, so the
 * rendering (layered SVG today, real images / sprites later) can be swapped freely.
 *
 * Every character component:
 *  - fills its parent box (width/height 100%) and keeps its aspect ratio, feet at the bottom
 *  - animates between expressions/poses itself (springs, squash & stretch, idle bob, blinking)
 *  - flaps its mouth while `talking` is true
 *  - scales effort with `intensity` (0 calm … 1 maximum chaos: faster shakes, bigger motion)
 */
import type { CSSProperties } from 'react'

/**
 * Width / height of each character's box. Character components draw with a fixed SVG viewBox of
 * this aspect (feet on the bottom edge, horizontally centered). Wide poses (tantrum, block,
 * windup…) may overflow the box — the SVG uses overflow: visible. Scenes size a container with
 * this aspect ratio and the character fills it.
 */
export const CHARACTER_ASPECT = { cartman: 1, peter: 0.62, tung: 0.58 } as const

export interface BaseCharacterProps<E extends string, P extends string> {
  expression?: E
  pose?: P
  talking?: boolean
  /** 0..1 how worked-up the character is — amplifies shakes, bob speed, sweat, etc. */
  intensity?: number
  /** horizontally mirror the character */
  flip?: boolean
  className?: string
  style?: CSSProperties
  /** accessible description; defaults to the character name */
  label?: string
}

/* ------------------------------------------------------------------ */
/* Eric Cartman                                                        */
/* ------------------------------------------------------------------ */
export const CARTMAN_EXPRESSIONS = [
  'neutral', // default deadpan
  'smug', // half-lidded eyes, self-satisfied smirk
  'annoyed', // brows slanted in, flat frown
  'angry', // deep V brows, mouth open yelling, pink cheeks
  'furious', // face flushed red, teeth gritted/clenched, veins, tiny pupils
  'crying', // tantrum: eyes squeezed shut with streaming tears, mouth wide wailing
  'sheepish', // eyes glancing aside, small wobbly mouth, blush
  'happy', // big open grin, happy eyes
  'shocked', // huge round eyes, tiny pupils, mouth an "O"
] as const
export type CartmanExpression = (typeof CARTMAN_EXPRESSIONS)[number]

export const CARTMAN_POSES = [
  'idle', // standing, mittens at sides, gentle breathing bob
  'handsOnHips', // indignant, mittens on hips (as far as stubby arms go)
  'pointing', // one mitten pointing at the viewer
  'fistShake', // both fists raised, shaking angrily
  'stomp', // stomping in place, alternating feet
  'tantrum', // lying on his back on the ground, arms & legs flailing wildly
  'sitting', // sitting on the ground after the tantrum, slumped
  'wave', // reluctant little wave
] as const
export type CartmanPose = (typeof CARTMAN_POSES)[number]

export interface CartmanProps extends BaseCharacterProps<CartmanExpression, CartmanPose> {
  /** 0..1 extra red flush on the face independent of expression */
  redness?: number
  /** show steam puffs from the head */
  steam?: boolean
}

/* ------------------------------------------------------------------ */
/* Peter Griffin                                                        */
/* ------------------------------------------------------------------ */
export const PETER_EXPRESSIONS = [
  'neutral', // classic dopey half-smile
  'grin', // big toothy grin
  'smug', // eyebrows up, sly smile
  'laughing', // eyes squeezed, mouth open "heheheh"
  'surprised', // eyebrows up, mouth "O"
  'pain', // teeth clenched, eyes squeezed (the knee!)
  'annoyed', // angry brows, frown (see reference image 6)
  'mischievous', // one eyebrow up, sideways smirk
  'warm', // soft genuine smile
] as const
export type PeterExpression = (typeof PETER_EXPRESSIONS)[number]

export const PETER_POSES = [
  'idle', // standing, hand on belt (reference image 1)
  'block', // arms spread wide, blocking the way
  'dance', // goofy looping dance (arms pumping, hips swaying)
  'push', // leaning forward, both hands pushing something to his side
  'kneePain', // crouched/fallen, clutching his knee
  'laugh', // leaning back, belly shaking
  'thumbsUp', // thumbs up
  'present', // stepping aside, arm sweeping toward something ("ta-da")
  'shrug', // palms up shrug
  'walk', // walking cycle
] as const
export type PeterPose = (typeof PETER_POSES)[number]

export type PeterProps = BaseCharacterProps<PeterExpression, PeterPose>

/* ------------------------------------------------------------------ */
/* Tung Tung Tung Sahur                                                */
/* ------------------------------------------------------------------ */
export const TUNG_EXPRESSIONS = [
  'creepy', // default: huge eyes, unsettling wide smile
  'angry', // heavy brows down, grimace
  'windup', // eyes popping wide, grin stretched (about to attack)
  'dizzy', // spiral eyes, wobbly mouth
  'hurt', // eyes squeezed, mouth crooked
  'exhausted', // half-closed eyes, tongue out, sweat drops
  'sheepish', // eyes glancing down, small smile, blush
  'happy', // warm closed-eye smile
] as const
export type TungExpression = (typeof TUNG_EXPRESSIONS)[number]

export const TUNG_POSES = [
  'idle', // standing, bat resting on the ground (reference images 4/5)
  'walk', // stalking walk cycle
  'windup', // bat raised high overhead, leaning back
  'slam', // bat smashed down in front, body squashed
  'swing', // horizontal bat swing
  'throw', // throwing the bat
  'taunt', // tapping bat on palm, bouncing
  'dizzy', // wobbling in a circle
  'exhausted', // hunched over, panting
  'dropBat', // bat slipping out of his hand and falling
  'wave', // little wave (no bat)
  'hop', // bouncy hop
] as const
export type TungPose = (typeof TUNG_POSES)[number]

export interface TungProps extends BaseCharacterProps<TungExpression, TungPose> {
  /** is he holding the bat? (false after dropBat) */
  hasBat?: boolean
}
