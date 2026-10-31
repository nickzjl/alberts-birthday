/**
 * Scene-specific synth sounds for Peter's present (built from the shared synth kit).
 * Every function silently no-ops before the first user gesture.
 */
import { audio, midiToFreq } from '../../audio/engine'
import { bass, clap, hat, kick, keys, noise, snare, tone } from '../../audio/synthKit'

function out(volume = 1, life = 6000) {
  const ctx = audio.ctx
  if (!ctx || ctx.state !== 'running' || !audio.sfxIn || !audio.getState().sfxEnabled) return null
  const g = ctx.createGain()
  g.gain.value = volume
  g.connect(audio.sfxIn)
  window.setTimeout(() => g.disconnect(), life)
  return { ctx, g, t: ctx.currentTime + 0.01 }
}

/**
 * Dip (or restore, level 1) the whole music bus. Unlike soundtrack.fadeOut this neither pauses the
 * soundtrack nor changes its state (the player keeps saying what's spinning) — it just gets out of
 * the way of the dance beat / drumroll. Callers must restore it (the scene does on unmount).
 */
export function duckMusic(level: number, seconds = 0.25) {
  const ctx = audio.ctx
  const bus = audio.musicBus
  if (!ctx || !bus) return
  const g = bus.gain
  const t = ctx.currentTime
  g.cancelScheduledValues(t)
  g.setValueAtTime(g.value, t)
  g.linearRampToValueAtTime(level, t + Math.max(0.02, seconds))
}

/** Two bars of an original goofy funk groove for Peter's birthday dance. Returns seconds. */
export function danceBeat(): number {
  const bpm = 138
  const beat = 60 / bpm
  const dur = beat * 8
  const o = out(0.9, (dur + 2) * 1000)
  if (!o) return dur
  const { ctx, g, t } = o
  const s = beat / 2
  for (let i = 0; i < 16; i++) {
    const at = t + i * s
    if (i % 2 === 0) kick(ctx, g, at, 0.75)
    else hat(ctx, g, at, 0.14, i % 4 === 3)
    if (i % 4 === 2) clap(ctx, g, at, 0.42)
  }
  // bouncy octave bass (F → A♭ → B♭ → C)
  const line = [41, 53, 41, 53, 44, 56, 44, 56, 46, 58, 46, 58, 48, 60, 48, 51]
  line.forEach((m, i) => bass(ctx, g, t + i * s, m, s * 0.8, 0.32))
  // brassy-ish stabs on the off-beats
  ;[
    [1.5, [65, 68, 72]],
    [3.5, [68, 72, 75]],
    [5.5, [70, 74, 77]],
    [7, [72, 76, 79]],
  ].forEach(([b, chord]) => {
    for (const m of chord as number[]) keys(ctx, g, t + (b as number) * beat, m, beat * 0.4, 0.09, 0.2)
  })
  // little "hey!" whistle on the last beat
  tone(ctx, g, t + beat * 7.5, 0.18, { type: 'sine', freq: midiToFreq(84), to: midiToFreq(91), vol: 0.12, attack: 0.01, release: 0.1, vibrato: { rate: 9, depth: 18 } })
  return dur
}

/**
 * A long snare roll that speeds up and swells, a tom pickup, then a crash exactly at the end.
 * Returns its length in seconds (also when audio is off) so the visuals can hit the crash.
 */
export function drumroll(seconds = 2.1): number {
  const o = out(1, (seconds + 3) * 1000)
  if (!o) return seconds
  const { ctx, g, t } = o
  const rollEnd = seconds - 0.24
  let at = 0
  while (at < rollEnd) {
    const p = at / rollEnd
    snare(ctx, g, t + at, 0.06 + p * p * 0.34)
    at += 0.052 - p * 0.024 // 19 → 36 hits per second
  }
  // "ba-dum": two toms into the crash
  tone(ctx, g, t + rollEnd, 0.1, { type: 'sine', freq: 190, to: 120, vol: 0.5, attack: 0.002, decay: 0.12, sustain: 0.2, release: 0.1 })
  tone(ctx, g, t + rollEnd + 0.12, 0.1, { type: 'sine', freq: 140, to: 85, vol: 0.55, attack: 0.002, decay: 0.12, sustain: 0.2, release: 0.1 })
  kick(ctx, g, t + seconds, 1)
  noise(ctx, g, t + seconds, 0.4, { vol: 0.5, filter: { type: 'highpass', freq: 4500 }, attack: 0.002, release: 1.8, reverb: 0.4 })
  return seconds
}

/** Cardboard box skidding across a wooden floor. */
export function scrape(seconds = 0.55) {
  const o = out(1)
  if (!o) return
  const { ctx, g, t } = o
  noise(ctx, g, t, seconds, { vol: 0.5, filter: { type: 'bandpass', freq: 520, to: 260, q: 1.6 }, attack: 0.02, decay: 0.2, sustain: 0.7, release: 0.18 })
  for (let i = 0; i < Math.floor(seconds / 0.045); i++) {
    noise(ctx, g, t + i * 0.045 + Math.random() * 0.01, 0.012, { vol: 0.18, filter: { type: 'bandpass', freq: 1400 + Math.random() * 600, q: 3 }, release: 0.02 })
  }
}

/** The "Ssssss" of a man who has just hurt his knee. */
export function hiss(seconds = 0.55) {
  const o = out(1)
  if (!o) return
  const { ctx, g, t } = o
  noise(ctx, g, t, seconds, { vol: 0.35, filter: { type: 'bandpass', freq: 6200, q: 1.4 }, attack: 0.05, sustain: 0.85, release: 0.08 })
}

/** …and the "AHHH!" that follows. */
export function ahh() {
  const o = out(1)
  if (!o) return
  const { ctx, g, t } = o
  const f = 196
  for (const [formant, vol] of [
    [760, 0.2],
    [1250, 0.12],
    [2600, 0.05],
  ] as const) {
    tone(ctx, g, t, 0.38, { type: 'sawtooth', freq: f * 1.25, to: f * 0.82, sweep: 0.42, vol, attack: 0.015, decay: 0.1, sustain: 0.85, release: 0.14, vibrato: { rate: 11, depth: 9 }, filter: { type: 'bandpass', freq: formant, q: 5 } })
  }
}

/** Soft cardboard thud (box panels landing). */
export function thud(volume = 1) {
  const o = out(volume)
  if (!o) return
  const { ctx, g, t } = o
  tone(ctx, g, t, 0.06, { type: 'sine', freq: 120, to: 55, vol: 0.55, attack: 0.002, decay: 0.12, sustain: 0.2, release: 0.15 })
  noise(ctx, g, t, 0.05, { vol: 0.25, filter: { type: 'lowpass', freq: 900 }, attack: 0.002, release: 0.08 })
}

/** Gentle shimmer swell when the light pours out of the box. */
export function shimmer() {
  const o = out(0.8)
  if (!o) return
  const { ctx, g, t } = o
  ;[79, 83, 86, 91, 95, 98].forEach((m, i) => {
    tone(ctx, g, t + i * 0.06, 0.05, { type: 'sine', freq: midiToFreq(m), vol: 0.08, attack: 0.01, decay: 1.2, sustain: 0.01, release: 1.2, reverb: 0.6 })
  })
  noise(ctx, g, t, 1.2, { vol: 0.12, filter: { type: 'highpass', freq: 7000 }, attack: 0.5, sustain: 0.5, release: 0.8, reverb: 0.4 })
}
