/**
 * Peter's geometry, poses and expressions — pure data consumed by the rig.
 * Coordinates live in a 310 × 500 viewBox (CHARACTER_ASPECT.peter = 0.62), feet on y = 500.
 *
 * Arm angles: fA/bA = how far the upper arm is raised away from the body (deg),
 *             fF/bF = elbow flex towards the body (negative = forearm swings outward),
 *             fW/bW = wrist twist, fS/bS = cartoon stretch (0 = normal length).
 */
import type { PeterExpression, PeterPose } from '../types'
import type { Ch, HandShape, Shape } from './rig'

/** [amplitude, phase 0..1, harmonic (cycles per pose cycle), shape] */
export type Wave = [number, number?, number?, Shape?]
export type WaveMap = Partial<Record<Ch, Wave[]>>

export const GEO = {
  W: 310,
  H: 500,
  /** outline thickness */
  o: 3,
  rootPivot: [155, 500] as [number, number],
  pelvisPivot: [160, 345] as [number, number],
  upperPivot: [160, 330] as [number, number],
  bellyPivot: [192, 334] as [number, number],
  headPivot: [165, 132] as [number, number],
  headScale: 1,
  hipF: [112, 342] as [number, number],
  hipB: [205, 342] as [number, number],
  footF: [112, 460] as [number, number],
  footB: [206, 449] as [number, number],
  legF: [60, 58.5] as [number, number],
  legB: [54, 53.5] as [number, number],
  legWF: 100,
  legWB: 84,
  shoulderF: [40, 182] as [number, number],
  shoulderB: [276, 182] as [number, number],
  upperArm: 60,
  foreArm: 58,
  cuffEnd: 44,
  armW: 42,
  lensL: [154, 40, 13.5] as [number, number, number],
  lensR: [189, 34, 12.5] as [number, number, number],
}

export interface PoseDef {
  base: Partial<Record<Ch, number>>
  hz?: number
  waves?: WaveMap
  /** [front hand (viewer's left), back hand] */
  hands: [HandShape, HandShape]
  /** draw the far arm in front of the belly */
  backFront?: boolean
  /** arms solve IK towards the raised knee; offsets per hand */
  armsToKnee?: boolean
  kneeGrab?: [[number, number], [number, number]]
  /** extra pupil offset */
  gaze?: [number, number]
  /** knee bend direction per leg: 1 = forward (facing side), -1 = backward/outward */
  knees?: [number, number]
  /** draw the near leg in front of the belly (knee raised) */
  legFront?: boolean
  /** near-leg tweaks: foreshortened thigh (knee towards the camera) and width */
  nearLeg?: { thigh?: number; width?: number }
}

const IDLE_ARMS = { fA: 40, fF: 84, fW: 36, bA: 36, bF: 64, bW: 48 }

export const POSES: Record<PeterPose, PoseDef> = {
  idle: {
    base: { ...IDLE_ARMS },
    hz: 0.28,
    waves: {
      bellyX: [[0.012, 0, 1]],
      bellyY: [[0.009, 0, 1]],
      upY: [[-0.8, 0.05, 1]],
      headR: [[1.2, 0.1, 0.5]],
      headY: [[0.5, 0.1, 1]],
      hipX: [[1.6, 0, 0.5]],
      upR: [[0.7, 0.25, 0.5]],
      fA: [[1.2, 0.05, 1]],
      bA: [[1, 0.05, 1]],
    },
    hands: ['rest', 'rest'],
  },
  block: {
    base: { fFootX: -26, bFootX: 22, hipY: 12, upY: 2, fA: 96, fF: -6, fW: 84, bA: 96, bF: -6, bW: 84 },
    hz: 1.1,
    waves: {
      hipX: [[6, 0, 1]],
      hipR: [[-2, 0, 1]],
      upR: [[-2, 0.05, 1]],
      fA: [[5, 0, 2]],
      bA: [[5, 0.5, 2]],
      fW: [[8, 0.1, 2]],
      bW: [[8, 0.6, 2]],
      headR: [[2.5, 0.1, 1]],
      bellyX: [[0.02, 0.1, 2, 'hop']],
    },
    hands: ['open', 'open'],
    knees: [-1, 1],
  },
  dance: {
    // alternating overhead fist pumps, hips swinging, belly lagging behind on every beat
    base: { hipY: 5, fA: 90, fF: -70, bA: 90, bF: -70, fW: 0, bW: 0 },
    hz: 1.15,
    waves: {
      hipX: [[15, 0, 1]],
      hipR: [[-5, 0, 1]],
      hipY: [[7, 0, 2, 'hop']],
      fFootY: [[-9, 0.5, 1, 'lift']],
      bFootY: [[-8, 0, 1, 'lift']],
      fFootR: [[6, 0.5, 1, 'lift']],
      upR: [[4.5, 0.06, 1]],
      upX: [[2, 0, 4]],
      bellyX: [[0.055, 0.15, 2, 'hop']],
      bellyY: [[-0.045, 0.15, 2, 'hop']],
      fA: [[36, 0, 1]],
      fF: [[30, 0.08, 1]],
      bA: [[36, 0.5, 1]],
      bF: [[30, 0.58, 1]],
      headR: [[11, 0.22, 1]],
      headY: [[3, 0.1, 2, 'hop']],
      rootSY: [[-0.03, 0, 2, 'hop']],
      rootSX: [[0.02, 0, 2, 'hop']],
    },
    hands: ['fist', 'fist'],
    knees: [-1, 1],
  },
  push: {
    base: { upR: 4, upX: 2, upY: 4, hipX: 24, hipY: 12, hipR: 6, fFootX: -32, bFootX: 26, fA: -68, fF: 4, fW: -100, fS: 0.3, bA: 62, bF: -40, bW: 70, bS: -0.12, bellyX: 0.035, bellyY: -0.02, headR: 7, headX: 3 },
    hz: 1.5,
    waves: {
      hipX: [[3, 0, 1]],
      upR: [[1, 0.05, 1]],
      fS: [[0.04, 0.05, 1]],
      bS: [[0.04, 0.05, 1]],
      headR: [[1.5, 0.2, 2]],
      bellyY: [[0.015, 0, 2, 'hop']],
      fFootX: [[-2, 0.5, 1]],
    },
    hands: ['open', 'open'],
    knees: [1, 1],
  },
  kneePain: {
    base: { hipY: 92, hipX: -10, hipR: -4, fFootX: 48, fFootY: -28, fFootR: -30, bFootX: 88, bFootY: 26, bFootR: -55, upR: -6, upY: 4, headR: 7, headY: 4, fW: 40, bW: -40, fS: 0.15, bS: 0.35 },
    armsToKnee: true,
    kneeGrab: [[-20, -6], [22, -4]],
    legFront: true,
    nearLeg: { thigh: 1, width: 0.72 },
    hz: 0.95,
    waves: {
      rootR: [[3.5, 0, 1]],
      rootX: [[3, 0, 1]],
      headR: [[3, 0.15, 1]],
      upR: [[2, 0.08, 1]],
      fFootY: [[-1.5, 0, 1]],
    },
    hands: ['claw', 'claw'],
    backFront: true,
  },
  laugh: {
    base: { upR: -11, upY: -1, headR: -8, fA: -14, fF: 76, fW: 10, bA: 22, bF: 70, bW: 0 },
    hz: 3.2,
    waves: {
      upY: [[-2.2, 0, 1, 'hop']],
      bellyY: [[0.05, 0.1, 1, 'hop']],
      bellyX: [[-0.03, 0.1, 1, 'hop']],
      headR: [[3, 0.15, 1]],
      headY: [[1.5, 0.1, 1, 'hop']],
      upR: [[1.5, 0, 0.5]],
      fA: [[2, 0.2, 1]],
      bA: [[2, 0.2, 1]],
      rootSY: [[0.015, 0, 1, 'hop']],
    },
    hands: ['open', 'open'],
    backFront: true,
  },
  thumbsUp: {
    base: { fA: 56, fF: -122, fW: 0, bA: 18, bF: 40, bW: 14, upR: 3, headR: 5 },
    hz: 1.1,
    waves: {
      fA: [[3, 0, 1]],
      headR: [[1.5, 0.1, 1]],
      bellyY: [[0.01, 0, 1]],
    },
    hands: ['thumb', 'rest'],
  },
  present: {
    base: { rootX: 16, upR: 6, hipX: 4, fFootX: -18, bFootX: 6, fA: 78, fF: -22, fW: -14, bA: 18, bF: 40, bW: 14, headR: -7 },
    gaze: [-3, 0],
    hz: 0.9,
    waves: {
      fW: [[8, 0, 1]],
      fA: [[2.5, 0.1, 1]],
      upR: [[1, 0.2, 1]],
    },
    hands: ['open', 'rest'],
  },
  shrug: {
    base: { shrug: 8, headR: 7, upY: 1, fA: 24, fF: -74, fW: -12, bA: 24, bF: -74, bW: -12 },
    hz: 0.75,
    waves: {
      shrug: [[2.5, 0, 1, 'hop']],
      fF: [[-5, 0, 1, 'hop']],
      bF: [[-5, 0, 1, 'hop']],
      headR: [[1.5, 0.1, 1]],
    },
    hands: ['open', 'open'],
  },
  walk: {
    base: { upR: 4, hipY: 4, fA: 8, fF: 22, fW: 6, bA: 8, bF: 22, bW: 6 },
    hz: 0.95,
    waves: {
      fFootX: [[22, 0, 1, 'stepX']],
      bFootX: [[20, 0.5, 1, 'stepX']],
      fFootY: [[-13, 0, 1, 'stepY']],
      bFootY: [[-11, 0.5, 1, 'stepY']],
      fFootR: [[10, 0, 1, 'stepY']],
      bFootR: [[10, 0.5, 1, 'stepY']],
      hipY: [[-5, 0.5, 2, 'hop']],
      hipR: [[4, 0, 1]],
      hipX: [[3.5, 0.25, 1]],
      upR: [[-2, 0.05, 1], [1.2, 0, 2]],
      rootR: [[1.2, 0.1, 1]],
      fA: [[14, 0.25, 1, 'cos']],
      bA: [[14, 0.25, 1, 'cos']],
      fF: [[8, 0.25, 1, 'cos']],
      bF: [[-8, 0.25, 1, 'cos']],
      headR: [[2, 0.1, 2]],
      headY: [[1.5, 0.3, 2, 'hop']],
      bellyY: [[0.025, 0.1, 2, 'hop']],
      bellyX: [[-0.015, 0.1, 2, 'hop']],
    },
    hands: ['rest', 'rest'],
  },
}

export type MouthId =
  | 'smile' | 'smug' | 'smirk' | 'soft'
  | 'grin' | 'laugh' | 'laughB' | 'O' | 'Obig' | 'clench' | 'clenchOpen' | 'grit' | 'gritOpen'
  | 'talkS' | 'talkM' | 'talkL'
export type BrowId = 'up' | 'high' | 'worried' | 'mischief' | 'angry'

export interface ExprDef {
  eyes: {
    /** [upper lid (-1 open … 1 shut), lid tilt deg, lower lid (1 none … 0 half)] */
    L: [number, number, number]
    R: [number, number, number]
    pupL: [number, number]
    pupR: [number, number]
    size: number
    lens: number
    mode: 'open' | 'happy' | 'squeeze'
  }
  mouth: MouthId
  talk: MouthId[]
  brows?: BrowId
  /** lid line weight */
  lidW?: number
  body?: Partial<Record<Ch, number>>
  waves?: WaveMap
  hz?: number
  tremble?: number
  sweat?: boolean
  blush?: boolean
  flush?: boolean
}

export const EXPRESSIONS: Record<PeterExpression, ExprDef> = {
  neutral: {
    eyes: { L: [-0.6, 3, 1.1], R: [-0.42, -3, 1.1], pupL: [-2.4, -2], pupR: [-1.4, -0.6], size: 1, lens: 1, mode: 'open' },
    mouth: 'smile',
    talk: ['talkM', 'talkS', 'talkL', 'smile', 'talkM', 'talkS'],
  },
  grin: {
    eyes: { L: [-0.82, 0, 0.5], R: [-0.8, 0, 0.5], pupL: [0, -1.6], pupR: [0, -1.4], size: 1.05, lens: 1.02, mode: 'open' },
    mouth: 'grin',
    talk: ['grin', 'talkL', 'grin', 'talkM'],
    body: { headY: -1 },
  },
  smug: {
    eyes: { L: [-0.08, -5, 0.8], R: [-0.05, 5, 0.8], pupL: [-4.6, 2.2], pupR: [-4.4, 1.6], size: 1.1, lens: 1, mode: 'open' },
    mouth: 'smug',
    talk: ['talkS', 'smug', 'talkM', 'smug'],
    brows: 'up',
    body: { headR: -4 },
  },
  laughing: {
    eyes: { L: [1.1, 0, 1.1], R: [1.1, 0, 1.1], pupL: [0, 0], pupR: [0, 0], size: 1, lens: 1, mode: 'happy' },
    mouth: 'laugh',
    talk: ['laugh', 'laughB', 'laugh', 'laughB'],
    body: { headR: -6 },
    hz: 3.4,
    waves: {
      bellyY: [[0.035, 0, 1, 'hop']],
      bellyX: [[-0.02, 0, 1, 'hop']],
      headY: [[1.6, 0.1, 1, 'hop']],
      upY: [[-1.2, 0.05, 1, 'hop']],
      headR: [[1.5, 0.2, 0.5]],
    },
    tremble: 0.3,
  },
  surprised: {
    eyes: { L: [-1.08, 0, 1.1], R: [-1.08, 0, 1.1], pupL: [0, 0], pupR: [0, 0], size: 0.72, lens: 1.14, mode: 'open' },
    mouth: 'O',
    talk: ['O', 'Obig', 'O', 'Obig'],
    brows: 'high',
    body: { headY: -3 },
  },
  pain: {
    eyes: { L: [1.1, 0, 1.1], R: [1.1, 0, 1.1], pupL: [0, 0], pupR: [0, 0], size: 1, lens: 0.96, mode: 'squeeze' },
    mouth: 'clench',
    talk: ['clench', 'clenchOpen', 'clench', 'clenchOpen'],
    brows: 'worried',
    tremble: 0.8,
    sweat: true,
  },
  annoyed: {
    eyes: { L: [-0.2, 22, 1.1], R: [-0.28, -20, 1.1], pupL: [4.4, 3.4], pupR: [3.2, 3], size: 1, lens: 1, mode: 'open' },
    mouth: 'grit',
    talk: ['gritOpen', 'grit', 'gritOpen', 'talkM'],
    lidW: 3.6,
    body: { headR: 3 },
    tremble: 0.45,
    flush: true,
  },
  mischievous: {
    eyes: { L: [-0.15, 10, 0.75], R: [-0.95, -4, 1.1], pupL: [4, 1.2], pupR: [4, 0.4], size: 1.05, lens: 1, mode: 'open' },
    mouth: 'smirk',
    talk: ['smirk', 'talkS', 'smirk', 'talkM'],
    brows: 'mischief',
    body: { headR: 4 },
  },
  warm: {
    eyes: { L: [-0.55, 0, 0.45], R: [-0.5, 0, 0.45], pupL: [0, -0.4], pupR: [0, -0.4], size: 1.3, lens: 1, mode: 'open' },
    mouth: 'soft',
    talk: ['talkS', 'soft', 'talkM', 'soft'],
    blush: true,
    body: { headR: -2 },
  },
}
