/** Cartman art constants — 400×400 viewBox, feet on y=400, centered on x=200. */

export const COLORS = {
  ink: '#1c0f14',
  skin: '#f6dbb4',
  skinShade: '#dcb68b',
  flush: '#ec3d3d',
  hat: '#1fb5d0',
  hatShade: '#1696b0',
  brim: '#ffd93b',
  brimShade: '#e6b81e',
  pom: '#ffd93b',
  pomShade: '#e2b31a',
  jacket: '#e5203a',
  jacketShade: '#b3122b',
  crease: '#8f0c22',
  button: '#2a0a12',
  mitten: '#f9d62e',
  mittenShade: '#d8ac16',
  pants: '#6b3f2a',
  pantsShade: '#4f2c1c',
  shoe: '#17110f',
  eye: '#ffffff',
  pupil: '#120a0a',
  mouth: '#2b0d12',
  tongue: '#e45a73',
  teeth: '#ffffff',
  blush: '#ff6f96',
  tear: '#7fdcff',
  steam: '#f3edff',
  dust: '#e6dcff',
  vein: '#d4002a',
}

export const EYE = { lx: 166, rx: 235, cy: 180, rX: 37.5, ry: 39 }
export const MOUTH = { cx: 201, cy: 254 }

export const PIVOT = {
  root: [200, 300] as const,
  feet: [200, 400] as const,
  neck: [200, 282] as const,
  pom: [197, 80] as const,
  shoulder: [80, 262] as const, // left; right is mirrored at x=400-80
  hip: [133, 352] as const,
}

/** head silhouette (hat dome + cheeks + jowls) */
export const HEAD =
  'M200 66C283 66 342 113 342 173C343 221 321 262 271 280C240 291 160 291 129 280C79 262 57 221 58 173C59 113 117 66 200 66Z'

/** bottom edge of the brim (hat covers everything above it) */
export const BRIM_LOW = 'M54 172Q200 100 346 161'
export const HAT = `${BRIM_LOW}L360 30L40 30Z`
/** yellow knit band */
export const BRIM =
  'M52 173Q200 101 348 162C351 158 350 154 347 153Q200 91 54 164C50 166 50 171 52 173Z'

/** lumpy knit tuft, drooping a lobe toward the left like the show's */
export const POM =
  'M150 84C141 80 143 69 153 68C152 58 164 52 174 57C179 47 195 43 204 50C212 43 229 45 233 55C243 55 249 65 243 73C246 81 238 87 229 83C223 89 211 88 206 82C198 89 184 88 178 82C172 91 160 95 155 89C152 88 151 86 150 84Z'
export const POM_FOLDS = 'M174 57C175 64 180 69 187 70M204 50C203 58 208 64 215 65M155 74C160 78 166 79 171 77M231 66C234 70 237 72 241 72'

export const CHIN = 'M98 237C142 279 262 283 311 235'
export const LIP = 'M188 271Q203 276 219 270'

export const BODY =
  'M200 203C303 201 368 236 380 290C391 331 377 363 334 371C282 380 118 380 66 371C23 363 9 331 20 290C32 236 97 201 200 203Z'
export const JACKET_SEAM = 'M206 287L206 375'
export const JACKET_FOLDS = 'M50 268C60 278 64 292 60 308M350 268C340 278 336 292 340 308M112 362C140 368 170 369 192 367M222 368C250 369 276 366 300 360'
export const BUTTONS = [299, 327, 355]

/** left pant leg (right one is mirrored) */
export const LEG = 'M64 334L199 334L199 392C170 395 110 395 72 391C62 376 60 352 64 334Z'
export const SHOE = 'M66 400C66 389 196 388 199 400Z'

/** sleeve in arm-local space: shoulder at 0,0, hanging toward +y */
export const SLEEVE = 'M-17 0C-17 -16 17 -16 17 0L17 44C17 54 -17 54 -17 44Z'
export const HAND_Y = 46

export const MITTEN = {
  open: {
    main: 'M-18 -3C-25 14 -22 42 0 44C20 46 25 22 19 1C15 -9 -12 -10 -18 -3Z',
    thumb: 'M-12 4C-22 -5 -34 1 -31 12C-29 20 -19 21 -14 17Z',
  },
  fist: {
    main: 'M-20 3C-23 23 -9 37 4 36C19 35 25 18 20 3C15 -9 -14 -10 -20 3Z',
    curl: 'M10 9C18 12 18 22 10 25',
  },
  point: {
    finger: 'M-9 24L-10 54C-10 65 9 65 9 54L8 24Z',
    nail: 'M-4 53C-4 59 4 59 4 53',
  },
}
