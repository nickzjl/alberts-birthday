/** Boss-fight-only synth sounds (everything else comes from the shared sfx library). */
import { audio } from '../../audio/engine'
import { bell, noise, tone, woodKnock } from '../../audio/synthKit'
import type { LocalSound } from './engine'

function out(volume = 1): { ctx: AudioContext; dest: GainNode; t: number } | null {
  const ctx = audio.ctx
  if (!ctx || ctx.state !== 'running' || !audio.sfxIn || !audio.getState().sfxEnabled) return null
  const dest = ctx.createGain()
  dest.gain.value = volume
  dest.connect(audio.sfxIn)
  window.setTimeout(() => dest.disconnect(), 4000)
  return { ctx, dest, t: ctx.currentTime + 0.005 }
}

export function playLocal(name: LocalSound, arg = 0) {
  const o = out()
  if (!o) return
  const { ctx, dest, t } = o
  switch (name) {
    case 'windup': {
      // rising "uh-oh" tension sweep that lasts the whole telegraph
      const d = Math.max(0.3, arg)
      tone(ctx, dest, t, d, { type: 'sawtooth', freq: 140, to: 520, vol: 0.12, attack: 0.05, sustain: 0.8, release: 0.05, filter: { type: 'lowpass', freq: 600, to: 2400, q: 6 } })
      tone(ctx, dest, t, d, { type: 'square', freq: 70, to: 260, vol: 0.06, attack: 0.05, sustain: 0.8, release: 0.05, filter: { type: 'lowpass', freq: 500 } })
      break
    }
    case 'rumble':
      noise(ctx, dest, t, 0.6, { vol: 0.55, filter: { type: 'lowpass', freq: 380, to: 90 }, attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.5 })
      tone(ctx, dest, t, 0.4, { type: 'sine', freq: 70, to: 38, vol: 0.5, attack: 0.005, sustain: 0.6, release: 0.3 })
      break
    case 'whir':
      noise(ctx, dest, t, 0.09, { vol: 0.18, filter: { type: 'bandpass', freq: 900, to: 1800, q: 3 }, attack: 0.02, decay: 0.05, sustain: 0.4, release: 0.05 })
      break
    case 'ding': {
      // brighter with every dodge in a row
      const base = 79 + Math.min(arg, 6) * 2
      bell(ctx, dest, t, base, 0.5, 0.16, 0.3)
      bell(ctx, dest, t + 0.08, base + 7, 0.6, 0.14, 0.3)
      break
    }
    case 'alarm':
      // pos ronda alarm: kentongan pattern tung-tung . tung-tung-tung
      ;[0, 0.14, 0.42, 0.56, 0.7].forEach((dt, i) => woodKnock(ctx, dest, t + dt, i < 2 ? 380 : 440, 0.55))
      break
    case 'alert':
      // stealth-game "!" — two quick bright stabs
      tone(ctx, dest, t, 0.07, { type: 'square', freq: 1320, vol: 0.07, attack: 0.003, sustain: 0.6, release: 0.03, filter: { type: 'lowpass', freq: 4200 } })
      tone(ctx, dest, t + 0.085, 0.16, { type: 'square', freq: 1760, vol: 0.08, attack: 0.003, sustain: 0.6, release: 0.08, filter: { type: 'lowpass', freq: 4800 } })
      break
    case 'dizzy':
      // tweety-birds wobble
      tone(ctx, dest, t, 0.7, { type: 'sine', freq: 1500, vol: 0.06, attack: 0.02, sustain: 0.7, release: 0.2, vibrato: { rate: 9, depth: 260 } })
      tone(ctx, dest, t + 0.12, 0.6, { type: 'sine', freq: 1900, vol: 0.04, attack: 0.02, sustain: 0.7, release: 0.2, vibrato: { rate: 11, depth: 300 } })
      break
  }
}
