import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { soundtrack } from '../../audio/soundtrack'
import { BigButton } from '../../components/ui/BigButton'
import { ComicBurst } from '../../components/ui/ComicBurst'
import { fireConfetti } from '../../components/ui/confetti'
import { useShake } from '../../components/ui/shake'
import { toast } from '../../components/ui/toast'
import type { SceneProps } from '../../state/app'
import { createBerryPit, play, prefersReduced, relBox, spawn, type BerryPit } from './fx'
import { Seal } from './Seal'
import { StickerSlot } from './StickerSlot'
import { STICKERS, type StageApi, type StickerId } from './stickers'
import { Subtitle } from './Subtitle'
import { Ticker } from './Ticker'
import { Title } from './Title'
import './landing.css'

interface BurstState {
  id: number
  text: string
  x: number
  y: number
  color: string
  size: number
  rotate: number
}

const SPARKLE_COLORS = ['#c9b3ff', '#c8ff2e', '#ff3ea5', '#38e8ff', '#ffffff', '#ffd23f']

/** Deterministic sparkle field (no Math.random in render). */
function useSparkles(n: number) {
  return useMemo(() => {
    let s = 7
    const r = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    return Array.from({ length: n }, (_, i) => ({
      left: `${(r() * 96 + 2).toFixed(1)}%`,
      top: `${(r() * 88 + 8).toFixed(1)}%`,
      size: Math.round(8 + r() * 16),
      delay: `${(r() * -6).toFixed(2)}s`,
      dur: `${(2.4 + r() * 3).toFixed(2)}s`,
      color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
    }))
  }, [n])
}

export default function Landing({ onNext }: SceneProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const colRef = useRef<HTMLDivElement>(null)
  const tickerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const fxLayerRef = useRef<HTMLDivElement>(null)
  const pit = useRef<BerryPit | null>(null)
  const slots = useRef(new Map<StickerId, HTMLDivElement>())
  const poked = useRef(new Set<StickerId>())
  const achieved = useRef(false)
  const leaving = useRef(false)
  const timeouts = useRef<number[]>([])
  const [pokedCount, setPokedCount] = useState(0)
  const [total, setTotal] = useState(STICKERS.length)
  const [burst, setBurst] = useState<BurstState | null>(null)
  const shake = useShake()
  const sparkles = useSparkles(22)

  // ---- pointer parallax (motion values only, no re-renders) ----
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const px = useSpring(mx, { stiffness: 55, damping: 15, mass: 0.7 })
  const py = useSpring(my, { stiffness: 55, damping: 15, mass: 0.7 })
  const titleX = useTransform(px, (v) => v * -9)
  const titleY = useTransform(py, (v) => v * -6)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1)
      my.set((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [mx, my])

  // ---- blueberry physics layer ----
  useEffect(() => {
    if (!fxLayerRef.current) return
    const p = createBerryPit(fxLayerRef.current)
    pit.current = p
    const pending = timeouts.current
    return () => {
      p.destroy()
      pit.current = null
      pending.forEach((t) => window.clearTimeout(t))
      pending.length = 0
    }
  }, [])

  const countVisible = useCallback(() => {
    const vis: StickerId[] = []
    slots.current.forEach((el, id) => {
      if (el.offsetParent !== null) vis.push(id)
    })
    return vis
  }, [])

  // ---- measure the content column so portrait layouts can park stickers in the free bands ----
  useLayoutEffect(() => {
    const root = rootRef.current
    const col = colRef.current
    if (!root || !col) return
    const measure = () => {
      const r = root.getBoundingClientRect()
      const c = col.getBoundingClientRect()
      const t = tickerRef.current?.getBoundingClientRect()
      const tb = t ? t.bottom - r.top : 0
      root.style.setProperty('--top-start', `${Math.round(tb)}px`)
      root.style.setProperty('--top-h', `${Math.max(0, Math.round(c.top - r.top - tb))}px`)
      root.style.setProperty('--bot-start', `${Math.round(c.bottom - r.top)}px`)
      root.style.setProperty('--bot-h', `${Math.max(0, Math.round(r.bottom - c.bottom))}px`)
      const vis = countVisible()
      setTotal(vis.length)
      setPokedCount(vis.filter((id) => poked.current.has(id)).length)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    ro.observe(col)
    return () => ro.disconnect()
  }, [countVisible])

  const register = useCallback((id: StickerId, el: HTMLDivElement | null) => {
    if (el) slots.current.set(id, el)
    else slots.current.delete(id)
  }, [])

  const later = useCallback((fn: () => void, ms: number) => {
    timeouts.current.push(window.setTimeout(fn, ms))
  }, [])

  const stage: StageApi = useMemo(
    () => ({
      root: () => rootRef.current,
      shake,
      burst: (text, x, y, o = {}) => {
        const size = o.size ?? 180
        setBurst({ id: performance.now(), text, x, y, color: o.color ?? 'var(--sun)', size, rotate: o.rotate ?? -8 })
      },
      berries: (x, y, n, size) => pit.current?.burst(x, y, n, size),
      confetti: (x, y, count = 80) => fireConfetti({ x, y, count, spread: 55, velocity: 13, angle: -90 }),
    }),
    [shake],
  )

  const onPoke = useCallback(
    (id: StickerId) => {
      if (poked.current.has(id)) return
      poked.current.add(id)
      const vis = countVisible()
      const done = vis.filter((v) => poked.current.has(v)).length
      setPokedCount(done)
      if (done >= vis.length && !achieved.current) {
        achieved.current = true
        later(() => {
          toast('BRAINROT ACHIEVEMENT UNLOCKED', { body: 'Poked every item in the starter pack. Brain: fully rotted.', icon: '🏆', duration: 4200 })
          play('fanfare', { delay: 0.15, volume: 0.8 })
          fireConfetti({ x: 0.5, y: 0.32, count: 90, spread: 80, velocity: 14 })
        }, 950)
      }
    },
    [countVisible, later],
  )

  // ---- ENTER: suck the stickers into the button, then hand off to the brain-wipe ----
  const enter = () => {
    if (leaving.current) return
    leaving.current = true
    play('vineBoom')
    // this click is the gesture that unlocks music; start it now, let the outro breathe, then wipe
    soundtrack.startIfIdle()
    const root = rootRef.current
    const cta = ctaRef.current?.querySelector('.bb')
    if (!root || !cta || prefersReduced()) {
      onNext()
      return
    }
    later(onNext, 220)
    const b = relBox(cta, root)
    let k = 0
    slots.current.forEach((el) => {
      const s = relBox(el, root)
      const dx = b.cx - s.cx
      const dy = b.cy - s.cy
      el.animate(
        [
          { transform: 'translate(0px, 0px) scale(1) rotate(0deg)', opacity: 1, easing: 'cubic-bezier(.2,.7,.3,1)' },
          { transform: `translate(${-dx * 0.1}px, ${-dy * 0.1}px) scale(1.14) rotate(${k % 2 ? 12 : -12}deg)`, opacity: 1, offset: 0.24, easing: 'cubic-bezier(.55,0,.85,.4)' },
          { transform: `translate(${dx}px, ${dy}px) scale(0.05) rotate(${k % 2 ? 420 : -420}deg)`, opacity: 0.3 },
        ],
        { duration: 520, delay: k * 14, fill: 'forwards' },
      )
      k++
    })
    titleRef.current?.animate(
      [
        { transform: 'scale(1)', opacity: 1, easing: 'ease-out' },
        { transform: 'scale(0.92) rotate(-2deg)', opacity: 1, offset: 0.25, easing: 'cubic-bezier(.5,0,.8,.4)' },
        { transform: 'scale(1.4) rotate(1deg)', opacity: 0 },
      ],
      { duration: 560, fill: 'forwards' },
    )
    root.querySelector('.pack')?.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-40px) rotate(-8deg)' }], { duration: 380, fill: 'forwards' })
    root.querySelector('.sub')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' })
    root.querySelector('.hint')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' })
    if (fxLayerRef.current)
      for (let i = 0; i < 3; i++)
        spawn(fxLayerRef.current, {
          className: 'lfx-ring',
          x: b.cx,
          y: b.cy,
          keyframes: [
            { transform: 'translate(-50%,-50%) scale(0.2)', opacity: 0.95 },
            { transform: 'translate(-50%,-50%) scale(10)', opacity: 0 },
          ],
          duration: 650,
          delay: i * 110,
          easing: 'cubic-bezier(.2,.7,.3,1)',
        })
    shake({ strength: 'medium', duration: 0.45 })
  }

  return (
    <div className="landing" ref={rootRef}>
      <div className="landing__bg" aria-hidden="true">
        <div className="landing__rays is-ambient" />
        <div className="landing__halo" />
        {sparkles.map((s, i) => (
          <span
            key={i}
            className="landing__spark is-ambient"
            style={{ left: s.left, top: s.top, width: s.size, height: s.size, background: s.color, animationDelay: s.delay, animationDuration: s.dur } as CSSProperties}
          />
        ))}
      </div>

      <div className="landing__ticker" ref={tickerRef}>
        <Ticker />
      </div>

      <div className="landing__center">
        <div className="landing__col" ref={colRef}>
          <motion.div
            className="pack"
            initial={{ y: -40, opacity: 0, rotate: -14, scale: 1.4 }}
            animate={{ y: 0, opacity: 1, rotate: -3, scale: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 15, delay: 0.05 }}
          >
            <span className="pack__tape pack__tape--l" />
            <span className="pack__tape pack__tape--r" />
            Albert&rsquo;s Starter Pack
          </motion.div>

          <motion.div className="landing__title" ref={titleRef} style={{ x: titleX, y: titleY }}>
            <Title base={0.18} />
            <Seal delay={1.25} />
          </motion.div>

          <Subtitle delay={0.65} />

          <motion.div
            className="cta"
            ref={ctaRef}
            initial={{ y: 40, opacity: 0, scale: 0.7 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 1.35 }}
          >
            <div className="cta__btn">
              <span className="cta__glow" aria-hidden="true" />
              <BigButton size="xl" variant="hot" wiggle sound={false} trailing={<span aria-hidden="true">→</span>} onClick={enter}>
                Enter Albert&rsquo;s Brain
              </BigButton>
            </div>
            <p className="hint">
              {pokedCount >= total && total > 0 ? (
                <span className="hint__done">brain fully rotted ✓</span>
              ) : (
                <span className="hint__text">psst… poke the stickers</span>
              )}
              <span className={`hint__count ${pokedCount >= total ? 'is-done' : ''}`}>
                {pokedCount}/{total}
              </span>
            </p>
          </motion.div>
        </div>
      </div>

      <div className="landing__stickers">
        {STICKERS.map((def, i) => (
          <StickerSlot key={def.id} def={def} index={i} delay={0.55 + i * 0.11} px={px} py={py} stage={stage} onPoke={onPoke} register={register} />
        ))}
      </div>

      <div className="landing__fx" ref={fxLayerRef} aria-hidden="true" />
      {burst && (
        <ComicBurst
          id={burst.id}
          text={burst.text}
          color={burst.color}
          size={burst.size}
          rotate={burst.rotate}
          duration={850}
          className="landing__burst"
          style={{ left: burst.x - burst.size / 2, top: burst.y - burst.size / 2 }}
        />
      )}
    </div>
  )
}
