/**
 * Original procedural placeholder beats — used until the real (purchased) audio files are
 * dropped into /public/music. Each one is ~2 minutes of an ORIGINAL composition generated
 * live with Web Audio (own chords, melodies and basslines; none reproduce the real songs).
 *
 * Every play session gets its own little mix bus:
 *   instruments ─► dry ─────────────┐
 *   pads ─► pump (kick ducking) ─► dry + send ─► reverb ─► glue compressor ─► song gain ─► session
 * so the music's reverb tails also follow the player's volume / fade / pause (nothing leaks
 * into the shared SFX reverb).
 */
import { midiToFreq } from './engine'
import * as K from './synthKit'

export type Bus = 'dry' | 'room' | 'mid' | 'wash'

export interface LeadOpts {
  type?: OscillatorType
  bus?: Bus
  /** glide in from this midi note */
  from?: number
  attack?: number
  cutoff?: number
  /** vibrato depth as a fraction of the pitch (default 0.005) */
  vib?: number
}

export interface Kit {
  kick(t: number, vol?: number, punch?: number): void
  snare(t: number, vol?: number, bus?: Bus): void
  clap(t: number, vol?: number): void
  hat(t: number, vol?: number, open?: boolean): void
  shaker(t: number, vol?: number): void
  rim(t: number, vol?: number): void
  snap(t: number, vol?: number): void
  tom(t: number, midi: number, vol?: number): void
  crash(t: number, vol?: number): void
  riser(t: number, dur: number, vol?: number): void
  cowbell(t: number, vol?: number): void
  bass(t: number, midi: number, dur: number, vol?: number): void
  sub(t: number, midi: number, dur: number, vol?: number, glideFrom?: number): void
  pluck(t: number, midi: number, dur?: number, vol?: number, bus?: Bus): void
  bell(t: number, midi: number, dur?: number, vol?: number): void
  keys(t: number, midi: number, dur?: number, vol?: number): void
  stab(t: number, midis: number[], dur: number, vol?: number, bright?: number): void
  guitar(t: number, midi: number, dur: number, vol?: number): void
  pad(t: number, midis: number[], dur: number, vol?: number, cutoff?: number): void
  choir(t: number, midis: number[], dur: number, vol?: number): void
  lead(t: number, midi: number, dur: number, vol?: number, opts?: LeadOpts): void
  rain(t: number, dur: number, vol?: number): void
  drop(t: number, midi: number, vol?: number): void
  vinyl(t: number, dur: number, vol?: number): void
  /** duck the pads (sidechain feel) */
  pump(t: number, depth?: number): void
}

export interface PlaceholderSong {
  bpm: number
  /** song length in bars of 4/4 (16 sixteenth-steps per bar) */
  bars: number
  /** output trim so the three songs sit at the same loudness */
  gain: number
  /** reverb return level */
  wet: number
  /** Called once per 16th-note step. `t` is the exact AudioContext time of the step. */
  step(i: number, t: number, k: Kit, stepDur: number): void
}

export interface PlaceholderSession {
  kit: Kit
  stop(): void
}

/* ------------------------------------------------------------------ */
/* Mix bus + instruments                                                */
/* ------------------------------------------------------------------ */

const irCache = new WeakMap<BaseAudioContext, AudioBuffer>()

/** y = tanh(2x): slope 2 around zero (undoes the 0.5 pre-gain), saturates softly near full scale. */
const SOFT_CLIP = (() => {
  const n = 2048
  const c = new Float32Array(new ArrayBuffer(n * 4))
  for (let i = 0; i < n; i++) c[i] = Math.tanh(((i * 2) / (n - 1) - 1) * 2)
  return c
})()

/** Warm, dark hall impulse (mono — widened after the convolver): pre-delay, early reflections, damped tail. */
function hallImpulse(ctx: BaseAudioContext): AudioBuffer {
  const cached = irCache.get(ctx)
  if (cached) return cached
  const rate = ctx.sampleRate
  const seconds = 2.2
  const len = Math.floor(rate * seconds)
  const pre = Math.floor(rate * 0.014)
  const buf = ctx.createBuffer(1, len, rate)
  const d = buf.getChannelData(0)
  let lp = 0
  for (let i = pre; i < len; i++) {
    const x = (i - pre) / (len - pre)
    const damp = 0.55 - 0.45 * x // highs die faster than lows
    lp += damp * (Math.random() * 2 - 1 - lp)
    d[i] = lp * Math.exp(-6.2 * x) * 0.9
  }
  for (const [ms, g] of [[19, 0.5], [31, -0.36], [47, 0.28], [63, -0.2]] as const) {
    const at = Math.floor(rate * (ms / 1000))
    if (at < len) d[at] += g
  }
  irCache.set(ctx, buf)
  return buf
}

function makeKit(ctx: BaseAudioContext, input: AudioNode, wetLevel: number): Kit {
  // reverb return: one mono convolution, widened with a short delay on the right side (cheap)
  const verb = ctx.createConvolver()
  verb.channelCount = 1
  verb.channelCountMode = 'explicit'
  verb.buffer = hallImpulse(ctx)
  const wet = ctx.createGain()
  wet.gain.value = wetLevel
  const widen = ctx.createDelay(0.05)
  widen.delayTime.value = 0.017
  const merge = ctx.createChannelMerger(2)
  verb.connect(wet)
  wet.connect(merge, 0, 0)
  wet.connect(widen).connect(merge, 0, 1)
  merge.connect(input)

  /** a mixer channel: dry (optionally panned) + mono reverb send */
  const channel = (send: number, pan = 0) => {
    const g = ctx.createGain()
    if (pan) {
      const p = ctx.createStereoPanner()
      p.pan.value = pan
      g.connect(p).connect(input)
    } else g.connect(input)
    if (send > 0) {
      const s = ctx.createGain()
      s.gain.value = send
      g.connect(s).connect(verb)
    }
    return g
  }
  const bus: Record<Bus, GainNode> = { dry: channel(0), room: channel(0.14), mid: channel(0.3), wash: channel(0.62) }
  const hats = channel(0, 0.28)
  const percL = channel(0.14, -0.38)
  const percR = channel(0.14, 0.34)
  const keysL = channel(0.3, -0.3)
  const keysR = channel(0.3, 0.3)
  // pads run through a ducking gain driven by the kick
  const pumpGain = ctx.createGain()
  const padBus = channel(0.5)
  pumpGain.connect(padBus)
  let flip = false

  const noiseBurst = K.noise
  const tone = K.tone

  return {
    kick(t, vol = 0.85, punch = 1) {
      K.kick(ctx, bus.dry, t, vol, punch)
    },
    snare(t, vol = 0.45, b = 'mid') {
      tone(ctx, bus[b], t, 0.05, { type: 'triangle', freq: 225, to: 158, vol: vol * 0.55, attack: 0.001, decay: 0.05, sustain: 0.2, release: 0.08 })
      noiseBurst(ctx, bus[b], t, 0.07, {
        vol,
        filter: { type: 'highpass', freq: 1600 },
        filter2: { type: 'peaking', freq: 4200, q: 0.8 },
        attack: 0.001,
        decay: 0.06,
        sustain: 0.25,
        release: 0.15,
      })
    },
    clap(t, vol = 0.45) {
      for (let i = 0; i < 3; i++) {
        noiseBurst(ctx, bus.room, t + i * 0.0105, 0.011, { vol: vol * 0.75, filter: { type: 'bandpass', freq: 1250, q: 1.3 }, attack: 0.001, decay: 0.01, sustain: 0.2, release: 0.018 })
      }
      noiseBurst(ctx, bus.mid, t + 0.032, 0.07, { vol, filter: { type: 'bandpass', freq: 1150, q: 0.9 }, attack: 0.001, decay: 0.06, sustain: 0.2, release: 0.16 })
    },
    hat(t, vol = 0.1, open = false) {
      K.hat(ctx, hats, t, vol, open)
    },
    shaker(t, vol = 0.05) {
      noiseBurst(ctx, percL, t, 0.025, { vol, filter: { type: 'bandpass', freq: 7200, q: 1.1 }, attack: 0.012, decay: 0.03, sustain: 0.2, release: 0.04 })
    },
    rim(t, vol = 0.2) {
      K.rim(ctx, bus.room, t, vol)
    },
    snap(t, vol = 0.25) {
      noiseBurst(ctx, percR, t, 0.012, { vol, filter: { type: 'bandpass', freq: 2300, q: 3.5 }, attack: 0.001, decay: 0.02, sustain: 0.15, release: 0.06 })
      tone(ctx, percR, t, 0.008, { type: 'sine', freq: 1650, vol: vol * 0.35, attack: 0.001, decay: 0.02, sustain: 0.1, release: 0.03 })
    },
    tom(t, midi, vol = 0.35) {
      const f = midiToFreq(midi)
      tone(ctx, bus.mid, t, 0.14, { type: 'sine', freq: f * 1.7, to: f, sweep: 0.07, vol, attack: 0.002, decay: 0.2, sustain: 0.25, release: 0.25 })
      noiseBurst(ctx, bus.mid, t, 0.01, { vol: vol * 0.25, filter: { type: 'lowpass', freq: 2000 }, release: 0.03 })
    },
    crash(t, vol = 0.09) {
      noiseBurst(ctx, bus.room, t, 1.0, {
        vol,
        filter: { type: 'highpass', freq: 4200 },
        filter2: { type: 'peaking', freq: 8500, q: 0.7 },
        attack: 0.001,
        decay: 0.9,
        sustain: 0.05,
        release: 0.9,
      })
    },
    riser(t, dur, vol = 0.06) {
      noiseBurst(ctx, bus.wash, t, dur, { vol, filter: { type: 'bandpass', freq: 350, q: 2.2, to: 6500 }, attack: dur * 0.92, decay: 0.05, sustain: 1, release: 0.06 })
    },
    cowbell(t, vol = 0.06) {
      for (const f of [562, 845]) {
        tone(ctx, percL, t, 0.02, { type: 'square', freq: f, vol: vol * 0.5, attack: 0.001, decay: 0.12, sustain: 0.05, release: 0.12, filter: { type: 'bandpass', freq: 900, q: 1.6 } })
      }
    },
    bass(t, midi, dur, vol = 0.3) {
      K.bass(ctx, bus.dry, t, midi, dur, vol)
    },
    sub(t, midi, dur, vol = 0.5, glideFrom) {
      K.sub808(ctx, bus.dry, t, midi, dur, vol, glideFrom)
    },
    pluck(t, midi, dur = 0.3, vol = 0.14, b = 'mid') {
      K.pluck(ctx, bus[b], t, midi, dur, vol, 0)
    },
    bell(t, midi, dur = 0.9, vol = 0.06) {
      K.bell(ctx, bus.wash, t, midi, dur, vol, 0)
    },
    keys(t, midi, dur = 0.5, vol = 0.1) {
      K.keys(ctx, midi % 2 ? keysL : keysR, t, midi, dur, vol, 0)
    },
    stab(t, midis, dur, vol = 0.05, bright = 2600) {
      for (const [j, m] of midis.entries()) {
        tone(ctx, j % 2 ? keysL : keysR, t, dur, {
          type: 'sawtooth',
          freq: midiToFreq(m),
          vol,
          attack: 0.003,
          decay: 0.1,
          sustain: 0.35,
          release: 0.07,
          filter: { type: 'lowpass', freq: bright, to: 520, q: 2.2 },
        })
      }
    },
    guitar(t, midi, dur, vol = 0.1) {
      const f = midiToFreq(midi)
      flip = !flip
      const ch = flip ? keysL : keysR
      for (const det of [-6, 6]) {
        tone(ctx, ch, t, dur * 0.25, { type: 'triangle', freq: f, detune: det, vol: vol * 0.6, attack: 0.002, decay: dur * 0.7, sustain: 0.06, release: dur * 0.6 })
      }
      tone(ctx, ch, t, 0.02, { type: 'sine', freq: f * 2, vol: vol * 0.22, attack: 0.001, decay: 0.12, sustain: 0.05, release: 0.15 })
    },
    pad(t, midis, dur, vol = 0.026, cutoff = 1700) {
      K.pad(ctx, pumpGain, t, midis, dur, vol, 0, cutoff)
    },
    choir(t, midis, dur, vol = 0.02) {
      for (const m of midis) {
        const f = midiToFreq(m)
        tone(ctx, bus.wash, t, dur, {
          type: 'sawtooth',
          freq: f,
          vol,
          attack: Math.min(0.6, dur * 0.3),
          decay: 0.5,
          sustain: 0.85,
          release: 0.9,
          filter: { type: 'lowpass', freq: 1050, q: 5 },
          vibrato: { rate: 4.7, depth: f * 0.0045 },
        })
      }
    },
    lead(t, midi, dur, vol = 0.07, o = {}) {
      const f = midiToFreq(midi)
      tone(ctx, bus[o.bus ?? 'mid'], t, dur, {
        type: o.type ?? 'triangle',
        freq: o.from !== undefined ? midiToFreq(o.from) : f,
        to: o.from !== undefined ? f : undefined,
        sweep: 0.07,
        vol,
        attack: o.attack ?? 0.012,
        decay: 0.18,
        sustain: 0.72,
        release: 0.2,
        vibrato: { rate: 5.1, depth: f * (o.vib ?? 0.005) },
        filter: { type: 'lowpass', freq: o.cutoff ?? 3000, q: 0.8 },
      })
    },
    rain(t, dur, vol = 0.035) {
      for (const ch of [percL, percR])
        noiseBurst(ctx, ch, t, dur, {
          vol: vol * 0.75,
          filter: { type: 'lowpass', freq: 3200, q: 0.3 },
          filter2: { type: 'highpass', freq: 420 },
          attack: dur * 0.25,
          decay: 0.1,
          sustain: 1,
          release: dur * 0.25,
        })
    },
    drop(t, midi, vol = 0.02) {
      const f = midiToFreq(midi)
      tone(ctx, bus.wash, t, 0.01, { type: 'sine', freq: f, to: f * 1.5, sweep: 0.03, vol, attack: 0.001, decay: 0.05, sustain: 0.05, release: 0.06 })
    },
    vinyl(t, dur, vol = 0.016) {
      noiseBurst(ctx, bus.dry, t, dur, { vol, filter: { type: 'bandpass', freq: 3500, q: 0.6 }, attack: 0.08, sustain: 1, release: 0.08 })
    },
    pump(t, depth = 0.45) {
      const g = pumpGain.gain
      g.setTargetAtTime(1 - depth, t, 0.004)
      g.setTargetAtTime(1, t + 0.03, 0.085)
    },
  }
}

/** Build a play session: own mix bus feeding `out`. stop() fades it out and frees it. */
export function startPlaceholderSession(ctx: BaseAudioContext, out: AudioNode, song: PlaceholderSong): PlaceholderSession {
  const session = ctx.createGain()
  const now = ctx.currentTime
  session.gain.setValueAtTime(0, now)
  session.gain.linearRampToValueAtTime(1, now + 0.04)
  const trim = ctx.createGain()
  trim.gain.value = song.gain
  const glue = ctx.createDynamicsCompressor()
  glue.threshold.value = -15
  glue.knee.value = 10
  glue.ratio.value = 2.6
  glue.attack.value = 0.008
  glue.release.value = 0.2
  // gentle soft-clip: unity gain for normal levels, rounds off the odd transient peak
  const pre = ctx.createGain()
  pre.gain.value = 0.5
  const clip = ctx.createWaveShaper()
  clip.curve = SOFT_CLIP
  clip.oversample = '2x'
  glue.connect(trim).connect(pre).connect(clip).connect(session).connect(out)
  const kit = makeKit(ctx, glue, song.wet)
  let stopped = false
  return {
    kit,
    stop() {
      if (stopped) return
      stopped = true
      const t = ctx.currentTime
      session.gain.cancelScheduledValues(t)
      session.gain.setValueAtTime(session.gain.value, t)
      session.gain.setTargetAtTime(0, t, 0.015)
      if (typeof window !== 'undefined') window.setTimeout(() => session.disconnect(), 300)
    },
  }
}

const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

type Note = [step: number, midi: number, len: number]
const at = (notes: Note[], s: number) => notes.find((n) => n[0] === s)

/* ------------------------------------------------------------------ */
/* E85 placeholder — "Neon Fuel": hazy, melodic half-time trap, F# minor */
/* ------------------------------------------------------------------ */
// F#m9 → Dmaj9 → Bm9 → C#7 (smooth inner voice-leading)
const NF_CHORDS = [
  [57, 61, 64, 68],
  [57, 61, 64, 66],
  [57, 61, 62, 66],
  [56, 59, 65, 68],
]
const NF_ROOTS = [42, 38, 35, 37]
const NF_MOTIF: Note[][] = [
  [[0, 73, 3], [3, 76, 3], [6, 78, 4], [10, 76, 2], [12, 73, 4]],
  [[2, 78, 2], [4, 76, 2], [6, 73, 2], [8, 76, 6]],
  [[0, 74, 3], [3, 78, 3], [6, 81, 4], [10, 78, 2], [12, 76, 4]],
  [[0, 77, 4], [4, 80, 3], [7, 77, 3], [10, 73, 6]],
]
const NF_LEAD: Note[][] = [
  [[0, 85, 6], [6, 83, 4], [10, 81, 6]],
  [[0, 81, 10], [12, 80, 4]],
  [[0, 78, 6], [6, 81, 4], [10, 83, 6]],
  [[0, 80, 8], [8, 77, 8]],
]

const neonFuel: PlaceholderSong = {
  bpm: 140,
  bars: 72,
  gain: 0.9,
  wet: 0.55,
  step(i, t, k, sd) {
    const bar = i >> 4
    const s = i & 15
    const ci = bar % 4
    const chord = NF_CHORDS[ci]
    const root = NF_ROOTS[ci]
    const intro = bar < 4
    const verse1 = bar >= 4 && bar < 20
    const hook1 = bar >= 20 && bar < 28
    const brk = bar >= 28 && bar < 32
    const verse2 = bar >= 32 && bar < 48
    const hook2 = bar >= 48 && bar < 56
    const glow = bar >= 56 && bar < 64
    const hook3 = bar >= 64 && bar < 68
    const outro = bar >= 68
    const last = bar === 71
    const hook = hook1 || hook2 || hook3
    const verse = verse1 || verse2

    // harmony bed
    if (s === 0) {
      if (last) k.pad(t, [54, ...NF_CHORDS[0]], sd * 12, 0.03, 1200)
      else {
        const cutoff = intro ? 900 + bar * 420 : brk ? 1300 : outro ? 2100 - (bar - 68) * 380 : hook ? 2600 : glow ? 1500 : 1900
        k.pad(t, chord, sd * 16, intro || brk ? 0.036 : hook ? 0.032 : 0.03, cutoff)
      }
      if (bar % 2 === 0 && !last) k.vinyl(t, sd * 32)
    }

    // the plucked hook motif
    const m = at(NF_MOTIF[ci], s)
    if (m && !last) {
      const drop = verse2 && bar % 8 >= 4 ? -12 : 0
      const vol = intro || outro ? 0.17 : brk || glow ? 0.17 : hook ? 0.2 : 0.18
      k.pluck(t, m[1] + drop, sd * (m[2] + 1), vol, intro || brk || outro ? 'wash' : 'mid')
      if ((hook || verse2) && m[2] >= 3) k.bell(t, m[1] + 12, 1.1, hook ? 0.05 : 0.03)
    }

    // airy counter-melody
    if (hook || brk || glow) {
      const n = at(NF_LEAD[ci], s)
      if (n) k.lead(t, n[1] - (glow ? 12 : 0), sd * n[2], hook ? 0.08 : 0.07, { bus: 'wash', attack: 0.06, cutoff: 2800 })
    }

    // transitions
    if (s === 0 && [4, 20, 32, 48, 64].includes(bar)) k.crash(t)
    if ((bar === 3 || bar === 31) && s === 0) k.riser(t, sd * 16, 0.07)
    if ((bar === 19 || bar === 47 || bar === 63) && s === 8) k.riser(t, sd * 8, 0.06)

    if (intro || outro) {
      if (bar >= 2 && !last && s % 4 === 2) k.hat(t, 0.07)
      if (bar >= 2 && bar < 70 && s === 0) k.kick(t, 0.38)
      return
    }
    if (brk) {
      if (s % 4 === 2) k.hat(t, 0.07)
      if (s === 0) k.sub(t, root, sd * 12, 0.17)
      return
    }

    // kick + 808
    const busy = bar % 2 === 1
    if (glow) {
      if (s === 0) {
        k.kick(t, 0.6)
        k.pump(t, 0.35)
        k.sub(t, root, sd * 10, 0.2)
      }
    } else if (s === 0 || s === 10 || (busy && s === 7)) {
      k.kick(t, s === 0 ? 0.68 : 0.56)
      k.pump(t, s === 0 ? 0.45 : 0.3)
      const glide = s === 10 && ci === 3 && busy ? root - 5 : undefined
      k.sub(t, root, sd * (s === 0 ? (busy ? 5 : 7) : s === 7 ? 2 : 4), 0.22, glide)
    }
    if (hook && ci === 3 && s === 14) k.sub(t, root + 12, sd * 2, 0.16, root)

    // backbeat (beat 3 in half-time)
    if (s === 8) {
      k.clap(t, glow ? 0.34 : 0.44)
      if (hook) k.snare(t, 0.2, 'room')
    }

    // hats: 8ths with accents, rolls at phrase ends
    const roll = ci === 3 && s >= 12 && !glow
    if (roll) {
      const n = verse2 || hook2 ? 3 : 2
      for (let j = 0; j < n; j++) k.hat(t + (j * sd) / n, 0.17 + j * 0.035)
    } else if (s % 2 === 0) {
      k.hat(t, s % 4 === 0 ? 0.26 : 0.17)
    } else if ((verse2 || hook) && rand(i) > 0.7) k.hat(t, 0.12)
    if (hook && s === 14 && busy) k.hat(t, 0.15, true)

    // ear candy
    if (verse1 && bar >= 12 && (s === 3 || s === 11)) k.rim(t, 0.14)
    if (verse2 && (s === 0 || s === 6) && bar % 2 === 0) chord.slice(1).forEach((n) => k.keys(t, n, sd * 3, 0.06))
    if (verse && s === 15 && ci === 1) k.snap(t, 0.2)
  },
}

/* ------------------------------------------------------------------ */
/* Purple Rain placeholder — "Lavender Downpour": slow-burn ballad in Bb */
/* ------------------------------------------------------------------ */
// Bbmaj9 → Dm7 → Ebmaj9 → F9sus (arpeggio voicings, low → high)
const LD_ARP = [
  [46, 53, 57, 60, 62],
  [50, 57, 60, 65, 69],
  [51, 58, 62, 65, 67],
  [53, 58, 60, 63, 67],
]
const LD_ARP_ORDER = [0, 2, 3, 4, 3, 2, 1, 2]
const LD_PAD = [
  [57, 62, 65],
  [57, 60, 65],
  [58, 62, 67],
  [58, 63, 67],
]
const LD_ROOTS = [34, 38, 39, 41]
const LD_MELODY: Note[][] = [
  [[0, 74, 6], [6, 72, 2], [8, 70, 8]],
  [[0, 69, 4], [4, 72, 4], [8, 77, 8]],
  [[0, 79, 6], [6, 77, 2], [8, 74, 8]],
  [[0, 75, 6], [6, 74, 2], [8, 72, 7]],
]
const LD_SOLO: Note[][] = [
  [[0, 77, 10], [10, 79, 6]],
  [[0, 81, 14]],
  [[0, 82, 8], [8, 81, 4], [12, 79, 4]],
  [[0, 77, 6], [6, 75, 4], [10, 77, 6]],
]

const lavenderDownpour: PlaceholderSong = {
  bpm: 72,
  bars: 36,
  gain: 1.3,
  wet: 0.7,
  step(i, t, k, sd) {
    const bar = i >> 4
    const s = i & 15
    const ci = bar % 4
    const arp = LD_ARP[ci]
    const root = LD_ROOTS[ci]
    const intro = bar < 4
    const chorus = bar >= 12 && bar < 20
    const solo = bar >= 20 && bar < 28
    const final = bar >= 28 && bar < 32
    const outro = bar >= 32
    const last = bar === 35
    const big = chorus || final

    // rain bed (overlapping swells) + the odd droplet
    if (s === 0 && bar % 2 === 0 && !last) k.rain(t, sd * 40, big ? 0.03 : 0.04)
    if (!last && rand(i * 7.31) > (intro ? 0.82 : 0.9)) k.drop(t + rand(i * 3.1) * sd, 88 + Math.floor(rand(i) * 10), 0.03)

    if (last) {
      if (s === 0) {
        LD_ARP[0].forEach((n, j) => k.guitar(t + j * 0.045, n + 12, sd * 14, 0.13))
        k.pad(t, LD_PAD[0], sd * 14, 0.026, 1100)
        k.bass(t, LD_ROOTS[0] + 12, sd * 12, 0.12)
      }
      return
    }

    // pads + choir
    if (s === 0) {
      k.pad(t, LD_PAD[ci], sd * 16, big ? 0.03 : 0.026, big ? 2200 : 1400)
      if (big || solo) k.choir(t, LD_PAD[ci].map((n) => n + 12), sd * 15.5, big ? 0.026 : 0.02)
    }

    // clean guitar arpeggio (8ths; 16th pickups in the big sections)
    if (s % 2 === 0) {
      const n = arp[LD_ARP_ORDER[(s / 2) % 8]] + 12
      k.guitar(t, n, sd * 5, 0.15)
    } else if (big && (s === 7 || s === 15)) k.guitar(t, arp[4] + 12, sd * 2, 0.08)
    if ((intro || outro) && (s === 4 || s === 12) && rand(i) > 0.4) k.bell(t, arp[2 + Math.floor(rand(i * 2) * 3)] + 24, 1.6, 0.05)

    if (intro) return

    // bass
    if (s === 0) k.bass(t, root + 12, sd * 9, 0.13)
    if (s === 10) k.bass(t, root + 19, sd * 4, 0.09)
    if (s === 14 && !outro) k.bass(t, LD_ROOTS[(ci + 1) % 4] + 11, sd * 2, 0.07)

    // drums
    if (outro) {
      if (s === 0 && bar < 34) k.kick(t, 0.36)
      if (s === 8 && bar < 34) k.rim(t, 0.14)
      return
    }
    if (s === 0) {
      k.kick(t, 0.46)
      k.pump(t, 0.2)
    }
    if (s === 10 && (big || solo || bar % 2 === 1)) k.kick(t, 0.3)
    if (s === 4 || s === 12) {
      if (big || solo) {
        k.snare(t, 0.36, 'wash')
        k.clap(t, 0.16)
      } else k.rim(t, 0.18)
    }
    if (s % 2 === 0) k.shaker(t, s % 4 === 0 ? 0.1 : 0.07)
    if ((big || solo) && s % 4 === 2) k.hat(t, 0.11)
    if (s === 0 && [12, 20, 28].includes(bar)) k.crash(t, 0.1)

    // tom fill into each section
    if ((bar === 11 || bar === 19 || bar === 27) && s >= 12) k.tom(t, [57, 53, 50, 45][s - 12], 0.3)

    // lead vocal-ish melody / solo
    if (big) {
      const n = at(LD_MELODY[ci], s)
      if (n) k.lead(t, n[1], sd * n[2], 0.1, { attack: 0.03, cutoff: 2600, from: n[1] - 1 })
    }
    if (solo) {
      const n = at(LD_SOLO[ci], s)
      if (n) k.lead(t, n[1], sd * n[2], 0.075, { type: 'sawtooth', attack: 0.06, cutoff: 2200, vib: 0.008, from: n[1] - 2, bus: 'wash' })
    }
  },
}

/* ------------------------------------------------------------------ */
/* Billie Jean placeholder — "Moonwalk Static": 80s drum-machine funk, G minor */
/* ------------------------------------------------------------------ */
const MW_CHORDS = {
  gm: [58, 62, 65, 69], // Gm9
  cm: [58, 62, 63, 67], // Cm9
  eb: [58, 62, 65, 67], // Ebmaj9
  d7: [54, 60, 65, 69], // D7#9
}
type MwChord = keyof typeof MW_CHORDS
const MW_ROOT: Record<MwChord, number> = { gm: 43, cm: 48, eb: 39, d7: 38 }
const MW_GROOVE: MwChord[] = ['gm', 'gm', 'cm', 'gm']
const MW_HOOK: MwChord[] = ['gm', 'cm', 'eb', 'd7']
// [step, interval from root, length in steps] — syncopated 16ths with octave pops
const MW_BASS_A: Note[] = [[0, 0, 3], [3, 0, 1], [6, 12, 1], [7, 10, 1], [10, 7, 2], [12, 0, 1], [14, 3, 1], [15, 5, 1]]
const MW_BASS_B: Note[] = [[0, 0, 2], [2, 12, 1], [4, 0, 1], [6, 7, 2], [9, 10, 1], [10, 12, 1], [11, 10, 1], [12, 7, 2], [14, 5, 1]]
const MW_LEAD: Note[][] = [
  [[0, 74, 2], [2, 77, 2], [4, 79, 3], [8, 77, 1], [9, 74, 2], [12, 70, 2], [14, 72, 2]],
  [[0, 75, 3], [4, 74, 2], [6, 72, 2], [8, 70, 4], [13, 67, 3]],
  [[0, 79, 3], [4, 77, 2], [6, 74, 2], [8, 75, 3], [12, 74, 2], [14, 70, 2]],
  [[0, 69, 4], [6, 72, 2], [8, 78, 6]],
]

const moonwalkStatic: PlaceholderSong = {
  bpm: 116,
  bars: 60,
  gain: 1.0,
  wet: 0.45,
  step(i, t, k, sd) {
    const bar = i >> 4
    const s = i & 15
    const intro = bar < 4
    const hook = (bar >= 12 && bar < 20) || (bar >= 32 && bar < 40) || (bar >= 48 && bar < 56)
    const grooveB = bar >= 20 && bar < 28
    const brk = bar >= 28 && bar < 32
    const outro = bar >= 56
    const last = bar === 59
    const ch: MwChord = hook ? MW_HOOK[bar % 4] : MW_GROOVE[bar % 4]
    const chord = MW_CHORDS[ch]
    const root = MW_ROOT[ch]

    if (last) {
      if (s === 0) {
        k.stab(t, MW_CHORDS.gm, sd * 6, 0.06, 3000)
        k.bass(t, MW_ROOT.gm, sd * 8, 0.2)
        k.kick(t, 0.7)
        k.crash(t, 0.09)
      }
      return
    }

    // drum machine
    const kick = s === 0 || s === 8 || ((grooveB || hook) && s === 10 && bar % 2 === 1)
    if (kick && !brk) {
      k.kick(t, s === 0 ? 0.72 : 0.64)
      k.pump(t, 0.3)
    }
    if (!intro && !brk && (s === 4 || s === 12)) {
      k.snare(t, 0.42, 'room')
      if (hook || grooveB) k.clap(t, 0.26)
    }
    if (s % 2 === 0) k.hat(t, s % 4 === 2 ? 0.15 : 0.09)
    else if (hook || grooveB) k.hat(t, 0.055)
    if (s === 14 && bar % 2 === 1 && !brk) k.hat(t, 0.1, true)
    if ((hook || intro) && s % 2 === 1) k.shaker(t, 0.06)
    if (brk && (s === 4 || s === 12)) k.snap(t, 0.32)
    if (grooveB && (s === 3 || s === 11) && bar % 2 === 0) k.cowbell(t, 0.07)
    if (s === 0 && [4, 12, 20, 32, 40, 48].includes(bar)) k.crash(t, 0.085)
    if ((bar === 3 || bar === 31) && s === 0) k.riser(t, sd * 16, 0.05)
    if ((bar === 11 || bar === 47) && s >= 12) k.tom(t, [62, 59, 55, 50][s - 12], 0.26)

    // stabs: "chk" on the off-beats (filter opens through the intro)
    if (s === 2 || s === 5 || s === 10 || s === 13) {
      const bright = intro ? 700 + bar * 450 : brk ? 1200 : hook ? 3000 : 2400
      if (!(brk && s === 5)) k.stab(t, chord, sd * 0.9, intro ? 0.06 : 0.055, bright)
    }

    if (intro) return

    // bass
    const pattern = grooveB || (hook && bar % 4 >= 2) ? MW_BASS_B : MW_BASS_A
    const b = at(pattern, s)
    if (b) k.bass(t, root + b[1], sd * b[2] * 0.85, b[1] >= 12 ? 0.15 : 0.19)

    // pads / hook lead / counter bells
    if (hook && s === 0) k.pad(t, chord.map((n) => n + 12), sd * 16, 0.024, 1700)
    if (brk && s === 0) k.pad(t, chord, sd * 16, 0.03, 1000 + (bar - 28) * 300)
    if (hook) {
      const n = at(MW_LEAD[bar % 4], s)
      if (n) k.lead(t, n[1], sd * n[2] * 0.9, 0.075, { type: 'square', cutoff: 2800, vib: 0.003 })
      if (bar >= 32 && n && n[2] >= 3) k.bell(t, n[1] + 12, 0.7, 0.05)
    }
    if (grooveB && (s === 7 || s === 15)) k.keys(t, chord[3] + 12, sd * 1.5, 0.07)
    if (outro && s === 0) k.pad(t, chord, sd * 16, 0.026, 1500 - (bar - 56) * 250)
  },
}

/* ------------------------------------------------------------------ */
/* Thriller placeholder — "Graveyard Shift": spooky synth-funk, C# minor */
/* ------------------------------------------------------------------ */
const GS_CHORDS = [
  [61, 64, 68, 71], // C#m7
  [61, 64, 68, 71],
  [57, 61, 64, 68], // Amaj7
  [59, 63, 66, 69], // B7-ish
]
const GS_ROOT = [37, 37, 33, 35]
// [step, interval from root, length] — a creeping, original 16th line
const GS_BASS: Note[] = [[0, 0, 2], [3, 0, 1], [4, 7, 2], [7, 10, 1], [8, 12, 2], [11, 10, 1], [12, 7, 2], [14, 3, 2]]
const GS_BELLS: Note[] = [[0, 85, 3], [4, 88, 3], [8, 83, 4], [14, 80, 2]]

const graveyardShift: PlaceholderSong = {
  bpm: 118,
  bars: 48,
  gain: 1.0,
  wet: 0.55,
  step(i, t, k, sd) {
    const bar = i >> 4
    const s = i & 15
    const intro = bar < 4
    const brk = bar >= 24 && bar < 28
    const last = bar === 47
    const chord = GS_CHORDS[bar % 4]
    const root = GS_ROOT[bar % 4]

    if (last) {
      if (s === 0) {
        k.choir(t, GS_CHORDS[0], sd * 12, 0.05)
        k.bass(t, GS_ROOT[0], sd * 8, 0.2)
        k.kick(t, 0.7)
        k.crash(t, 0.09)
      }
      return
    }
    // creaky intro: choir swell, a bell, a lonely heartbeat kick
    if (s === 0 && (intro || brk)) k.choir(t, chord, sd * 16, 0.04)
    if (intro) {
      if (s === 0 || s === 3) k.kick(t, 0.5)
      if (s === 8 && bar % 2 === 1) k.bell(t, 85, 1.2, 0.06)
      if (bar === 3 && s === 0) k.riser(t, sd * 16, 0.05)
      return
    }
    if (!brk) {
      if (s === 0 || s === 8) {
        k.kick(t, 0.7)
        k.pump(t, 0.25)
      }
      if (s === 4 || s === 12) {
        k.snare(t, 0.4, 'room')
        k.clap(t, 0.2)
      }
      if (s % 2 === 0) k.hat(t, s % 4 === 2 ? 0.13 : 0.08)
      if (s === 14 && bar % 2 === 1) k.hat(t, 0.1, true)
      const b = at(GS_BASS, s)
      if (b) k.bass(t, root + b[1], sd * b[2] * 0.85, 0.19)
      if (s === 2 || s === 10) k.stab(t, chord, sd * 0.8, 0.05, 2200)
    } else if (s === 0 || s === 8) k.snap(t, 0.3)
    if (s === 0 && [4, 12, 28, 36].includes(bar)) k.crash(t, 0.08)
    if (bar >= 12 && bar % 8 < 4) {
      const n = at(GS_BELLS, s)
      if (n) k.bell(t, n[1], 0.5 + n[2] * 0.12, 0.05)
    }
    if (bar >= 28 && s === 0) k.pad(t, chord.map((n) => n + 12), sd * 16, 0.022, 1500)
  },
}

export const PLACEHOLDER_SONGS: Record<string, PlaceholderSong> = {
  e85: neonFuel,
  'purple-rain': lavenderDownpour,
  'billie-jean': moonwalkStatic,
  thriller: graveyardShift,
}

/** Display names for the placeholder beats. */
export const PLACEHOLDER_NAMES: Record<string, string> = {
  e85: 'Neon Fuel',
  'purple-rain': 'Lavender Downpour',
  'billie-jean': 'Moonwalk Static',
  thriller: 'Graveyard Shift',
}
