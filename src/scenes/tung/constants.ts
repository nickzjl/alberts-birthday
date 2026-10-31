import { CHARACTER_ASPECT } from '../../characters/types'

/* Logical arena. Height is fixed; width adapts to the stage (MIN_W..MAX_W) and the whole arena is scaled to fit. */
export const H = 560
export const MIN_W = 500
export const MAX_W = 1150
/** y of everyone's feet, measured from the arena top */
export const FLOOR = 470
/** back edge of the road (houses sit here) */
export const HORIZON = FLOOR - 58

export const TUNG_H = 300
export const TUNG_W = Math.round(TUNG_H * CHARACTER_ASPECT.tung)
export const ALBERT_W = 92
export const ALBERT_H = 110

/** Which way the Tung art faces when flip=false (+1 right, -1 left). Bat side = front. */
export const TUNG_ART_FACING: 1 | -1 = -1

export const BOSS_MAX_HP = 150
export const HEARTS = 5
/** phase 2 starts at hp <= 100, phase 3 at hp <= 50 */
export const PHASE_AT = { 2: 100, 3: 50 } as const
export const DMG = { dodge: 5, bonk: 4, crit: 6, selfBonk: 3 }
export const MAX_BONKS = 3

/* Albert physics (units / s) */
export const A = {
  speed: 400,
  accel: 3400,
  airAccel: 2400,
  gravity: 2700,
  jumpV: 940,
  /** keeps his whole sprite (and a K.O. body lying toward the centre) on screen */
  margin: 54,
  /** forgiving hurtbox */
  hurtHalfW: 20,
  hurtH: 70,
}

export type PhaseNo = 1 | 2 | 3

export const TUNING: Record<PhaseNo, { walk: number; rest: number; windup: number; dizzy: number; wave: number; intensity: number }> = {
  1: { walk: 190, rest: 1.0, windup: 1.0, dizzy: 2.7, wave: 0, intensity: 0.25 },
  2: { walk: 235, rest: 0.75, windup: 0.85, dizzy: 2.3, wave: 250, intensity: 0.6 },
  3: { walk: 275, rest: 0.55, windup: 0.72, dizzy: 2.0, wave: 300, intensity: 0.95 },
}

export type AttackKind = 'slam' | 'swing' | 'throw' | 'rain'

export const ATTACK_SEQ: Record<PhaseNo, AttackKind[]> = {
  1: ['slam'],
  2: ['slam', 'swing'],
  3: ['throw', 'rain', 'slam', 'swing'],
}

/* Attack geometry */
export const SLAM_REACH = 66 // impact x offset in front of Tung (where the art's bat tip lands)
/** the Tung art's bat hits the ground this long after the slam pose starts */
export const SLAM_DELAY = 0.12
/** …and lets go of the bat this long into the throw pose */
export const THROW_RELEASE = 0.34
export const SLAM_HALF = 92 // drawn marker half-width
export const SLAM_HIT_HALF = 78 // actual hit half-width (forgiving)
export const SWING_FROM = 30
export const SWING_TO = 270
export const SWING_HIT_Y = 40 // jump higher than this to clear the swing
/** strike-time window (s) in which the swing can hit — a jump started in the last ~0.45s of the windup clears it */
export const SWING_ACTIVE = [0.08, 0.24] as const
export const WAVE_HALF = 18
export const WAVE_HIT_Y = 28
/** shockwaves rise out of the ground this long after the bat lands, then launch (react to the BOOM, then jump) */
export const WAVE_DELAY = 0.16
/** how long before a hit the "JUMP!" cue over Albert's head lights up (reaction time + a little) */
export const CUE_LEAD = 0.45
export const BAT_LEN = 112
export const BAT_Y = 52
export const BAT_R = 26
export const DROP_R = 26
export const DROP_FALL = 1.05
