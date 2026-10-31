/**
 * "Animalese"-style talking blips for typewriter dialogue + character laughs.
 * Each profile has its own timbre so you can tell who's talking with your eyes closed.
 */
import { audio, midiToFreq } from './engine'
import { noise, tone, woodKnock } from './synthKit'

export type VoiceProfile = 'cartman' | 'peter' | 'tung' | 'narrator' | 'albert'

interface Profile {
  base: number // base frequency Hz
  spread: number // random pitch spread in semitones
  type: OscillatorType
  formant: number
  q: number
  dur: number
  vol: number
}

const PROFILES: Record<Exclude<VoiceProfile, 'tung'>, Profile> = {
  // whiny, nasal, mid-high
  cartman: { base: 330, spread: 5, type: 'square', formant: 1500, q: 3.5, dur: 0.05, vol: 0.13 },
  // low, dopey, nasal honk
  peter: { base: 150, spread: 4, type: 'sawtooth', formant: 900, q: 4, dur: 0.06, vol: 0.16 },
  narrator: { base: 520, spread: 3, type: 'triangle', formant: 2400, q: 1, dur: 0.035, vol: 0.12 },
  albert: { base: 260, spread: 3, type: 'triangle', formant: 1800, q: 1.5, dur: 0.04, vol: 0.14 },
}

let lastBlip = 0

export const voice = {
  /**
   * One syllable blip. `char` nudges the pitch so the same word sounds the same each time.
   * `intensity` 0..1 makes it louder/higher/more frantic (anger!).
   */
  blip(profile: VoiceProfile, char = 'a', intensity = 0) {
    const ctx = audio.ctx
    if (!ctx || ctx.state !== 'running' || !audio.sfxIn || !audio.getState().sfxEnabled) return
    const now = ctx.currentTime
    if (now - lastBlip < 0.03) return
    lastBlip = now
    const code = char.toLowerCase().charCodeAt(0) || 97
    const out = ctx.createGain()
    out.gain.value = 1
    out.connect(audio.sfxIn)
    window.setTimeout(() => out.disconnect(), 1000)

    if (profile === 'tung') {
      // wooden knocks for a wooden guy
      woodKnock(ctx, out, now + 0.003, 360 + ((code * 37) % 9) * 22 + intensity * 120, 0.35 + intensity * 0.2)
      return
    }
    const p = PROFILES[profile]
    const semis = (((code * 7) % 11) / 10 - 0.5) * p.spread + intensity * 4
    const f = p.base * Math.pow(2, semis / 12)
    const vowelish = 'aeiouy'.includes(char.toLowerCase())
    tone(ctx, out, now + 0.003, p.dur * (vowelish ? 1.4 : 1), {
      type: p.type,
      freq: f,
      to: f * (profile === 'cartman' ? 1.06 : 0.94),
      vol: p.vol * (1 + intensity * 0.6),
      attack: 0.004,
      decay: 0.03,
      sustain: 0.7,
      release: 0.03,
      filter: { type: 'bandpass', freq: p.formant * (1 + intensity * 0.25), q: p.q },
    })
  },

  /** Peter's wheezy "heheheheh" laugh. */
  laughPeter(volume = 1) {
    const ctx = audio.ctx
    if (!ctx || ctx.state !== 'running' || !audio.sfxIn || !audio.getState().sfxEnabled) return
    const out = ctx.createGain()
    out.gain.value = volume
    out.connect(audio.sfxIn)
    const t = ctx.currentTime + 0.01
    for (let i = 0; i < 7; i++) {
      const st = t + i * 0.105
      const f = midiToFreq(50 - Math.floor(i / 2))
      tone(ctx, out, st, 0.05, { type: 'sawtooth', freq: f * 1.2, to: f, vol: 0.2, attack: 0.004, sustain: 0.7, release: 0.04, filter: { type: 'bandpass', freq: 1000, q: 3 } })
      noise(ctx, out, st, 0.06, { vol: 0.1, filter: { type: 'bandpass', freq: 1800, q: 2 }, attack: 0.004, release: 0.04 })
    }
    window.setTimeout(() => out.disconnect(), 2000)
  },

  /** Cartman's whiny "nyeeeh" / scream. */
  whineCartman(volume = 1, pitch = 1) {
    const ctx = audio.ctx
    if (!ctx || ctx.state !== 'running' || !audio.sfxIn || !audio.getState().sfxEnabled) return
    const out = ctx.createGain()
    out.gain.value = volume
    out.connect(audio.sfxIn)
    const t = ctx.currentTime + 0.01
    tone(ctx, out, t, 0.7, { type: 'square', freq: 420 * pitch, to: 640 * pitch, sweep: 0.5, vol: 0.12, attack: 0.03, sustain: 0.9, release: 0.15, vibrato: { rate: 9, depth: 20 }, filter: { type: 'bandpass', freq: 1700, q: 3 } })
    window.setTimeout(() => out.disconnect(), 2000)
  },
}
