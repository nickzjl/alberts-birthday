/**
 * AudioEngine — the single Web Audio graph for the whole site.
 *
 *   music sources ─► musicBus ─────────────────────┐
 *   sfx sources ─► sfxIn ─► sfxComp ─► sfxBus ─────┼─► master ─► limiter ─► destination
 *   (sfx reverb send) ─► reverb ─► reverbOut ─┘ (into sfxBus)
 *
 * The AudioContext is created lazily on the first user gesture (browser autoplay rules).
 * Everything that makes sound should check `audio.ctx` / call `audio.ensure()` first and
 * silently no-op if audio is unavailable.
 *
 * The context can also be suspended *after* that first gesture: iOS does it on a phone call,
 * the lock screen or an app switch, and browsers may do it to background tabs. installAudioUnlock
 * keeps listening for gestures for the whole session and resumes it on the next tap/key, and
 * `state.running` tells the UI whether sound can actually be heard right now.
 */

type Listener = () => void

export interface EngineState {
  /** the context has run at least once (a user gesture unlocked it) */
  unlocked: boolean
  muted: boolean
  sfxEnabled: boolean
  /**
   * the context is running right now. False before the first gesture and while the OS/browser
   * has it suspended or interrupted (iOS call / lock screen / app switch) until the next tap resumes it.
   */
  running: boolean
}

class AudioEngine {
  ctx: AudioContext | null = null
  master: GainNode | null = null
  musicBus: GainNode | null = null
  /** Connect SFX here. It feeds a gentle compressor so effects never overpower the music. */
  sfxIn: GainNode | null = null
  /** Short room reverb send, shared by music & sfx. */
  reverbSend: GainNode | null = null

  private sfxBus: GainNode | null = null
  private noise: AudioBuffer | null = null
  private listeners = new Set<Listener>()
  private state: EngineState = { unlocked: false, muted: false, sfxEnabled: true, running: false }
  /** performance.now() of the last resume() request (sounds asked for right after it wait for it) */
  private resumeAt = -Infinity

  /** SFX sit under the soundtrack. 0..1 */
  readonly sfxLevel = 0.42

  getState = (): EngineState => this.state

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private set(patch: Partial<EngineState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }

  /** Create the context + graph if possible. Safe to call often. */
  ensure(): AudioContext | null {
    if (this.ctx) return this.ctx
    if (typeof window === 'undefined') return null
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null

    try {
      // iOS: let Web Audio play even when the ringer switch is on silent.
      const nav = navigator as Navigator & { audioSession?: { type: string } }
      if (nav.audioSession) nav.audioSession.type = 'playback'
    } catch {
      /* ignore */
    }

    const ctx = new AC({ latencyHint: 'interactive' })
    const master = ctx.createGain()
    master.gain.value = this.state.muted ? 0 : 1

    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -2
    limiter.knee.value = 0
    limiter.ratio.value = 20
    limiter.attack.value = 0.002
    limiter.release.value = 0.2
    master.connect(limiter).connect(ctx.destination)

    const musicBus = ctx.createGain()
    musicBus.gain.value = 1
    musicBus.connect(master)

    const sfxIn = ctx.createGain()
    const sfxComp = ctx.createDynamicsCompressor()
    sfxComp.threshold.value = -20
    sfxComp.knee.value = 8
    sfxComp.ratio.value = 4
    sfxComp.attack.value = 0.004
    sfxComp.release.value = 0.18
    const sfxBus = ctx.createGain()
    sfxBus.gain.value = this.state.sfxEnabled ? this.sfxLevel : 0
    sfxIn.connect(sfxComp).connect(sfxBus).connect(master)

    // Generated impulse-response reverb. Only SFX/voices send to it (the soundtrack has its own),
    // so its return goes through the SFX bus: the SFX level + on/off switch apply to the tails
    // too, and a big reverby boom can never poke out above the music. Post-compressor, so long
    // tails don't pump the dry hits.
    const reverb = ctx.createConvolver()
    reverb.buffer = makeImpulse(ctx, 2.2, 2.8)
    const reverbSend = ctx.createGain()
    reverbSend.gain.value = 1
    const reverbOut = ctx.createGain()
    reverbOut.gain.value = 0.8
    reverbSend.connect(reverb).connect(reverbOut).connect(sfxBus)

    // follow suspensions/interruptions the page didn't ask for (iOS calls, app switches, …)
    ctx.addEventListener('statechange', this.syncRunning)

    this.ctx = ctx
    this.master = master
    this.musicBus = musicBus
    this.sfxIn = sfxIn
    this.sfxBus = sfxBus
    this.reverbSend = reverbSend
    return ctx
  }

  private syncRunning = () => {
    const running = this.ctx?.state === 'running'
    if (running !== this.state.running) this.set(running ? { running, unlocked: true } : { running })
  }

  /** Call from a user gesture. Resumes the context (and primes iOS). */
  async unlock(): Promise<boolean> {
    const ctx = this.ensure()
    if (!ctx) return false
    if (ctx.state !== 'running') {
      this.resumeAt = performance.now()
      try {
        await ctx.resume()
      } catch {
        /* ignore */
      }
    }
    // Prime with a silent buffer (old iOS needs a sound started inside the gesture)
    try {
      const b = ctx.createBuffer(1, 1, 22050)
      const s = ctx.createBufferSource()
      s.buffer = b
      s.connect(ctx.destination)
      s.start(0)
    } catch {
      /* ignore */
    }
    this.syncRunning()
    return ctx.state === 'running'
  }

  /**
   * Run `fn` once the context runs. Immediately if it already does; if a resume was requested a
   * moment ago (the gesture listener fires before the button's own click handler), as soon as
   * that resume lands; otherwise (or if it takes longer than `maxWaitMs`) never — a sound that
   * comes out late is worse than none.
   */
  whenRunning(fn: () => void, maxWaitMs = 400) {
    const ctx = this.ctx
    if (!ctx) return
    if (ctx.state === 'running') return fn()
    if (ctx.state === 'closed' || performance.now() - this.resumeAt > maxWaitMs) return
    let timer = 0
    const done = () => {
      window.clearTimeout(timer)
      ctx.removeEventListener('statechange', onChange)
    }
    const onChange = () => {
      if (ctx.state !== 'running') return
      done()
      fn()
    }
    timer = window.setTimeout(done, maxWaitMs)
    ctx.addEventListener('statechange', onChange)
  }

  /** True when sound can actually be heard right now. */
  get running(): boolean {
    return !!this.ctx && this.ctx.state === 'running'
  }

  get now(): number {
    return this.ctx?.currentTime ?? 0
  }

  setMuted(muted: boolean) {
    this.set({ muted })
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(t)
      this.master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.04)
    }
  }

  setSfxEnabled(sfxEnabled: boolean) {
    this.set({ sfxEnabled })
    if (this.ctx && this.sfxBus) {
      const t = this.ctx.currentTime
      this.sfxBus.gain.cancelScheduledValues(t)
      this.sfxBus.gain.setTargetAtTime(sfxEnabled ? this.sfxLevel : 0, t, 0.04)
    }
  }

  /** Shared 2s white-noise buffer. */
  noiseBuffer(): AudioBuffer | null {
    const ctx = this.ctx
    if (!ctx) return null
    if (!this.noise) {
      const len = Math.floor(ctx.sampleRate * 2)
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      this.noise = buf
    }
    return this.noise
  }
}

function makeImpulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * seconds)
  const buf = ctx.createBuffer(2, len, rate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  return buf
}

export const audio = new AudioEngine()

let unlockInstalled = false
/**
 * Keep audio alive for the whole session: create + resume the context on the first gesture, and
 * resume it again on any later gesture after the OS or browser suspended it (iOS phone call, lock
 * screen, app switch, background tab). The listeners stay installed — once the context runs they
 * cost one property check per event.
 *
 * Only events that count as user activation are used (a touch `pointerdown` doesn't — it would
 * just log "AudioContext was not allowed to start"): mouse pointerdown, touch/pen pointerup,
 * touchend (older iOS), click and keydown.
 */
export function installAudioUnlock() {
  if (unlockInstalled || typeof window === 'undefined') return
  unlockInstalled = true
  const onGesture = (e: Event) => {
    if (!e.isTrusted) return
    if (e instanceof PointerEvent) {
      const mouse = e.pointerType === 'mouse'
      if (e.type === 'pointerdown' ? !mouse : mouse) return
    }
    const ctx = audio.ctx
    if (ctx && (ctx.state === 'running' || ctx.state === 'closed')) return
    void audio.unlock()
  }
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const) {
    window.addEventListener(type, onGesture, { capture: true, passive: true })
  }
  // coming back to the tab/app: browsers that remember the earlier gesture let us resume right
  // away (desktop Chrome/Firefox); iOS waits for the next tap, which the listeners above catch
  document.addEventListener('visibilitychange', () => {
    const ctx = audio.ctx
    if (document.visibilityState !== 'visible' || !ctx || ctx.state === 'running' || ctx.state === 'closed' || !audio.getState().unlocked) return
    void ctx.resume().catch(() => {})
  })
}

export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
