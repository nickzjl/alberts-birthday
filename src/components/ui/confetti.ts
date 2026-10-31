/**
 * Lightweight canvas confetti (no dependency).
 *
 *   fireConfetti()                                   burst from screen center
 *   fireConfetti({ x: 0.5, y: 0.3, count: 160 })     x/y are 0..1 of the viewport
 *   const stop = confettiRain({ duration: 6000 })    continuous rain from the top
 */

export interface ConfettiOptions {
  x?: number
  y?: number
  count?: number
  /** degrees, 0 = right, -90 = up */
  angle?: number
  spread?: number
  velocity?: number
  colors?: string[]
  shapes?: Array<'rect' | 'circle' | 'star' | 'ribbon'>
  gravity?: number
  scalar?: number
}

export const PURPLE_CONFETTI = ['#8b4dff', '#c9b3ff', '#e9e0ff', '#6d36d6', '#ff3ea5', '#ffffff', '#b388ff']

interface P {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  size: number
  color: string
  shape: 'rect' | 'circle' | 'star' | 'ribbon'
  life: number
  tilt: number
  vt: number
  gravity: number
}

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let parts: P[] = []
let raf = 0
let dpr = 1
/** stop functions of every running confettiRain */
const rains = new Set<() => void>()

function ensureCanvas() {
  if (canvas) return
  canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 'var(--z-confetti)',
  } as CSSStyleDeclaration)
  document.body.appendChild(canvas)
  ctx = canvas.getContext('2d')
  const resize = () => {
    if (!canvas) return
    dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.floor(window.innerWidth * dpr)
    canvas.height = Math.floor(window.innerHeight * dpr)
  }
  resize()
  window.addEventListener('resize', resize)
}

function star(c: CanvasRenderingContext2D, r: number) {
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r
    const a = (i * Math.PI) / 5 - Math.PI / 2
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  c.closePath()
  c.fill()
}

function loop() {
  if (!ctx || !canvas) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const h = window.innerHeight
  parts = parts.filter((p) => p.y < h + 40 && p.life > 0)
  for (const p of parts) {
    p.vy += p.gravity
    p.vx *= 0.985
    p.vy *= 0.985
    p.x += p.vx + Math.sin(p.tilt) * 0.6
    p.y += p.vy
    p.rot += p.vr
    p.tilt += p.vt
    p.life -= 1
    const alpha = Math.min(1, p.life / 40)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.fillStyle = p.color
    const flip = Math.abs(Math.cos(p.tilt))
    if (p.shape === 'rect') {
      ctx.fillRect(-p.size / 2, (-p.size / 3) * flip, p.size, ((p.size * 2) / 3) * flip + 0.5)
    } else if (p.shape === 'circle') {
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size / 2.4, (p.size / 2.4) * flip + 0.4, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.shape === 'star') {
      ctx.scale(1, flip * 0.7 + 0.3)
      star(ctx, p.size / 1.6)
    } else {
      ctx.fillRect(-p.size * 0.15, -p.size, p.size * 0.3, p.size * 2 * flip + 1)
    }
    ctx.restore()
  }
  if (parts.length) raf = requestAnimationFrame(loop)
  else {
    raf = 0
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

function reduced() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function fireConfetti(o: ConfettiOptions = {}) {
  if (typeof window === 'undefined') return
  ensureCanvas()
  const {
    x = 0.5,
    y = 0.45,
    count = 140,
    angle = -90,
    spread = 75,
    velocity = 15,
    colors = PURPLE_CONFETTI,
    shapes = ['rect', 'rect', 'circle', 'star', 'ribbon'],
    gravity = 0.32,
    scalar = 1,
  } = o
  const n = reduced() ? Math.round(count * 0.3) : count
  const ox = x * window.innerWidth
  const oy = y * window.innerHeight
  for (let i = 0; i < n; i++) {
    const a = ((angle + (Math.random() - 0.5) * spread * 2) * Math.PI) / 180
    const v = velocity * (0.45 + Math.random() * 0.75)
    parts.push({
      x: ox,
      y: oy,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      size: (7 + Math.random() * 7) * scalar,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      life: 220 + Math.random() * 140,
      tilt: Math.random() * Math.PI * 2,
      vt: 0.05 + Math.random() * 0.12,
      gravity: gravity * (0.8 + Math.random() * 0.4),
    })
  }
  if (!raf) raf = requestAnimationFrame(loop)
}

/** Continuous confetti falling from the top. Returns a stop function. */
export function confettiRain({ duration = 5000, perFrame = 3, colors = PURPLE_CONFETTI }: { duration?: number; perFrame?: number; colors?: string[] } = {}) {
  if (typeof window === 'undefined') return () => {}
  ensureCanvas()
  let stopped = false
  const end = performance.now() + duration
  const rate = reduced() ? 0.3 : 1
  const stop = () => {
    stopped = true
    rains.delete(stop)
  }
  rains.add(stop)
  const spawn = () => {
    if (stopped || performance.now() > end) return stop()
    for (let i = 0; i < perFrame * rate; i++) {
      if (Math.random() > rate) continue
      parts.push({
        x: Math.random() * window.innerWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 2,
        vy: 1 + Math.random() * 2.5,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.2,
        size: 7 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: (['rect', 'circle', 'star', 'ribbon'] as const)[Math.floor(Math.random() * 4)],
        life: 600,
        tilt: Math.random() * Math.PI * 2,
        vt: 0.04 + Math.random() * 0.1,
        gravity: 0.05,
      })
    }
    if (!raf) raf = requestAnimationFrame(loop)
    requestAnimationFrame(spawn)
  }
  spawn()
  return stop
}

/**
 * Sweep the floor: stop every rain and drop all particles right now.
 * The app calls this when the brain-wipe covers the screen, so one scene's
 * celebration never keeps falling into the next scene.
 */
export function clearConfetti() {
  rains.forEach((stop) => stop())
  parts = []
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  if (ctx && canvas) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}
