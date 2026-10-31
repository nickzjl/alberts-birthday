/**
 * Landing-page effect helpers: gesture-safe sounds, throwaway WAAPI particles,
 * and a tiny blueberry physics pit. Everything here is imperative on purpose —
 * particles never touch React state, so pokes stay cheap.
 */
import { audio } from '../../audio/engine'
import { sfx, type SfxName, type SfxOpts } from '../../audio/sfx'

export const prefersReduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Play a sound even when this very click is the gesture that unlocks audio. */
export function play(name: SfxName, opts?: SfxOpts) {
  if (audio.running) return sfx.play(name, opts)
  void audio.unlock().then((ok) => {
    if (ok) sfx.play(name, opts)
  })
}

/** Happy Birthday phrase on the piano (gesture-safe). Returns its length in seconds. */
export function playPhrase(i: number, beat: number): number {
  if (audio.running) return sfx.birthdayPhrase(i, { beat })
  void audio.unlock().then((ok) => {
    if (ok) sfx.birthdayPhrase(i, { beat })
  })
  return phraseSeconds(i, beat)
}

// mirrors the melody table in sfx.ts (public-domain tune) so visuals can sync with it
export const PHRASES: Array<Array<[midi: number, start: number, len: number]>> = [
  [[67, 0, 0.75], [67, 0.75, 0.25], [69, 1, 1], [67, 2, 1], [72, 3, 1], [71, 4, 2]],
  [[67, 0, 0.75], [67, 0.75, 0.25], [69, 1, 1], [67, 2, 1], [74, 3, 1], [72, 4, 2]],
  [[67, 0, 0.75], [67, 0.75, 0.25], [79, 1, 1], [76, 2, 1], [72, 3, 1], [71, 4, 1], [69, 5, 1.5]],
  [[77, 0, 0.75], [77, 0.75, 0.25], [76, 1, 1], [72, 2, 1], [74, 3, 1], [72, 4, 2.5]],
]

export function phraseSeconds(i: number, beat: number) {
  const p = PHRASES[((i % 4) + 4) % 4]
  const last = p[p.length - 1]
  return (last[1] + last[2]) * beat
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a)
export const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]

export interface Box {
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
}

/** Bounding box of `el` relative to `to` (both in CSS px). */
export function relBox(el: Element, to: Element): Box {
  const a = el.getBoundingClientRect()
  const b = to.getBoundingClientRect()
  const x = a.left - b.left
  const y = a.top - b.top
  return { x, y, w: a.width, h: a.height, cx: x + a.width / 2, cy: y + a.height / 2 }
}

export interface SpawnOpts {
  /** px inside the parent */
  x: number
  y: number
  className?: string
  html?: string
  text?: string
  keyframes: Keyframe[]
  duration: number
  easing?: string
  delay?: number
  style?: Partial<Record<string, string>>
  /**
   * Keep the popup's visible frames on screen and below the news ticker (text popups near the
   * screen edges). `extraTop` reserves room for decorations that overflow the element's box.
   */
  fit?: boolean | { extraTop?: number }
}

const FIT_PAD = 6

/**
 * Nudge a just-spawned popup so every frame where it's visible stays inside the stage: seek the
 * animation through its visible frames, union the boxes, shift left/top by the overflow, rewind.
 * (A dozen synchronous style reads once per poke — never per frame.)
 */
function fitOnStage(el: HTMLElement, a: Animation, o: SpawnOpts) {
  const stage = el.closest('.landing') ?? document.documentElement
  const s = stage.getBoundingClientRect()
  const ticker = stage.querySelector('.landing__ticker')?.getBoundingClientRect()
  const extraTop = typeof o.fit === 'object' ? (o.fit.extraTop ?? 0) : 0
  const minX = s.left + FIT_PAD
  const maxX = s.right - FIT_PAD
  const minY = (ticker && ticker.width > 0 ? ticker.bottom : s.top) + FIT_PAD
  const effect = a.effect as KeyframeEffect | null
  if (!effect) return
  const delay = o.delay ?? 0
  let l = Infinity
  let t = Infinity
  let r = -Infinity
  // every keyframe plus evenly spaced in-betweens (a fading tail can still sit higher than its last opaque keyframe)
  const offsets = effect.getKeyframes().map((k) => k.computedOffset ?? 0)
  for (let i = 1; i < 12; i++) offsets.push(i / 12)
  for (const off of offsets) {
    a.currentTime = delay + off * o.duration
    if (Number(getComputedStyle(el).opacity) < 0.35) continue
    const b = el.getBoundingClientRect()
    l = Math.min(l, b.left)
    r = Math.max(r, b.right)
    t = Math.min(t, b.top - extraTop)
  }
  a.currentTime = 0
  if (!Number.isFinite(l)) return
  let dx = 0
  if (r - l > maxX - minX) dx = (minX + maxX) / 2 - (l + r) / 2
  else if (l < minX) dx = minX - l
  else if (r > maxX) dx = maxX - r
  const dy = t < minY ? minY - t : 0
  if (dx) el.style.left = `${o.x + dx}px`
  if (dy) el.style.top = `${o.y + dy}px`
}

/** Create a throwaway element, animate it with WAAPI, remove it when done. */
export function spawn(parent: HTMLElement, o: SpawnOpts): HTMLElement {
  const el = document.createElement('div')
  el.className = `lfx ${o.className ?? ''}`
  el.setAttribute('aria-hidden', 'true')
  if (o.html) el.innerHTML = o.html
  else if (o.text) el.textContent = o.text
  el.style.left = `${o.x}px`
  el.style.top = `${o.y}px`
  if (o.style) for (const [k, v] of Object.entries(o.style)) if (v != null) el.style.setProperty(k, v)
  parent.appendChild(el)
  const a = el.animate(o.keyframes, { duration: o.duration, easing: o.easing ?? 'ease-out', delay: o.delay ?? 0, fill: 'both' })
  if (o.fit) fitOnStage(el, a, o)
  a.onfinish = () => el.remove()
  a.oncancel = () => el.remove()
  return el
}

/** Fire a WAAPI animation on an element if it exists. */
export function anim(el: Element | null | undefined, keyframes: Keyframe[], opts: KeyframeAnimationOptions): Animation | null {
  if (!el) return null
  return el.animate(keyframes, opts)
}

/** setTimeout bookkeeping so a sticker's pending effects die with the page. */
export function createTimers() {
  const ids = new Set<number>()
  return {
    later(fn: () => void, ms: number) {
      const id = window.setTimeout(() => {
        ids.delete(id)
        fn()
      }, ms)
      ids.add(id)
    },
    clear() {
      ids.forEach((id) => window.clearTimeout(id))
      ids.clear()
    },
  }
}
export type Timers = ReturnType<typeof createTimers>

/* ---------------------------------------------------------------
   Blueberry pit: frozen chocolate blueberries that fly, fall and
   bounce on the bottom of the screen. One RAF loop, refs only.
   --------------------------------------------------------------- */

interface Berry {
  el: HTMLElement
  x: number
  y: number
  vx: number
  vy: number
  r: number
  rot: number
  vr: number
  born: number
  bounces: number
}

const BERRY_KINDS = ['dark', 'dark', 'white', 'blue', 'dark', 'white']

export function createBerryPit(layer: HTMLElement) {
  let berries: Berry[] = []
  let raf = 0
  let last = 0
  let lastPop = 0
  const LIFE = 3400

  const step = (t: number) => {
    const dt = last ? Math.min(2, (t - last) / 16.67) : 1
    last = t
    const W = layer.clientWidth
    const H = layer.clientHeight
    const g = 0.62 * Math.max(0.7, Math.min(1.2, H / 900))
    berries = berries.filter((b) => {
      const age = t - b.born
      if (age > LIFE) {
        b.el.remove()
        return false
      }
      b.vy += g * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.rot += b.vr * dt
      const floor = H - b.r - 2
      if (b.y > floor) {
        b.y = floor
        if (Math.abs(b.vy) > 3.2 && b.bounces < 3 && t - lastPop > 55) {
          play(b.bounces ? 'bubble' : 'pop', { pitch: 1.1 + Math.random() * 0.9, volume: 0.32 - b.bounces * 0.08 })
          lastPop = t
        }
        b.vy *= -0.56
        b.vx *= 0.8
        b.vr *= 0.7
        b.bounces++
      }
      if (b.x < b.r) {
        b.x = b.r
        b.vx = Math.abs(b.vx) * 0.7
      } else if (b.x > W - b.r) {
        b.x = W - b.r
        b.vx = -Math.abs(b.vx) * 0.7
      }
      const fade = age > LIFE - 600 ? Math.max(0, (LIFE - age) / 600) : 1
      b.el.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0) rotate(${b.rot}deg)`
      b.el.style.opacity = String(fade)
      return true
    })
    if (berries.length) raf = requestAnimationFrame(step)
    else {
      raf = 0
      last = 0
    }
  }

  return {
    /** Throw `n` berries from (x, y) in layer px. `size` is the berry diameter. */
    burst(x: number, y: number, n: number, size: number) {
      const H = layer.clientHeight
      const k = Math.max(0.75, Math.min(1.25, H / 900))
      const now = performance.now()
      for (let i = 0; i < n; i++) {
        const el = document.createElement('div')
        const d = size * rand(0.8, 1.15)
        el.className = `lfx-berry lfx-berry--${BERRY_KINDS[i % BERRY_KINDS.length]}`
        el.style.width = `${d}px`
        el.style.height = `${d}px`
        el.setAttribute('aria-hidden', 'true')
        layer.appendChild(el)
        const spread = (i / Math.max(1, n - 1) - 0.5) * 2
        berries.push({
          el,
          x: x + rand(-8, 8),
          y,
          vx: (spread * 6.5 + rand(-2, 2)) * k,
          vy: -rand(11, 18) * k,
          r: d / 2,
          rot: rand(0, 360),
          vr: rand(-14, 14),
          born: now,
          bounces: 0,
        })
      }
      if (!raf) raf = requestAnimationFrame(step)
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      berries.forEach((b) => b.el.remove())
      berries = []
    },
  }
}
export type BerryPit = ReturnType<typeof createBerryPit>
