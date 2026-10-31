/**
 * Tiny synth toolkit used by the SFX library and the placeholder soundtrack.
 * Every function schedules sound at an absolute AudioContext time `t` into `out`.
 */
import { audio, midiToFreq } from './engine'

export type Dest = AudioNode

export interface Env {
  attack?: number
  decay?: number
  sustain?: number // level 0..1
  release?: number
  peak?: number
}

/** Gain node with an ADSR shape that ends at t + dur + release. */
export function envGain(ctx: BaseAudioContext, t: number, dur: number, env: Env = {}): GainNode {
  const { attack = 0.005, decay = 0.08, sustain = 0.6, release = 0.12, peak = 1 } = env
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + attack)
  g.gain.setTargetAtTime(Math.max(0.0001, peak * sustain), t + attack, Math.max(0.001, decay / 3))
  const end = t + Math.max(dur, attack + 0.005)
  g.gain.setValueAtTime(Math.max(0.0001, peak * sustain), end)
  g.gain.exponentialRampToValueAtTime(0.0001, end + release)
  return g
}

export interface ToneOpts extends Env {
  type?: OscillatorType
  freq: number
  /** end frequency for a pitch sweep */
  to?: number
  /** sweep duration (defaults to dur) */
  sweep?: number
  sweepCurve?: 'exp' | 'lin'
  detune?: number
  vol?: number
  filter?: { type: BiquadFilterType; freq: number; q?: number; to?: number }
  vibrato?: { rate: number; depth: number }
  reverb?: number // 0..1 send
}

/** One oscillator note with envelope, optional sweep / filter / vibrato. */
export function tone(ctx: BaseAudioContext, out: Dest, t: number, dur: number, o: ToneOpts) {
  const osc = ctx.createOscillator()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(Math.max(1, o.freq), t)
  if (o.to !== undefined) {
    const sd = o.sweep ?? dur
    if (o.sweepCurve === 'lin') osc.frequency.linearRampToValueAtTime(Math.max(1, o.to), t + sd)
    else osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + sd)
  }
  if (o.detune) osc.detune.value = o.detune
  if (o.vibrato) {
    const lfo = ctx.createOscillator()
    const lg = ctx.createGain()
    lfo.frequency.value = o.vibrato.rate
    lg.gain.value = o.vibrato.depth
    lfo.connect(lg).connect(osc.frequency)
    lfo.start(t)
    lfo.stop(t + dur + (o.release ?? 0.12) + 0.05)
  }
  const g = envGain(ctx, t, dur, { ...o, peak: (o.peak ?? 1) * (o.vol ?? 0.5) })
  let node: AudioNode = osc
  if (o.filter) {
    const f = ctx.createBiquadFilter()
    f.type = o.filter.type
    f.frequency.setValueAtTime(o.filter.freq, t)
    if (o.filter.to) f.frequency.exponentialRampToValueAtTime(o.filter.to, t + dur)
    f.Q.value = o.filter.q ?? 1
    node.connect(f)
    node = f
  }
  node.connect(g).connect(out)
  if (o.reverb && audio.reverbSend) {
    const s = ctx.createGain()
    s.gain.value = o.reverb
    g.connect(s).connect(audio.reverbSend)
  }
  osc.start(t)
  osc.stop(t + dur + (o.release ?? 0.12) + 0.05)
}

export interface NoiseOpts extends Env {
  vol?: number
  filter?: { type: BiquadFilterType; freq: number; q?: number; to?: number }
  filter2?: { type: BiquadFilterType; freq: number; q?: number }
  rate?: number
  reverb?: number
}

/** Filtered white-noise burst. */
export function noise(ctx: BaseAudioContext, out: Dest, t: number, dur: number, o: NoiseOpts = {}) {
  const buf = audio.noiseBuffer()
  if (!buf) return
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  src.playbackRate.value = o.rate ?? 1
  let node: AudioNode = src
  if (o.filter) {
    const f = ctx.createBiquadFilter()
    f.type = o.filter.type
    f.frequency.setValueAtTime(o.filter.freq, t)
    if (o.filter.to) f.frequency.exponentialRampToValueAtTime(o.filter.to, t + dur)
    f.Q.value = o.filter.q ?? 1
    node.connect(f)
    node = f
  }
  if (o.filter2) {
    const f = ctx.createBiquadFilter()
    f.type = o.filter2.type
    f.frequency.value = o.filter2.freq
    f.Q.value = o.filter2.q ?? 1
    node.connect(f)
    node = f
  }
  const g = envGain(ctx, t, dur, { attack: 0.002, decay: 0.05, sustain: 0.5, release: 0.08, ...o, peak: (o.peak ?? 1) * (o.vol ?? 0.5) })
  node.connect(g).connect(out)
  if (o.reverb && audio.reverbSend) {
    const s = ctx.createGain()
    s.gain.value = o.reverb
    g.connect(s).connect(audio.reverbSend)
  }
  src.start(t, Math.random() * 1.5)
  src.stop(t + dur + (o.release ?? 0.08) + 0.05)
}

/* ------------------------------------------------------------------ */
/* Drum machine                                                        */
/* ------------------------------------------------------------------ */

export function kick(ctx: BaseAudioContext, out: Dest, t: number, vol = 0.9, punch = 1) {
  tone(ctx, out, t, 0.09, { type: 'sine', freq: 150 * punch, to: 42, sweep: 0.11, vol, attack: 0.001, decay: 0.12, sustain: 0.3, release: 0.18 })
  noise(ctx, out, t, 0.01, { vol: vol * 0.25, filter: { type: 'highpass', freq: 3000 }, release: 0.01 })
}

export function snare(ctx: BaseAudioContext, out: Dest, t: number, vol = 0.5) {
  tone(ctx, out, t, 0.05, { type: 'triangle', freq: 230, to: 160, vol: vol * 0.7, attack: 0.001, decay: 0.05, sustain: 0.2, release: 0.08 })
  noise(ctx, out, t, 0.08, { vol, filter: { type: 'highpass', freq: 1400 }, attack: 0.001, decay: 0.06, sustain: 0.25, release: 0.12, reverb: 0.15 })
}

export function clap(ctx: BaseAudioContext, out: Dest, t: number, vol = 0.5) {
  for (let i = 0; i < 3; i++) {
    noise(ctx, out, t + i * 0.011, 0.012, { vol: vol * 0.8, filter: { type: 'bandpass', freq: 1300, q: 1.2 }, attack: 0.001, decay: 0.01, sustain: 0.2, release: 0.02 })
  }
  noise(ctx, out, t + 0.033, 0.08, { vol, filter: { type: 'bandpass', freq: 1200, q: 1 }, attack: 0.001, decay: 0.05, sustain: 0.2, release: 0.15, reverb: 0.25 })
}

export function hat(ctx: BaseAudioContext, out: Dest, t: number, vol = 0.18, open = false) {
  noise(ctx, out, t, open ? 0.12 : 0.015, {
    vol,
    filter: { type: 'highpass', freq: 7500 },
    filter2: { type: 'peaking', freq: 10000, q: 1 },
    attack: 0.001,
    decay: open ? 0.1 : 0.02,
    sustain: open ? 0.3 : 0.1,
    release: open ? 0.12 : 0.03,
  })
}

export function rim(ctx: BaseAudioContext, out: Dest, t: number, vol = 0.3) {
  tone(ctx, out, t, 0.01, { type: 'square', freq: 1700, vol: vol * 0.4, attack: 0.001, decay: 0.01, sustain: 0.1, release: 0.03, filter: { type: 'bandpass', freq: 2000, q: 4 } })
  tone(ctx, out, t, 0.01, { type: 'triangle', freq: 520, vol, attack: 0.001, decay: 0.02, sustain: 0.1, release: 0.04 })
}

/** Woody knock — the "TUNG" of Tung Tung Tung Sahur (kentongan / bamboo slit drum). */
export function woodKnock(ctx: BaseAudioContext, out: Dest, t: number, pitch = 420, vol = 0.6) {
  tone(ctx, out, t, 0.02, { type: 'sine', freq: pitch * 1.6, to: pitch, sweep: 0.03, vol, attack: 0.001, decay: 0.06, sustain: 0.15, release: 0.12, reverb: 0.2 })
  tone(ctx, out, t, 0.015, { type: 'triangle', freq: pitch * 2.76, vol: vol * 0.35, attack: 0.001, decay: 0.03, sustain: 0.1, release: 0.05 })
  noise(ctx, out, t, 0.008, { vol: vol * 0.35, filter: { type: 'bandpass', freq: pitch * 4, q: 2 }, release: 0.02 })
}

/* ------------------------------------------------------------------ */
/* Pitched instruments                                                 */
/* ------------------------------------------------------------------ */

export function bass(ctx: BaseAudioContext, out: Dest, t: number, midi: number, dur: number, vol = 0.4) {
  const f = midiToFreq(midi)
  tone(ctx, out, t, dur, { type: 'sawtooth', freq: f, vol: vol * 0.5, attack: 0.005, decay: 0.1, sustain: 0.6, release: 0.06, filter: { type: 'lowpass', freq: 900, to: 300, q: 4 } })
  tone(ctx, out, t, dur, { type: 'sine', freq: f, vol: vol * 0.7, attack: 0.005, decay: 0.1, sustain: 0.8, release: 0.06 })
}

/** 808 sub with optional glide from another note. */
export function sub808(ctx: BaseAudioContext, out: Dest, t: number, midi: number, dur: number, vol = 0.6, glideFrom?: number) {
  const f = midiToFreq(midi)
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  if (glideFrom !== undefined) {
    osc.frequency.setValueAtTime(midiToFreq(glideFrom), t)
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.09)
  } else {
    osc.frequency.setValueAtTime(f * 1.9, t)
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.04)
  }
  const shaper = ctx.createWaveShaper()
  shaper.curve = softClipCurve(2.2)
  const g = envGain(ctx, t, dur, { attack: 0.004, decay: 0.4, sustain: 0.55, release: 0.25, peak: vol })
  osc.connect(shaper).connect(g).connect(out)
  osc.start(t)
  osc.stop(t + dur + 0.35)
}

export function pluck(ctx: BaseAudioContext, out: Dest, t: number, midi: number, dur = 0.3, vol = 0.25, reverb = 0.3) {
  const f = midiToFreq(midi)
  tone(ctx, out, t, dur * 0.2, { type: 'triangle', freq: f, vol, attack: 0.002, decay: dur * 0.6, sustain: 0.05, release: dur * 0.6, reverb })
  tone(ctx, out, t, dur * 0.1, { type: 'square', freq: f * 2, vol: vol * 0.12, attack: 0.001, decay: 0.05, sustain: 0.05, release: 0.08, filter: { type: 'lowpass', freq: 2400 } })
}

export function bell(ctx: BaseAudioContext, out: Dest, t: number, midi: number, dur = 0.8, vol = 0.18, reverb = 0.45) {
  const f = midiToFreq(midi)
  tone(ctx, out, t, 0.02, { type: 'sine', freq: f, vol, attack: 0.001, decay: dur, sustain: 0.01, release: dur, reverb })
  tone(ctx, out, t, 0.02, { type: 'sine', freq: f * 3.01, vol: vol * 0.3, attack: 0.001, decay: dur * 0.3, sustain: 0.01, release: dur * 0.3, reverb })
  tone(ctx, out, t, 0.02, { type: 'sine', freq: f * 4.2, vol: vol * 0.12, attack: 0.001, decay: dur * 0.15, sustain: 0.01, release: dur * 0.15 })
}

/** Soft electric-piano-ish key. */
export function keys(ctx: BaseAudioContext, out: Dest, t: number, midi: number, dur = 0.5, vol = 0.2, reverb = 0.3) {
  const f = midiToFreq(midi)
  tone(ctx, out, t, dur, { type: 'sine', freq: f, vol, attack: 0.003, decay: 0.6, sustain: 0.25, release: 0.35, reverb })
  tone(ctx, out, t, dur * 0.4, { type: 'sine', freq: f * 2, vol: vol * 0.35, attack: 0.002, decay: 0.2, sustain: 0.05, release: 0.2 })
  tone(ctx, out, t, 0.01, { type: 'triangle', freq: f * 7, vol: vol * 0.05, attack: 0.001, decay: 0.03, sustain: 0.01, release: 0.03 })
}

/** Piano-ish (for the piano sticker). */
export function piano(ctx: BaseAudioContext, out: Dest, t: number, midi: number, dur = 0.9, vol = 0.32) {
  const f = midiToFreq(midi)
  tone(ctx, out, t, 0.02, { type: 'triangle', freq: f, vol, attack: 0.002, decay: dur, sustain: 0.02, release: dur * 0.7, reverb: 0.3 })
  tone(ctx, out, t, 0.02, { type: 'sine', freq: f * 2, vol: vol * 0.4, attack: 0.002, decay: dur * 0.5, sustain: 0.02, release: dur * 0.4 })
  tone(ctx, out, t, 0.01, { type: 'sine', freq: f * 3, vol: vol * 0.15, attack: 0.001, decay: dur * 0.25, sustain: 0.01, release: dur * 0.2 })
  noise(ctx, out, t, 0.006, { vol: vol * 0.12, filter: { type: 'bandpass', freq: 2500, q: 2 }, release: 0.02 })
}

/** Lush detuned pad chord. */
export function pad(ctx: BaseAudioContext, out: Dest, t: number, midis: number[], dur: number, vol = 0.08, reverb = 0.5, cutoff = 1800) {
  for (const m of midis) {
    const f = midiToFreq(m)
    for (const det of [-9, 9]) {
      tone(ctx, out, t, dur, {
        type: 'sawtooth',
        freq: f,
        detune: det,
        vol,
        attack: Math.min(0.5, dur * 0.3),
        decay: 0.4,
        sustain: 0.8,
        release: 0.6,
        filter: { type: 'lowpass', freq: cutoff, q: 0.7 },
        reverb,
      })
    }
  }
}

/** Mono synth lead with a little vibrato. */
export function lead(ctx: BaseAudioContext, out: Dest, t: number, midi: number, dur: number, vol = 0.12, type: OscillatorType = 'square', reverb = 0.35) {
  tone(ctx, out, t, dur, {
    type,
    freq: midiToFreq(midi),
    vol,
    attack: 0.01,
    decay: 0.15,
    sustain: 0.6,
    release: 0.12,
    vibrato: { rate: 5.5, depth: 4 },
    filter: { type: 'lowpass', freq: 3200, q: 1 },
    reverb,
  })
}

/** Overdriven power chord (root + fifth + octave) for the guitar sticker. */
export function powerChord(ctx: BaseAudioContext, out: Dest, t: number, root: number, dur = 1.1, vol = 0.22) {
  const shaper = ctx.createWaveShaper()
  shaper.curve = softClipCurve(18)
  shaper.oversample = '4x'
  const pre = ctx.createGain()
  pre.gain.value = 1
  const cab = ctx.createBiquadFilter()
  cab.type = 'lowpass'
  cab.frequency.value = 3200
  cab.Q.value = 0.8
  const g = envGain(ctx, t, dur, { attack: 0.003, decay: 0.3, sustain: 0.55, release: 0.5, peak: vol })
  pre.connect(shaper).connect(cab).connect(g).connect(out)
  if (audio.reverbSend) {
    const s = ctx.createGain()
    s.gain.value = 0.25
    g.connect(s).connect(audio.reverbSend)
  }
  for (const [i, iv] of [0, 7, 12].entries()) {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = midiToFreq(root + iv)
    o.detune.value = (i - 1) * 6
    const og = ctx.createGain()
    og.gain.value = 0.33
    o.connect(og).connect(pre)
    o.start(t + i * 0.012)
    o.stop(t + dur + 0.6)
  }
}

export function softClipCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount)
  }
  return curve
}
