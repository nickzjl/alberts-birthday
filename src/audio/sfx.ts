/**
 * Sound-effect library — all synthesized with Web Audio, no files required.
 *
 *   import { sfx } from '../audio/sfx'
 *   sfx.play('vineBoom')
 *   sfx.play('boing', { pitch: 1.3, volume: 0.6 })
 *
 * To replace a synthesized effect with a real sample, add it to `SFX_FILE_OVERRIDES`
 * below (files live in /public/sfx). The sample is fetched once and reused.
 *
 * Effects run through a compressor at ~42% level so they sit *under* the soundtrack.
 */
import { audio, midiToFreq } from './engine'
import {
  bell,
  kick,
  noise,
  piano,
  powerChord,
  snare,
  tone,
  woodKnock,
  type Dest,
} from './synthKit'

export type SfxName =
  | 'click'
  | 'hover'
  | 'pop'
  | 'whoosh'
  | 'swoosh'
  | 'success'
  | 'buzzer'
  | 'error'
  | 'toggle'
  | 'vineBoom'
  | 'airhorn'
  | 'recordScratch'
  | 'rimshot'
  | 'slideUp'
  | 'slideDown'
  | 'boing'
  | 'bonk'
  | 'slap'
  | 'punch'
  | 'crash'
  | 'explosion'
  | 'fanfare'
  | 'tada'
  | 'drumroll'
  | 'sparkle'
  | 'coin'
  | 'chaChing'
  | 'powerUp'
  | 'hurt'
  | 'partyHorn'
  | 'fizz'
  | 'canOpen'
  | 'ghost'
  | 'roar'
  | 'guitar'
  | 'thunder'
  | 'tung'
  | 'tungTriple'
  | 'whistle'
  | 'step'
  | 'jump'
  | 'land'
  | 'heartbeat'
  | 'glitch'
  | 'zap'
  | 'splat'
  | 'stomp'
  | 'crack'
  | 'ribbonZip'
  | 'wail'
  | 'dramatic'
  | 'crickets'
  | 'sadTrombone'
  | 'bubble'
  | 'shatter'
  | 'chomp'
  | 'squeak'
  | 'scratchSpin'
  | 'clatter'

/** Optional real samples: e.g. vineBoom: '/sfx/vine-boom.mp3' */
export const SFX_FILE_OVERRIDES: Partial<Record<SfxName, string>> = {}

export interface SfxOpts {
  /** 0..2 multiplier (default 1) */
  volume?: number
  /** pitch multiplier (default 1) */
  pitch?: number
  /** seconds from now */
  delay?: number
}

type Synth = (ctx: BaseAudioContext, out: Dest, t: number, p: number) => void

const S: Record<SfxName, Synth> = {
  click: (c, o, t, p) => {
    tone(c, o, t, 0.008, { type: 'square', freq: 1900 * p, vol: 0.12, attack: 0.001, decay: 0.01, sustain: 0.1, release: 0.02 })
    tone(c, o, t, 0.02, { type: 'sine', freq: 620 * p, to: 380 * p, vol: 0.35, attack: 0.001, decay: 0.03, sustain: 0.2, release: 0.04 })
  },
  hover: (c, o, t, p) => {
    tone(c, o, t, 0.02, { type: 'sine', freq: 1300 * p, to: 1700 * p, vol: 0.08, attack: 0.002, decay: 0.02, sustain: 0.3, release: 0.03 })
  },
  pop: (c, o, t, p) => {
    tone(c, o, t, 0.05, { type: 'sine', freq: 380 * p, to: 1250 * p, sweep: 0.05, vol: 0.55, attack: 0.001, decay: 0.04, sustain: 0.3, release: 0.05 })
    noise(c, o, t, 0.01, { vol: 0.15, filter: { type: 'highpass', freq: 2500 }, release: 0.02 })
  },
  whoosh: (c, o, t, p) => {
    noise(c, o, t, 0.35, { vol: 0.6, filter: { type: 'bandpass', freq: 350 * p, to: 2600 * p, q: 1.6 }, attack: 0.12, decay: 0.2, sustain: 0.6, release: 0.25 })
  },
  swoosh: (c, o, t, p) => {
    noise(c, o, t, 0.12, { vol: 0.5, filter: { type: 'bandpass', freq: 900 * p, to: 4200 * p, q: 2 }, attack: 0.03, decay: 0.08, sustain: 0.5, release: 0.08 })
  },
  success: (c, o, t, p) => {
    ;[72, 76, 79, 84].forEach((m, i) => bell(c, o, t + i * 0.07, m + 12 * Math.log2(p), 0.6, 0.22))
  },
  buzzer: (c, o, t, p) => {
    tone(c, o, t, 0.38, { type: 'sawtooth', freq: 110 * p, vol: 0.3, filter: { type: 'lowpass', freq: 900 }, attack: 0.005, sustain: 0.9, release: 0.06 })
    tone(c, o, t, 0.38, { type: 'square', freq: 116 * p, vol: 0.18, filter: { type: 'lowpass', freq: 900 }, attack: 0.005, sustain: 0.9, release: 0.06 })
  },
  error: (c, o, t, p) => {
    tone(c, o, t, 0.1, { type: 'square', freq: 520 * p, vol: 0.15, filter: { type: 'lowpass', freq: 2000 } })
    tone(c, o, t + 0.12, 0.18, { type: 'square', freq: 370 * p, vol: 0.15, filter: { type: 'lowpass', freq: 2000 } })
  },
  toggle: (c, o, t, p) => {
    tone(c, o, t, 0.02, { type: 'sine', freq: 880 * p, vol: 0.25, attack: 0.001, decay: 0.03, sustain: 0.2, release: 0.03 })
    tone(c, o, t + 0.05, 0.02, { type: 'sine', freq: 1320 * p, vol: 0.25, attack: 0.001, decay: 0.03, sustain: 0.2, release: 0.04 })
  },
  vineBoom: (c, o, t, p) => {
    const sh = c.createWaveShaper()
    const curve = new Float32Array(new ArrayBuffer(512 * 4))
    for (let i = 0; i < 512; i++) {
      const x = (i * 2) / 512 - 1
      curve[i] = Math.tanh(x * 4)
    }
    sh.curve = curve
    const g = c.createGain()
    g.gain.value = 0.9
    sh.connect(g).connect(o)
    tone(c, sh, t, 0.25, { type: 'sine', freq: 95 * p, to: 38 * p, sweep: 0.9, vol: 1, attack: 0.002, decay: 0.9, sustain: 0.35, release: 1.1, reverb: 0.4 })
    tone(c, sh, t, 0.15, { type: 'triangle', freq: 190 * p, to: 70 * p, sweep: 0.5, vol: 0.35, attack: 0.002, decay: 0.4, sustain: 0.2, release: 0.6 })
    noise(c, o, t, 0.06, { vol: 0.35, filter: { type: 'lowpass', freq: 600, to: 120 }, release: 0.25, reverb: 0.5 })
  },
  airhorn: (c, o, t, p) => {
    const blast = (st: number, d: number) => {
      for (const [m, det] of [
        [69, -8],
        [69, 8],
        [73, 0],
        [76, 4],
        [57, 0],
      ] as const) {
        tone(c, o, st, d, {
          type: 'sawtooth',
          freq: midiToFreq(m) * p,
          to: midiToFreq(m) * p * 0.94,
          sweep: d + 0.1,
          detune: det,
          vol: 0.09,
          attack: 0.01,
          decay: 0.05,
          sustain: 0.9,
          release: 0.08,
          filter: { type: 'bandpass', freq: 1400, q: 0.8 },
          reverb: 0.2,
        })
      }
    }
    blast(t, 0.12)
    blast(t + 0.19, 0.12)
    blast(t + 0.38, 0.62)
  },
  recordScratch: (c, o, t, p) => {
    const segs = [
      [0, 0.09, 900, 3200],
      [0.1, 0.12, 3000, 500],
      [0.24, 0.08, 700, 2600],
    ] as const
    for (const [d, len, f1, f2] of segs) {
      noise(c, o, t + d, len, { vol: 0.55, filter: { type: 'bandpass', freq: f1 * p, to: f2 * p, q: 6 }, attack: 0.005, decay: 0.03, sustain: 0.8, release: 0.03 })
    }
  },
  rimshot: (c, o, t, p) => {
    tone(c, o, t, 0.08, { type: 'sine', freq: 210 * p, to: 150 * p, vol: 0.55, attack: 0.001, decay: 0.12, sustain: 0.2, release: 0.15 })
    snare(c, o, t, 0.25)
    tone(c, o, t + 0.17, 0.1, { type: 'sine', freq: 150 * p, to: 100 * p, vol: 0.55, attack: 0.001, decay: 0.14, sustain: 0.2, release: 0.18 })
    snare(c, o, t + 0.17, 0.25)
    kick(c, o, t + 0.44, 0.6)
    noise(c, o, t + 0.44, 0.5, { vol: 0.32, filter: { type: 'highpass', freq: 6500 }, attack: 0.001, decay: 0.4, sustain: 0.3, release: 0.9, reverb: 0.3 })
  },
  slideUp: (c, o, t, p) => {
    tone(c, o, t, 0.55, { type: 'sine', freq: 420 * p, to: 1900 * p, sweep: 0.55, vol: 0.4, attack: 0.02, sustain: 0.9, release: 0.08, vibrato: { rate: 9, depth: 18 } })
  },
  slideDown: (c, o, t, p) => {
    tone(c, o, t, 0.6, { type: 'sine', freq: 1800 * p, to: 330 * p, sweep: 0.6, vol: 0.4, attack: 0.02, sustain: 0.9, release: 0.08, vibrato: { rate: 9, depth: 18 } })
  },
  boing: (c, o, t, p) => {
    tone(c, o, t, 0.45, { type: 'triangle', freq: 120 * p, to: 520 * p, sweep: 0.12, vol: 0.55, attack: 0.002, decay: 0.3, sustain: 0.5, release: 0.25, vibrato: { rate: 17, depth: 45 } })
  },
  bonk: (c, o, t, p) => {
    tone(c, o, t, 0.06, { type: 'square', freq: 330 * p, to: 140 * p, sweep: 0.12, vol: 0.4, filter: { type: 'lowpass', freq: 1400 }, attack: 0.001, decay: 0.1, sustain: 0.3, release: 0.12 })
    woodKnock(c, o, t, 260 * p, 0.6)
  },
  slap: (c, o, t, p) => {
    noise(c, o, t, 0.03, { vol: 0.9, filter: { type: 'highpass', freq: 900 * p }, attack: 0.001, decay: 0.03, sustain: 0.2, release: 0.06, reverb: 0.15 })
    tone(c, o, t, 0.02, { type: 'sine', freq: 180, to: 90, vol: 0.4, attack: 0.001, release: 0.05 })
  },
  punch: (c, o, t, p) => {
    kick(c, o, t, 1, 0.9 * p)
    noise(c, o, t, 0.05, { vol: 0.6, filter: { type: 'lowpass', freq: 2200 * p, to: 400 }, attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.1 })
  },
  crash: (c, o, t, p) => {
    noise(c, o, t, 0.2, { vol: 0.45, filter: { type: 'highpass', freq: 4500 * p }, attack: 0.001, decay: 0.5, sustain: 0.4, release: 1.4, reverb: 0.3 })
  },
  explosion: (c, o, t, p) => {
    noise(c, o, t, 0.4, { vol: 0.9, filter: { type: 'lowpass', freq: 2400 * p, to: 90, q: 0.7 }, attack: 0.002, decay: 0.6, sustain: 0.4, release: 1.4, reverb: 0.4 })
    tone(c, o, t, 0.3, { type: 'sine', freq: 85 * p, to: 30, sweep: 1, vol: 0.8, attack: 0.002, decay: 0.6, sustain: 0.3, release: 0.8 })
  },
  fanfare: (c, o, t, p) => {
    const brass = (st: number, m: number, d: number) => {
      for (const det of [-6, 6]) {
        tone(c, o, st, d, { type: 'sawtooth', freq: midiToFreq(m) * p, detune: det, vol: 0.1, attack: 0.03, decay: 0.1, sustain: 0.8, release: 0.15, filter: { type: 'lowpass', freq: 2600, q: 1.5 }, reverb: 0.35 })
      }
    }
    brass(t, 67, 0.1)
    brass(t + 0.13, 67, 0.1)
    brass(t + 0.26, 67, 0.1)
    ;[67, 72, 76].forEach((m) => brass(t + 0.4, m, 0.8))
  },
  tada: (c, o, t, p) => {
    snare(c, o, t, 0.3)
    snare(c, o, t + 0.09, 0.4)
    ;[60, 64, 67, 72, 76].forEach((m) => {
      tone(c, o, t + 0.12, 0.7, { type: 'sawtooth', freq: midiToFreq(m) * p, vol: 0.07, attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.5, filter: { type: 'lowpass', freq: 3000 }, reverb: 0.4 })
      bell(c, o, t + 0.12, m + 12, 1, 0.08)
    })
    noise(c, o, t + 0.12, 0.3, { vol: 0.25, filter: { type: 'highpass', freq: 6000 }, release: 1, reverb: 0.3 })
  },
  drumroll: (c, o, t, p) => {
    const n = 44
    for (let i = 0; i < n; i++) snare(c, o, t + i * 0.035, 0.1 + (i / n) * 0.3 * p)
    kick(c, o, t + n * 0.035, 0.9)
    noise(c, o, t + n * 0.035, 0.3, { vol: 0.45, filter: { type: 'highpass', freq: 5000 }, release: 1.4, reverb: 0.3 })
  },
  sparkle: (c, o, t, p) => {
    const notes = [84, 88, 91, 96, 93, 100]
    notes.forEach((m, i) => bell(c, o, t + i * 0.045, m + 12 * Math.log2(p), 0.4, 0.09, 0.5))
  },
  coin: (c, o, t, p) => {
    tone(c, o, t, 0.06, { type: 'square', freq: 988 * p, vol: 0.14, attack: 0.001, sustain: 0.8, release: 0.02 })
    tone(c, o, t + 0.065, 0.28, { type: 'square', freq: 1319 * p, vol: 0.14, attack: 0.001, decay: 0.2, sustain: 0.4, release: 0.15 })
  },
  chaChing: (c, o, t, p) => {
    noise(c, o, t, 0.05, { vol: 0.3, filter: { type: 'bandpass', freq: 4000, q: 3 }, release: 0.05 })
    bell(c, o, t + 0.08, 93 + 12 * Math.log2(p), 0.9, 0.22)
    bell(c, o, t + 0.08, 100 + 12 * Math.log2(p), 0.9, 0.12)
  },
  powerUp: (c, o, t, p) => {
    for (let i = 0; i < 10; i++) {
      tone(c, o, t + i * 0.04, 0.035, { type: 'square', freq: (300 + i * 90) * p, vol: 0.1, attack: 0.001, sustain: 0.8, release: 0.02 })
    }
  },
  hurt: (c, o, t, p) => {
    tone(c, o, t, 0.25, { type: 'square', freq: 520 * p, to: 120 * p, vol: 0.18, filter: { type: 'lowpass', freq: 1800 }, vibrato: { rate: 30, depth: 40 } })
  },
  partyHorn: (c, o, t, p) => {
    tone(c, o, t, 0.5, { type: 'sawtooth', freq: 320 * p, to: 560 * p, sweep: 0.12, vol: 0.18, attack: 0.02, sustain: 0.9, release: 0.1, vibrato: { rate: 28, depth: 14 }, filter: { type: 'bandpass', freq: 1500, q: 1.2 } })
    noise(c, o, t, 0.5, { vol: 0.08, filter: { type: 'bandpass', freq: 3000, q: 1 }, attack: 0.02 })
  },
  fizz: (c, o, t, p) => {
    noise(c, o, t, 0.9, { vol: 0.32, filter: { type: 'highpass', freq: 5000 * p }, attack: 0.01, decay: 0.4, sustain: 0.5, release: 0.6 })
    for (let i = 0; i < 18; i++) {
      noise(c, o, t + Math.random() * 1.1, 0.004, { vol: 0.25, filter: { type: 'bandpass', freq: 3000 + Math.random() * 5000, q: 4 }, release: 0.01 })
    }
  },
  canOpen: (c, o, t, p) => {
    tone(c, o, t, 0.008, { type: 'square', freq: 2400 * p, vol: 0.2, attack: 0.001, release: 0.01 })
    noise(c, o, t + 0.01, 0.06, { vol: 0.7, filter: { type: 'highpass', freq: 3500 * p }, attack: 0.001, decay: 0.15, sustain: 0.35, release: 0.35 })
  },
  ghost: (c, o, t, p) => {
    tone(c, o, t, 1.3, { type: 'sine', freq: 280 * p, to: 520 * p, sweep: 0.6, vol: 0.32, attack: 0.25, decay: 0.3, sustain: 0.8, release: 0.6, vibrato: { rate: 5, depth: 25 }, reverb: 0.9 })
    tone(c, o, t + 0.6, 0.8, { type: 'sine', freq: 520 * p, to: 230 * p, sweep: 0.8, vol: 0.28, attack: 0.05, sustain: 0.8, release: 0.6, vibrato: { rate: 5, depth: 25 }, reverb: 0.9 })
  },
  roar: (c, o, t, p) => {
    tone(c, o, t, 0.9, { type: 'sawtooth', freq: 95 * p, to: 70 * p, vol: 0.45, attack: 0.04, decay: 0.3, sustain: 0.8, release: 0.3, filter: { type: 'bandpass', freq: 650, q: 1.5 }, vibrato: { rate: 33, depth: 18 } })
    noise(c, o, t, 0.9, { vol: 0.45, filter: { type: 'bandpass', freq: 900 * p, to: 500, q: 1.2 }, attack: 0.05, sustain: 0.7, release: 0.3, reverb: 0.25 })
  },
  guitar: (c, o, t, p) => {
    powerChord(c, o, t, Math.round(40 + 12 * Math.log2(p)), 0.22, 0.26)
    powerChord(c, o, t + 0.26, Math.round(40 + 12 * Math.log2(p)), 1.3, 0.3)
  },
  thunder: (c, o, t, p) => {
    noise(c, o, t, 0.2, { vol: 0.8, filter: { type: 'lowpass', freq: 3000 * p, to: 200 }, attack: 0.001, decay: 0.2, sustain: 0.4, release: 1.6, reverb: 0.5 })
    noise(c, o, t + 0.25, 1.2, { vol: 0.5, filter: { type: 'lowpass', freq: 260 * p }, attack: 0.1, decay: 0.6, sustain: 0.6, release: 1.2 })
  },
  tung: (c, o, t, p) => woodKnock(c, o, t, 420 * p, 0.85),
  tungTriple: (c, o, t, p) => {
    woodKnock(c, o, t, 420 * p, 0.8)
    woodKnock(c, o, t + 0.16, 420 * p, 0.8)
    woodKnock(c, o, t + 0.32, 470 * p, 0.95)
  },
  whistle: (c, o, t, p) => {
    tone(c, o, t, 0.45, { type: 'sine', freq: 2600 * p, vol: 0.2, attack: 0.01, sustain: 0.9, release: 0.05, vibrato: { rate: 38, depth: 90 } })
  },
  step: (c, o, t, p) => {
    noise(c, o, t, 0.02, { vol: 0.35, filter: { type: 'lowpass', freq: 700 * p }, attack: 0.001, decay: 0.03, sustain: 0.2, release: 0.05 })
  },
  jump: (c, o, t, p) => {
    tone(c, o, t, 0.14, { type: 'square', freq: 260 * p, to: 760 * p, sweep: 0.14, vol: 0.13, filter: { type: 'lowpass', freq: 2400 }, attack: 0.002, sustain: 0.8, release: 0.05 })
  },
  land: (c, o, t, p) => {
    kick(c, o, t, 0.45, 0.7 * p)
    noise(c, o, t, 0.03, { vol: 0.25, filter: { type: 'lowpass', freq: 900 }, release: 0.06 })
  },
  heartbeat: (c, o, t, p) => {
    kick(c, o, t, 0.6, 0.6 * p)
    kick(c, o, t + 0.2, 0.45, 0.55 * p)
  },
  glitch: (c, o, t, p) => {
    for (let i = 0; i < 9; i++) {
      tone(c, o, t + i * 0.032, 0.022, { type: i % 2 ? 'square' : 'sawtooth', freq: (200 + Math.random() * 2200) * p, vol: 0.09, attack: 0.001, sustain: 0.9, release: 0.005 })
    }
  },
  zap: (c, o, t, p) => {
    tone(c, o, t, 0.18, { type: 'sawtooth', freq: 1800 * p, to: 90 * p, vol: 0.18, filter: { type: 'lowpass', freq: 3500 }, attack: 0.001, sustain: 0.8, release: 0.04 })
  },
  splat: (c, o, t, p) => {
    noise(c, o, t, 0.12, { vol: 0.7, filter: { type: 'lowpass', freq: 1500 * p, to: 200 }, attack: 0.001, decay: 0.1, sustain: 0.3, release: 0.15 })
    tone(c, o, t, 0.08, { type: 'sine', freq: 300 * p, to: 80, vol: 0.4, attack: 0.001, release: 0.1 })
  },
  stomp: (c, o, t, p) => {
    kick(c, o, t, 1, 0.75 * p)
    noise(c, o, t, 0.08, { vol: 0.5, filter: { type: 'lowpass', freq: 600 }, attack: 0.001, decay: 0.1, sustain: 0.3, release: 0.25, reverb: 0.2 })
  },
  crack: (c, o, t, p) => {
    noise(c, o, t, 0.012, { vol: 0.9, filter: { type: 'highpass', freq: 1800 * p }, attack: 0.0005, decay: 0.01, sustain: 0.1, release: 0.03 })
    noise(c, o, t + 0.025, 0.01, { vol: 0.6, filter: { type: 'bandpass', freq: 2600 * p, q: 3 }, attack: 0.0005, release: 0.02 })
  },
  ribbonZip: (c, o, t, p) => {
    for (let i = 0; i < 7; i++) {
      noise(c, o, t + i * 0.028, 0.012, { vol: 0.3, filter: { type: 'bandpass', freq: (1800 + i * 450) * p, q: 3 }, release: 0.015 })
    }
  },
  wail: (c, o, t, p) => {
    tone(c, o, t, 1.1, { type: 'sawtooth', freq: 520 * p, to: 380 * p, sweep: 1.1, vol: 0.16, attack: 0.04, sustain: 0.9, release: 0.25, vibrato: { rate: 7, depth: 22 }, filter: { type: 'bandpass', freq: 1300, q: 2.5 } })
    tone(c, o, t, 1.1, { type: 'sawtooth', freq: 520 * p, to: 380 * p, sweep: 1.1, vol: 0.1, attack: 0.04, sustain: 0.9, release: 0.25, vibrato: { rate: 7, depth: 22 }, filter: { type: 'bandpass', freq: 2600, q: 3 } })
  },
  dramatic: (c, o, t, p) => {
    const brass = (st: number, m: number, d: number) => {
      for (const det of [-8, 0, 8]) {
        tone(c, o, st, d, { type: 'sawtooth', freq: midiToFreq(m) * p, detune: det, vol: 0.08, attack: 0.02, decay: 0.2, sustain: 0.8, release: 0.4, filter: { type: 'lowpass', freq: 1800, q: 1 }, reverb: 0.45 })
      }
      tone(c, o, st, d, { type: 'sine', freq: midiToFreq(m - 24) * p, vol: 0.25, attack: 0.02, sustain: 0.8, release: 0.4 })
    }
    brass(t, 50, 0.18)
    brass(t + 0.26, 50, 0.18)
    brass(t + 0.52, 45, 1.4)
    kick(c, o, t + 0.52, 0.8)
  },
  crickets: (c, o, t, p) => {
    for (let n = 0; n < 3; n++) {
      for (let i = 0; i < 4; i++) {
        tone(c, o, t + n * 0.55 + i * 0.045, 0.02, { type: 'sine', freq: 4300 * p, vol: 0.09, attack: 0.002, sustain: 0.8, release: 0.01 })
      }
    }
  },
  sadTrombone: (c, o, t, p) => {
    const notes = [58, 57, 56]
    notes.forEach((m, i) =>
      tone(c, o, t + i * 0.42, 0.34, { type: 'sawtooth', freq: midiToFreq(m) * p, vol: 0.17, attack: 0.04, sustain: 0.85, release: 0.08, filter: { type: 'lowpass', freq: 1100, q: 2 } }),
    )
    tone(c, o, t + 1.26, 1.1, { type: 'sawtooth', freq: midiToFreq(55) * p, vol: 0.17, attack: 0.04, sustain: 0.85, release: 0.2, filter: { type: 'lowpass', freq: 1100, q: 2 }, vibrato: { rate: 6, depth: 6 } })
  },
  bubble: (c, o, t, p) => {
    tone(c, o, t, 0.06, { type: 'sine', freq: 300 * p, to: 900 * p, sweep: 0.06, vol: 0.35, attack: 0.002, sustain: 0.6, release: 0.04 })
  },
  shatter: (c, o, t, p) => {
    for (let i = 0; i < 14; i++) bell(c, o, t + Math.random() * 0.25, 88 + Math.random() * 18 + 12 * Math.log2(p), 0.3, 0.06, 0.2)
    noise(c, o, t, 0.05, { vol: 0.55, filter: { type: 'highpass', freq: 3000 }, release: 0.4 })
  },
  chomp: (c, o, t, p) => {
    noise(c, o, t, 0.05, { vol: 0.5, filter: { type: 'bandpass', freq: 900 * p, q: 1.5 }, attack: 0.002, release: 0.05 })
    noise(c, o, t + 0.12, 0.04, { vol: 0.4, filter: { type: 'bandpass', freq: 1100 * p, q: 1.5 }, attack: 0.002, release: 0.05 })
  },
  squeak: (c, o, t, p) => {
    tone(c, o, t, 0.12, { type: 'square', freq: 1400 * p, to: 2100 * p, sweep: 0.06, vol: 0.12, filter: { type: 'bandpass', freq: 2000, q: 3 }, attack: 0.005, sustain: 0.8, release: 0.04 })
  },
  scratchSpin: (c, o, t, p) => {
    noise(c, o, t, 0.55, { vol: 0.4, filter: { type: 'bandpass', freq: 600 * p, to: 4800 * p, q: 7 }, attack: 0.01, sustain: 0.9, release: 0.05 })
    noise(c, o, t + 0.56, 0.25, { vol: 0.4, filter: { type: 'bandpass', freq: 4000 * p, to: 500 * p, q: 7 }, attack: 0.01, sustain: 0.9, release: 0.05 })
  },
  clatter: (c, o, t, p) => {
    ;[0, 0.11, 0.19, 0.25, 0.3].forEach((d, i) => woodKnock(c, o, t + d, (300 - i * 20) * p, 0.7 - i * 0.1))
  },
}

const lastPlayed = new Map<string, number>()
const sampleCache = new Map<string, Promise<AudioBuffer | null>>()

function loadSample(url: string): Promise<AudioBuffer | null> {
  let p = sampleCache.get(url)
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => audio.ctx!.decodeAudioData(b))
      .catch(() => null)
    sampleCache.set(url, p)
  }
  return p
}

/** Happy Birthday (public-domain melody), phrase by phrase. */
const BIRTHDAY_PHRASES: Array<Array<[number, number, number]>> = [
  // [midi, startBeat, lengthBeats] — 3/4 time
  [
    [67, 0, 0.75],
    [67, 0.75, 0.25],
    [69, 1, 1],
    [67, 2, 1],
    [72, 3, 1],
    [71, 4, 2],
  ],
  [
    [67, 0, 0.75],
    [67, 0.75, 0.25],
    [69, 1, 1],
    [67, 2, 1],
    [74, 3, 1],
    [72, 4, 2],
  ],
  [
    [67, 0, 0.75],
    [67, 0.75, 0.25],
    [79, 1, 1],
    [76, 2, 1],
    [72, 3, 1],
    [71, 4, 1],
    [69, 5, 1.5],
  ],
  [
    [77, 0, 0.75],
    [77, 0.75, 0.25],
    [76, 1, 1],
    [72, 2, 1],
    [74, 3, 1],
    [72, 4, 2.5],
  ],
]

export const sfx = {
  /** Play a named effect. Silently does nothing before the first user gesture. */
  play(name: SfxName, opts: SfxOpts = {}) {
    const ctx = audio.ctx
    if (!ctx || !audio.sfxIn || !audio.getState().sfxEnabled) return
    // the tap that resumes a suspended context (first tap, or coming back from a call / app switch)
    // reaches its button a few ms before the context runs again: play this sound as soon as it does
    if (ctx.state !== 'running') return audio.whenRunning(() => sfx.play(name, opts))
    // light anti-spam for very frequent effects
    const minGap = name === 'hover' ? 0.06 : name === 'step' ? 0.05 : 0.012
    const now = ctx.currentTime
    const last = lastPlayed.get(name) ?? -1
    if (now - last < minGap) return
    lastPlayed.set(name, now)

    const out = ctx.createGain()
    out.gain.value = opts.volume ?? 1
    out.connect(audio.sfxIn)
    const t = now + 0.005 + (opts.delay ?? 0)
    const p = opts.pitch ?? 1

    const file = SFX_FILE_OVERRIDES[name]
    if (file) {
      void loadSample(file).then((buf) => {
        if (!buf) return S[name](ctx, out, Math.max(ctx.currentTime, t), p)
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.playbackRate.value = p
        src.connect(out)
        src.start(Math.max(ctx.currentTime, t))
      })
      return
    }
    try {
      S[name](ctx, out, t, p)
    } catch {
      /* never let a sound break the UI */
    }
    // disconnect the per-play gain once everything has finished
    window.setTimeout(() => out.disconnect(), 6000 + (opts.delay ?? 0) * 1000)
  },

  /** Single piano note (midi number). */
  note(midi: number, opts: { volume?: number; delay?: number; dur?: number } = {}) {
    const ctx = audio.ctx
    if (!ctx || ctx.state !== 'running' || !audio.sfxIn || !audio.getState().sfxEnabled) return
    const out = ctx.createGain()
    out.gain.value = opts.volume ?? 1
    out.connect(audio.sfxIn)
    piano(ctx, out, ctx.currentTime + 0.005 + (opts.delay ?? 0), midi, opts.dur ?? 0.9)
    window.setTimeout(() => out.disconnect(), 4000)
  },

  /** Play phrase `i` (0-3, wraps) of Happy Birthday on the piano. Returns the phrase duration in seconds. */
  birthdayPhrase(i: number, opts: { volume?: number; beat?: number } = {}): number {
    const ctx = audio.ctx
    const phrase = BIRTHDAY_PHRASES[((i % 4) + 4) % 4]
    const beat = opts.beat ?? 0.3
    const dur = (phrase[phrase.length - 1][1] + phrase[phrase.length - 1][2]) * beat
    if (!ctx || ctx.state !== 'running' || !audio.sfxIn || !audio.getState().sfxEnabled) return dur
    const out = ctx.createGain()
    out.gain.value = opts.volume ?? 1
    out.connect(audio.sfxIn)
    const t0 = ctx.currentTime + 0.01
    for (const [m, st, len] of phrase) {
      piano(ctx, out, t0 + st * beat, m, Math.max(0.25, len * beat))
      // left-hand root on the downbeats
      if (st === 0 || st === 3) piano(ctx, out, t0 + st * beat, m - 24, 0.9, 0.16)
    }
    window.setTimeout(() => out.disconnect(), (dur + 3) * 1000)
    return dur
  },
}

