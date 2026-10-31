/**
 * Static path data + id helpers for the Tung rig (kept out of the .tsx component modules so
 * React Fast Refresh can hot-swap those).
 */

/** log silhouette (torso-local): cylinder with a carved cheek bulging out on his right */
export const BODY_PATH =
  'M190 86A100 24 0 0 1 390 86L390 612A100 26 0 0 1 190 612L190 388C186 360 174 322 174 276C174 232 184 198 190 178Z'

export const ids = (p: string) => ({
  body: `${p}-body`,
  shade: `${p}-shade`,
  cap: `${p}-cap`,
  glow: `${p}-glow`,
  flush: `${p}-flush`,
  clip: `${p}-clip`,
  eye: `${p}-eye`,
  sclera: `${p}-sclera`,
  iris: `${p}-iris`,
  nose: `${p}-nose`,
  bat: `${p}-batg`,
  mouth: `${p}-mouth`,
  armR: `${p}-armR`,
  armL: `${p}-armL`,
  batUse: `${p}-bat`,
})

/** bat silhouette, knob at 0,0 pointing up to the tip at y = −440 */
export const BAT_PATH =
  'M8 -6L9.5 -165C12 -225 27 -278 31 -338L33 -404A33 36 0 0 0 -33 -404L-31 -338C-27 -278 -12 -225 -9.5 -165L-8 -6Z'

export const TEARDROP = 'M0 -17C6 -7 10 -1 10 6A10 10 0 0 1 -10 6C-10 -1 -6 -7 0 -17Z'
export const VEIN = 'M-15 -4Q-6 -6 -4 -15M4 -15Q6 -6 15 -4M15 4Q6 6 4 15M-4 15Q-6 6 -15 4'
