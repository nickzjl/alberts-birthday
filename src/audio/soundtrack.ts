/**
 * Soundtrack — the persistent background music store.
 *
 * Each track looks for /music/<basename>.mp3 then .m4a. If neither exists, an original
 * procedural placeholder beat plays instead (see placeholderTracks.ts).
 *
 * Public API (stable — scenes depend on it):
 *   soundtrack.play() / pause() / toggle() / next() / prev() / select(id)
 *   soundtrack.setVolume(0..1) / setMuted(bool) / toggleMute() / cycleLoop() / seek(sec)
 *   soundtrack.startIfIdle()      start the default track if the user never started music
 *   soundtrack.fadeOut(ms)        fade to silence + pause (birthday video)
 *   soundtrack.fadeIn(ms)         resume (if it was playing) + fade back in
 *   soundtrack.preload(id?)       resolve a track's source early (no sound)
 *   soundtrack.getPosition()      exact playhead in seconds (for rAF-driven UI)
 *   soundtrack.getAnalyser()      AnalyserNode on the music (pre-volume) or null
 *   useSoundtrack()               React hook → SoundtrackState
 *
 * Loop modes: 'all' = play through the list and wrap, 'one' = repeat the current track,
 * 'off' = play through the list once and stop after the last track.
 */
import { useSyncExternalStore } from 'react'
import { audio } from './engine'
import { PLACEHOLDER_SONGS, startPlaceholderSession, type PlaceholderSession, type PlaceholderSong } from './placeholderTracks'

export type TrackId = 'e85' | 'purple-rain' | 'billie-jean' | 'thriller'
export type LoopMode = 'all' | 'one' | 'off'

export interface TrackInfo {
  id: TrackId
  title: string
  artist: string
  basename: string
  accent: string
}

export const TRACKS: TrackInfo[] = [
  { id: 'e85', title: 'E85', artist: 'Don Toliver', basename: 'e85', accent: '#c8ff2e' },
  { id: 'purple-rain', title: 'Purple Rain', artist: 'Prince', basename: 'purple-rain', accent: '#8b4dff' },
  { id: 'billie-jean', title: 'Billie Jean', artist: 'Michael Jackson', basename: 'billie-jean', accent: '#38e8ff' },
  { id: 'thriller', title: 'Thriller', artist: 'Michael Jackson', basename: 'thriller', accent: '#ff8a2b' },
]

export interface SoundtrackState {
  trackId: TrackId
  /** user intent: music should be playing */
  playing: boolean
  /** 0..1 music volume */
  volume: number
  /** everything (music + sfx) muted */
  muted: boolean
  loop: LoopMode
  /** playhead in seconds (updated ~2×/s while playing; use getPosition() for smooth UI) */
  position: number
  duration: number
  /** where the current track's audio comes from */
  source: 'pending' | 'file' | 'placeholder'
  /** per-track resolved sources (for badges in the track list) */
  sources: Partial<Record<TrackId, 'file' | 'placeholder'>>
  loading: boolean
  /** the user has started music at least once */
  started: boolean
  /** faded out for the birthday video */
  ducked: boolean
  /** playback was blocked by the browser; needs another tap */
  blocked: boolean
}

interface Source {
  kind: 'file' | 'placeholder'
  /** Must start playback synchronously (before its first await) so it counts as part of the user gesture. */
  play(): Promise<void>
  pause(): void
  seek(sec: number): void
  setLoop(on: boolean): void
  readonly position: number
  readonly duration: number
  onEnded: (() => void) | null
  /** duration became known / changed */
  onMeta: (() => void) | null
  dispose(): void
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/* ------------------------------------------------------------------ */
/* File source (HTMLAudioElement routed through Web Audio)              */
/* ------------------------------------------------------------------ */

class FileSource implements Source {
  kind = 'file' as const
  onEnded: (() => void) | null = null
  onMeta: (() => void) | null = null
  /** fired when the file turns out to be unplayable (corrupt / unsupported codec) */
  onFail: (() => void) | null = null
  failed = false
  private connected = false
  private el: HTMLAudioElement
  private getOut: () => AudioNode | null
  private off: () => void

  constructor(el: HTMLAudioElement, getOut: () => AudioNode | null) {
    this.el = el
    this.getOut = getOut
    const ended = () => this.onEnded?.()
    const meta = () => this.onMeta?.()
    const error = () => {
      if (this.failed || !el.error) return
      this.failed = true
      this.onFail?.()
    }
    el.addEventListener('ended', ended)
    el.addEventListener('durationchange', meta)
    el.addEventListener('loadedmetadata', meta)
    el.addEventListener('error', error)
    this.off = () => {
      el.removeEventListener('ended', ended)
      el.removeEventListener('durationchange', meta)
      el.removeEventListener('loadedmetadata', meta)
      el.removeEventListener('error', error)
    }
  }

  private connect() {
    if (this.connected) return
    const ctx = audio.ensure()
    const out = this.getOut()
    if (!ctx || !out) return
    try {
      const node = ctx.createMediaElementSource(this.el)
      node.connect(out)
      this.connected = true
    } catch {
      /* already connected or unsupported → plays directly */
    }
  }

  play() {
    if (this.failed) return Promise.reject(new Error('file failed'))
    this.el.preload = 'auto'
    this.connect()
    // el.play() is called synchronously → stays inside the user gesture (iOS Safari)
    return this.el.play()
  }
  pause() {
    this.el.pause()
  }
  seek(sec: number) {
    try {
      this.el.currentTime = Math.max(0, sec)
    } catch {
      /* not seekable yet */
    }
  }
  setLoop(on: boolean) {
    this.el.loop = on
  }
  /** the element was paused behind our back (e.g. an iOS audio interruption) */
  get paused() {
    return this.el.paused
  }
  get position() {
    return this.el.currentTime || 0
  }
  get duration() {
    return Number.isFinite(this.el.duration) ? this.el.duration : 0
  }
  dispose() {
    this.off()
    this.el.pause()
  }
}

/* ------------------------------------------------------------------ */
/* Placeholder source (procedural Web Audio song)                       */
/* ------------------------------------------------------------------ */

/** Resume a suspended context, but give up quickly if the browser wants a gesture first. */
async function resumeCtx(ctx: AudioContext, ms = 600): Promise<boolean> {
  if (ctx.state === 'running') return true
  try {
    await Promise.race([ctx.resume(), new Promise((r) => window.setTimeout(r, ms))])
  } catch {
    /* ignore */
  }
  return (ctx.state as string) === 'running'
}

class PlaceholderSource implements Source {
  kind = 'placeholder' as const
  onEnded: (() => void) | null = null
  onMeta: (() => void) | null = null
  private song: PlaceholderSong
  private getOut: () => AudioNode | null
  private timer: number | null = null
  private session: PlaceholderSession | null = null
  private startAt = 0
  private offset = 0
  private nextStep = 0
  private playing = false
  /** a play() is in flight (cleared by pause so a late resume can't start a ghost session) */
  private pending = false
  private loop = false
  /** the scheduler already wrapped to the next loop, but the old one is still audible */
  private wrapPending = false
  private onVisibility = () => this.tick()

  constructor(song: PlaceholderSong, getOut: () => AudioNode | null) {
    this.song = song
    this.getOut = getOut
  }

  private get stepDur() {
    return 60 / this.song.bpm / 4
  }
  private get totalSteps() {
    return this.song.bars * 16
  }
  get duration() {
    return this.totalSteps * this.stepDur
  }
  get position() {
    const ctx = audio.ctx
    if (!this.playing || !ctx) return this.offset
    let p = ctx.currentTime - this.startAt
    // the scheduler wraps a little ahead of the audible loop point
    if (p < 0 && this.wrapPending) p += this.duration
    return clamp(p, 0, this.duration)
  }

  async play() {
    const ctx = audio.ensure()
    const out = this.getOut()
    if (!ctx || !out) throw new Error('no audio')
    if (this.playing) return
    this.pending = true
    const ok = await resumeCtx(ctx)
    if (!this.pending || this.playing) return
    this.pending = false
    if (!ok) {
      const err = new Error('audio context is suspended')
      err.name = 'NotAllowedError'
      throw err
    }
    this.playing = true
    this.wrapPending = false
    this.session = startPlaceholderSession(ctx, out, this.song)
    this.startAt = ctx.currentTime + 0.06 - this.offset
    this.nextStep = Math.ceil(this.offset / this.stepDur - 1e-6)
    this.tick()
    this.timer = window.setInterval(() => this.tick(), 25)
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  private tick() {
    const c = audio.ctx
    const session = this.session
    if (!c || !this.playing || !session) return
    // background tabs throttle timers to ~1/s → schedule further ahead while hidden
    const horizon = c.currentTime + (document.hidden ? 1.6 : 0.16)
    const sd = this.stepDur
    if (this.wrapPending && c.currentTime >= this.startAt) this.wrapPending = false
    while (this.startAt + this.nextStep * sd < horizon) {
      if (this.nextStep >= this.totalSteps) {
        if (this.loop) {
          this.startAt += this.duration
          this.nextStep = 0
          this.wrapPending = true
          continue
        }
        break
      }
      const t = this.startAt + this.nextStep * sd
      // never pile up missed steps after a stall — skip them instead of playing a burst
      if (t >= c.currentTime - 0.03) {
        try {
          this.song.step(this.nextStep, Math.max(t, c.currentTime), session.kit, sd)
        } catch {
          /* ignore a bad step */
        }
      }
      this.nextStep++
    }
    if (!this.loop && this.nextStep >= this.totalSteps && c.currentTime >= this.startAt + this.duration + 0.25) {
      this.stopNow()
      this.offset = 0
      this.onEnded?.()
    }
  }

  private stopNow() {
    this.playing = false
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.session?.stop()
    this.session = null
  }

  pause() {
    this.pending = false
    if (!this.playing) return
    this.offset = this.position
    this.stopNow()
  }
  seek(sec: number) {
    const target = clamp(sec, 0, Math.max(0, this.duration - 0.05))
    if (!this.playing) {
      this.offset = target
      return
    }
    this.stopNow()
    this.offset = target
    void this.play().catch(() => {})
  }
  setLoop(on: boolean) {
    this.loop = on
  }
  dispose() {
    this.stopNow()
  }
}

/* ------------------------------------------------------------------ */
/* Source discovery                                                     */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'abbs.soundtrack.v1'
const base = import.meta.env.BASE_URL || '/'

interface Prefs {
  volume?: number
  loop?: LoopMode
  trackId?: TrackId
  sfx?: boolean
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const p = raw ? JSON.parse(raw) : {}
    return p && typeof p === 'object' ? p : {}
  } catch {
    return {}
  }
}

/** HEAD check: true = audio file there, false = missing (404 / SPA html fallback), null = can't tell. */
async function headCheck(url: string): Promise<boolean | null> {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-cache' })
    if (r.status === 405 || r.status === 501) return null
    if (!r.ok) return false
    const type = (r.headers.get('content-type') || '').toLowerCase()
    return !type.includes('text/html')
  } catch {
    return null
  }
}

/** Fallback probe through the media element itself (for hosts without HEAD). */
function elementProbe(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const el = new Audio()
    el.preload = 'metadata'
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      el.removeAttribute('src')
      resolve(ok)
    }
    const timer = window.setTimeout(() => finish(false), 8000)
    el.addEventListener('loadedmetadata', () => finish(true), { once: true })
    el.addEventListener('error', () => finish(false), { once: true })
    el.src = url
    el.load()
  })
}

async function probeFile(basename: string): Promise<HTMLAudioElement | null> {
  const probe = new Audio()
  const candidates = [
    // .mp4 first: the published copy of an .m4a song (Cloudflare only edge-caches and byte-range-serves known
    // media extensions — .mp4 is one, .m4a isn't — and iPhone Safari won't play audio without byte ranges)
    { url: `${base}music/${basename}.mp4`, type: 'audio/mp4' },
    { url: `${base}music/${basename}.m4a`, type: 'audio/mp4' },
    { url: `${base}music/${basename}.mp3`, type: 'audio/mpeg' },
  ]
  for (const c of candidates) {
    if (probe.canPlayType(c.type) === '') continue
    let ok = await headCheck(c.url)
    if (ok === null) ok = await elementProbe(c.url)
    if (!ok) continue
    const el = new Audio()
    el.preload = 'metadata'
    el.src = c.url
    return el
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

type Listener = () => void

class Soundtrack {
  private state: SoundtrackState
  private listeners = new Set<Listener>()
  private sources = new Map<TrackId, Source>()
  private resolving = new Map<TrackId, Promise<Source>>()
  private preGain: GainNode | null = null
  private volGain: GainNode | null = null
  private fadeGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private ticker: number | null = null
  private resumeAfterFade = false
  private playToken = 0
  private fadeTimer: number | null = null
  private fadeResolve: (() => void) | null = null
  private sfxPref: boolean | undefined
  private unsubAudio: () => void

  constructor() {
    const prefs = loadPrefs()
    this.state = {
      trackId: prefs.trackId && TRACKS.some((t) => t.id === prefs.trackId) ? prefs.trackId : 'e85',
      playing: false,
      volume: typeof prefs.volume === 'number' && Number.isFinite(prefs.volume) ? clamp(prefs.volume, 0, 1) : 0.7,
      muted: audio.getState().muted,
      loop: prefs.loop === 'one' || prefs.loop === 'off' ? prefs.loop : 'all',
      position: 0,
      duration: 0,
      source: 'pending',
      sources: {},
      loading: false,
      started: false,
      ducked: false,
      blocked: false,
    }
    this.sfxPref = prefs.sfx
    if (prefs.sfx === false) audio.setSfxEnabled(false)
    // keep `muted` in sync if anything else mutes the engine; persist the SFX switch
    let wasRunning = audio.getState().running
    this.unsubAudio = audio.subscribe(() => {
      const a = audio.getState()
      if (a.muted !== this.state.muted) this.set({ muted: a.muted })
      // sound came back after an OS interruption: a file element may have been paused for us
      if (a.running && !wasRunning && this.state.playing && !this.state.ducked) {
        const c = this.current
        if (c instanceof FileSource && c.paused) void c.play().catch(() => this.set({ playing: false, blocked: true }))
      }
      wasRunning = a.running
      if (a.sfxEnabled !== (this.sfxPref ?? true)) {
        this.sfxPref = a.sfxEnabled
        this.savePrefs()
      }
    })
  }

  getState = (): SoundtrackState => this.state
  subscribe = (fn: Listener) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private set(patch: Partial<SoundtrackState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
    if ('volume' in patch || 'loop' in patch || 'trackId' in patch) this.savePrefs()
  }

  private savePrefs() {
    try {
      const { volume, loop, trackId } = this.state
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume, loop, trackId, sfx: this.sfxPref }))
    } catch {
      /* ignore */
    }
  }

  private get current(): Source | null {
    return this.sources.get(this.state.trackId) ?? null
  }

  /** Graph: sources → preGain (→ analyser) → volGain → fadeGain → musicBus */
  private out = (): AudioNode | null => {
    const ctx = audio.ensure()
    if (!ctx || !audio.musicBus) return null
    if (!this.preGain || !this.volGain || !this.fadeGain) {
      this.fadeGain = ctx.createGain()
      this.fadeGain.gain.value = this.state.ducked ? 0 : 1
      this.volGain = ctx.createGain()
      this.volGain.gain.value = this.curve(this.state.volume)
      this.preGain = ctx.createGain()
      this.preGain.connect(this.volGain).connect(this.fadeGain).connect(audio.musicBus)
    }
    return this.preGain
  }

  private curve(v: number) {
    return Math.pow(clamp(v, 0, 1), 1.6)
  }

  /** Start resolving where a track's audio comes from (no sound). */
  preload(id: TrackId = this.state.trackId) {
    void this.resolve(id)
  }

  /** Exact playhead (seconds) — cheap, call it from requestAnimationFrame. */
  getPosition(): number {
    return this.current?.position ?? this.state.position
  }

  /** Analyser tapped before volume/fade (so visuals don't depend on the volume knob). */
  getAnalyser(): AnalyserNode | null {
    if (this.analyser) return this.analyser
    const ctx = audio.ctx
    if (!ctx || !this.out() || !this.preGain) return null
    const a = ctx.createAnalyser()
    a.fftSize = 256
    a.smoothingTimeConstant = 0.72
    a.minDecibels = -78
    a.maxDecibels = -18
    this.preGain.connect(a)
    this.analyser = a
    return a
  }

  private resolve(id: TrackId): Promise<Source> {
    const existing = this.sources.get(id)
    if (existing) return Promise.resolve(existing)
    let p = this.resolving.get(id)
    if (!p) {
      const info = trackInfo(id)
      p = probeFile(info.basename)
        .catch(() => null)
        .then((el) => {
          let src: Source
          if (el) {
            const file = new FileSource(el, this.out)
            file.onFail = () => this.handleFileFail(id, file)
            src = file
          } else src = this.makePlaceholder(id)
          this.install(id, src)
          return src
        })
      this.resolving.set(id, p)
    }
    return p
  }

  private makePlaceholder(id: TrackId): Source {
    return new PlaceholderSource(PLACEHOLDER_SONGS[id], this.out)
  }

  private install(id: TrackId, src: Source) {
    src.onEnded = () => this.handleEnded(id)
    src.onMeta = () => {
      if (id === this.state.trackId && src.duration !== this.state.duration) this.set({ duration: src.duration })
    }
    src.setLoop(this.state.loop === 'one')
    this.sources.set(id, src)
    this.resolving.delete(id)
    this.set({ sources: { ...this.state.sources, [id]: src.kind } })
    if (id === this.state.trackId) this.set({ source: src.kind, duration: src.duration })
  }

  /** A file that exists but can't be decoded → swap in the placeholder so there's still music. */
  private handleFileFail(id: TrackId, file: FileSource) {
    if (this.sources.get(id) !== file) return
    file.dispose()
    this.install(id, this.makePlaceholder(id))
    if (id === this.state.trackId && this.state.playing) void this.play()
  }

  private handleEnded(id: TrackId) {
    if (id !== this.state.trackId || !this.state.playing) return
    const { loop } = this.state
    const i = TRACKS.findIndex((t) => t.id === id)
    if (loop === 'one') {
      const c = this.current
      c?.seek(0)
      void c?.play().catch(() => {})
    } else if (loop === 'all' || i < TRACKS.length - 1) {
      this.next()
    } else {
      // loop off + last track: stop and rewind
      this.playToken++
      this.current?.pause()
      this.current?.seek(0)
      this.set({ playing: false, loading: false, position: 0 })
      this.stopTicker()
    }
  }

  private startTicker() {
    if (this.ticker !== null) return
    this.ticker = window.setInterval(() => {
      const c = this.current
      if (!c) return
      const position = c.position
      const duration = c.duration
      if (Math.abs(position - this.state.position) >= 0.5 || duration !== this.state.duration) this.set({ position, duration })
    }, 250)
  }
  private stopTicker() {
    if (this.ticker !== null) window.clearInterval(this.ticker)
    this.ticker = null
  }

  /**
   * Start (or resume) the current track. When the source is already resolved, the actual
   * media `play()` happens synchronously inside this call — i.e. inside the user gesture.
   */
  play(): Promise<void> {
    const token = ++this.playToken
    void audio.unlock()
    const id = this.state.trackId
    // un-duck if the user explicitly presses play during the video
    if (this.state.ducked) {
      this.clearFadeTimer()
      this.rampFade(1, 400)
    }
    this.set({ playing: true, started: true, blocked: false, ducked: false, loading: true })
    const ready = this.sources.get(id)
    if (ready) return this.start(ready, token, id)
    return this.resolve(id).then((src) => this.start(src, token, id))
  }

  private async start(src: Source, token: number, id: TrackId) {
    if (token !== this.playToken || this.state.trackId !== id || !this.state.playing) return
    this.out()
    try {
      await src.play()
      if (token !== this.playToken) return
      this.set({ loading: false, source: src.kind, duration: src.duration, position: src.position })
      this.startTicker()
    } catch (err) {
      if (token !== this.playToken) return
      if (src instanceof FileSource && src.failed) return // handleFileFail retries with the placeholder
      const name = err instanceof Error ? err.name : ''
      if (name === 'AbortError') return
      this.set({ playing: false, loading: false, blocked: true })
    }
  }

  /** Pause the music (user intent: it stays paused even after the birthday video). */
  pause() {
    this.resumeAfterFade = false
    this.halt()
    this.set({ blocked: false })
  }

  private halt() {
    this.playToken++
    const c = this.current
    c?.pause()
    this.set({ playing: false, loading: false, position: c?.position ?? this.state.position })
    this.stopTicker()
  }

  toggle() {
    if (this.state.playing) this.pause()
    else void this.play()
  }

  select(id: TrackId, autoplay = true) {
    if (!TRACKS.some((t) => t.id === id)) return
    if (id === this.state.trackId) {
      if (autoplay && !this.state.playing) void this.play()
      return
    }
    const wasPlaying = this.state.playing
    this.playToken++
    const old = this.current
    old?.pause()
    old?.seek(0)
    const known = this.sources.get(id)
    known?.seek(0)
    this.set({ trackId: id, position: 0, duration: known?.duration ?? 0, source: known?.kind ?? 'pending', playing: false, loading: false })
    this.stopTicker()
    if (autoplay || wasPlaying) void this.play()
    else this.preload(id)
  }

  next() {
    const i = TRACKS.findIndex((t) => t.id === this.state.trackId)
    this.select(TRACKS[(i + 1) % TRACKS.length].id, true)
  }

  prev() {
    if (this.getPosition() > 3) {
      this.seek(0)
      if (!this.state.playing) void this.play()
      return
    }
    const i = TRACKS.findIndex((t) => t.id === this.state.trackId)
    this.select(TRACKS[(i - 1 + TRACKS.length) % TRACKS.length].id, true)
  }

  seek(sec: number) {
    if (!Number.isFinite(sec)) return
    const c = this.current
    const dur = c?.duration || this.state.duration
    const s = dur > 0 ? clamp(sec, 0, Math.max(0, dur - 0.05)) : Math.max(0, sec)
    c?.seek(s)
    this.set({ position: s })
  }

  setVolume(v: number) {
    if (!Number.isFinite(v)) return
    const volume = Math.round(clamp(v, 0, 1) * 1000) / 1000
    this.set({ volume })
    const ctx = audio.ctx
    if (ctx && this.volGain) {
      this.volGain.gain.cancelScheduledValues(ctx.currentTime)
      this.volGain.gain.setTargetAtTime(this.curve(volume), ctx.currentTime, 0.03)
    }
    if (volume > 0 && this.state.muted) this.setMuted(false)
  }

  setMuted(muted: boolean) {
    audio.setMuted(muted)
    if (muted !== this.state.muted) this.set({ muted })
  }

  toggleMute() {
    this.setMuted(!this.state.muted)
  }

  cycleLoop() {
    const order: LoopMode[] = ['all', 'one', 'off']
    const loop = order[(order.indexOf(this.state.loop) + 1) % order.length]
    this.set({ loop })
    this.sources.forEach((s) => s.setLoop(loop === 'one'))
  }

  /** Start the default soundtrack if the user hasn't started any music yet (or retry after a block). */
  startIfIdle() {
    if (this.state.playing) return
    if (!this.state.started || this.state.blocked) void this.play()
  }

  private rampFade(to: number, ms: number) {
    const ctx = audio.ctx
    if (!ctx || !this.out() || !this.fadeGain) return
    const g = this.fadeGain.gain
    const t = ctx.currentTime
    g.cancelScheduledValues(t)
    g.setValueAtTime(g.value, t)
    g.linearRampToValueAtTime(to, t + Math.max(10, ms) / 1000)
  }

  private clearFadeTimer() {
    if (this.fadeTimer !== null) window.clearTimeout(this.fadeTimer)
    this.fadeTimer = null
    const r = this.fadeResolve
    this.fadeResolve = null
    r?.()
  }

  /** Fade the music to silence and pause it (e.g. when the birthday video starts). */
  fadeOut(ms = 1800): Promise<void> {
    this.resumeAfterFade = this.state.playing || (this.state.ducked && this.resumeAfterFade)
    this.clearFadeTimer()
    this.set({ ducked: true })
    if (!this.state.playing) return Promise.resolve()
    this.rampFade(0, ms)
    return new Promise((resolve) => {
      this.fadeResolve = resolve
      this.fadeTimer = window.setTimeout(() => {
        this.fadeTimer = null
        this.fadeResolve = null
        if (this.state.ducked && this.state.playing) this.halt()
        resolve()
      }, ms + 60)
    })
  }

  /** Bring the music back after fadeOut (only if it was playing before). */
  fadeIn(ms = 2200) {
    const resume = this.resumeAfterFade
    this.resumeAfterFade = false
    if (!this.state.ducked) return
    this.clearFadeTimer()
    this.set({ ducked: false })
    if (!resume) {
      this.rampFade(1, 30)
      return
    }
    if (this.state.playing) {
      // fadeOut hadn't finished yet → just turn it around from wherever it is
      this.rampFade(1, ms)
      return
    }
    const ctx = audio.ctx
    if (ctx && this.out() && this.fadeGain) {
      this.fadeGain.gain.cancelScheduledValues(ctx.currentTime)
      this.fadeGain.gain.setValueAtTime(0, ctx.currentTime)
    }
    void this.play().then(() => this.rampFade(1, ms))
  }

  /** Dev/HMR cleanup. */
  destroy() {
    this.halt()
    this.clearFadeTimer()
    this.sources.forEach((s) => s.dispose())
    this.unsubAudio()
    this.preGain?.disconnect()
    this.fadeGain?.disconnect()
  }
}

export const soundtrack = new Soundtrack()

if (import.meta.hot) import.meta.hot.dispose(() => soundtrack.destroy())
// handy for poking at the player from devtools / headless tests
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __soundtrack?: typeof soundtrack }).__soundtrack = soundtrack

export function useSoundtrack(): SoundtrackState {
  return useSyncExternalStore(soundtrack.subscribe, soundtrack.getState, soundtrack.getState)
}

export function trackInfo(id: TrackId): TrackInfo {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0]
}
