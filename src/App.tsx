import { MotionConfig } from 'motion/react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type LazyExoticComponent } from 'react'
import { sfx } from './audio/sfx'
import { soundtrack } from './audio/soundtrack'
import { AmbientBackground } from './components/chrome/AmbientBackground'
import { BrainWipe } from './components/chrome/BrainWipe'
import { SceneErrorBoundary } from './components/chrome/SceneErrorBoundary'
import { SceneLoader } from './components/chrome/SceneLoader'
import { TopBar } from './components/chrome/TopBar'
import { MusicPlayer } from './components/MusicPlayer/MusicPlayer'
import { clearConfetti } from './components/ui/confetti'
import { ShakeProvider, useShakeTarget } from './components/ui/shake'
import { Toaster } from './components/ui/toast'
import { AppContext, nextScene, SCENE_ORDER, type AppContextValue, type SceneId, type SceneProps } from './state/app'

type SceneModule = { default: ComponentType<SceneProps> }

const loaders: Record<SceneId, () => Promise<SceneModule>> = {
  landing: () => import('./scenes/landing/Landing'),
  cartman: () => import('./scenes/cartman/CartmanScene'),
  tung: () => import('./scenes/tung/TungScene'),
  peter: () => import('./scenes/peter/PeterScene'),
}

const SCENE_COMPONENTS = Object.fromEntries(
  SCENE_ORDER.map((id) => [id, lazy(loaders[id])]),
) as Record<SceneId, LazyExoticComponent<ComponentType<SceneProps>>>

/**
 * React.lazy remembers a failed import forever, so "Try again" after a chunk failed
 * to download would just fail again. Swap in a fresh lazy wrapper before retrying.
 */
function resetSceneLoader(id: SceneId) {
  SCENE_COMPONENTS[id] = lazy(loaders[id])
}

/** Chrome / Firefox / Safari wording for "the scene's JS chunk didn't download". */
function isChunkLoadError(error: Error) {
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(error.message)
}

// Character sheets for development only (#/dev/cartman…). Production builds drop the chunk entirely.
const DevGallery = import.meta.env.DEV ? lazy(() => import('./dev/DevGallery')) : null

function parseHash(): { scene?: SceneId; dev?: string } {
  const h = window.location.hash.replace(/^#\/?/, '')
  if (h.startsWith('dev/')) return { dev: h.slice(4) }
  if ((SCENE_ORDER as string[]).includes(h)) return { scene: h as SceneId }
  return {}
}

const COMPLETED_KEY = 'abbs.completed.v1'
function loadCompleted(): Set<SceneId> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(COMPLETED_KEY) ?? '[]')
    return new Set(Array.isArray(raw) ? raw.filter((s): s is SceneId => (SCENE_ORDER as unknown[]).includes(s)) : [])
  } catch {
    return new Set()
  }
}

/* ------------------------------------------------------------------ */
/* Focus keeper                                                         */
/* ------------------------------------------------------------------ */

const FOCUSABLE = 'button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'

/** Classes that say *what* a control is ("pt-cta", "cms-ask"), not how it looks right now (bb--hot, is-busy). */
function roleClasses(el: Element) {
  return [...el.classList].filter((c) => !c.startsWith('bb') && !c.startsWith('is-') && !c.includes('--'))
}
const labelOf = (el: Element) => (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 80)
const canFocus = (el: HTMLElement) =>
  el.isConnected && !(el as HTMLButtonElement).disabled && !el.closest('[inert], [aria-hidden="true"]') && el.getClientRects().length > 0

interface LostFocus {
  el: HTMLElement
  classes: string[]
  label: string
  x: number
  y: number
}

/** The control that took over from the one that just vanished (same role class, else same label; nearest wins). */
function findReplacement(root: HTMLElement, lost: LostFocus): HTMLElement | null {
  let best: HTMLElement | null = null
  let bestScore = 0
  let bestDist = Infinity
  root.querySelectorAll<HTMLElement>(FOCUSABLE).forEach((el) => {
    if (el === lost.el || !canFocus(el)) return
    const score = lost.classes.length ? roleClasses(el).filter((c) => lost.classes.includes(c)).length : lost.label && labelOf(el) === lost.label ? 1 : 0
    if (!score) return
    const r = el.getBoundingClientRect()
    const dist = Math.hypot(r.x + r.width / 2 - lost.x, r.y + r.height / 2 - lost.y)
    if (score > bestScore || (score === bestScore && dist < bestDist)) {
      best = el
      bestScore = score
      bestDist = dist
    }
  })
  return best
}

/**
 * Scenes swap their buttons all the time (a new label = a new element, a finale disables one).
 * For a keyboard user the browser then drops focus to <body>: the next Enter does nothing and the
 * next Tab starts over at the top bar. When that happens inside the stage, put focus on the control
 * that replaced it (or the same one once it's usable again); failing that, on the stage itself so
 * Tab continues inside the scene — and keep looking for a replacement for a moment.
 * Mouse/touch users are left alone, and so are brain-wipes (App handles focus after those).
 */
function useFocusKeeper(stageRef: { current: HTMLElement | null }, wipingRef: { current: boolean }) {
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let keyboard = false
    let timer = 0
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) keyboard = true
    }
    const onPointer = (e: PointerEvent) => {
      // Motion's whileTap answers Enter/Space with synthetic pointer events: those aren't a pointer
      if (e.isTrusted) keyboard = false
    }
    const onFocusOut = (e: FocusEvent) => {
      const el = e.target
      // relatedTarget set = focus moved somewhere on purpose; a window blur keeps activeElement
      if (!keyboard || e.relatedTarget || !(el instanceof HTMLElement) || el === stage || wipingRef.current) return
      const r = el.getBoundingClientRect()
      const lost: LostFocus = { el, classes: roleClasses(el), label: labelOf(el), x: r.x + r.width / 2, y: r.y + r.height / 2 }
      const started = performance.now()
      const check = (first: boolean) => {
        const a = document.activeElement
        if ((a && a !== document.body && a !== stage) || wipingRef.current || !keyboard) return
        if (canFocus(lost.el)) {
          // still there and usable: on the first look that means someone blurred it on purpose
          // (leave it); later it means it was only disabled/hidden for a moment (go back to it)
          if (!first) lost.el.focus({ preventScroll: true })
          return
        }
        const target = findReplacement(stage, lost)
        if (target) return target.focus({ preventScroll: true })
        if (a !== stage) stage.focus({ preventScroll: true })
        if (performance.now() - started < 2000) timer = window.setTimeout(() => check(false), 120)
      }
      window.clearTimeout(timer)
      timer = window.setTimeout(() => check(true), 0)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onPointer, true)
    stage.addEventListener('focusout', onFocusOut)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onPointer, true)
      stage.removeEventListener('focusout', onFocusOut)
    }
  }, [stageRef, wipingRef])
}

export default function App() {
  const initial = useMemo(parseHash, [])
  if (initial.dev && DevGallery) {
    return (
      <Suspense fallback={<SceneLoader />}>
        <DevGallery which={initial.dev} />
      </Suspense>
    )
  }
  return (
    <ShakeProvider>
      <Experience initialScene={initial.scene ?? 'landing'} />
    </ShakeProvider>
  )
}

function Experience({ initialScene }: { initialScene: SceneId }) {
  const [scene, setScene] = useState<SceneId>(initialScene)
  const [completed, setCompleted] = useState<Set<SceneId>>(loadCompleted)
  const [wipeTo, setWipeTo] = useState<SceneId | null>(null)
  /** the goo has started lifting off the new scene (entrances may play now) */
  const [revealing, setRevealing] = useState(false)
  const [calm, setCalm] = useState(false)
  const [sceneKey, setSceneKey] = useState(0)
  const shakeRef = useShakeTarget()
  const stageRef = useRef<HTMLElement | null>(null)
  const sceneRef = useRef(scene)
  const calmRef = useRef(calm)
  const wipingRef = useRef(false)
  useEffect(() => {
    sceneRef.current = scene
    calmRef.current = calm
    wipingRef.current = wipeTo !== null
  }, [scene, calm, wipeTo])

  const setStageRef = useCallback(
    (el: HTMLElement | null) => {
      stageRef.current = el
      if (shakeRef) shakeRef.current = el as HTMLDivElement | null
    },
    [shakeRef],
  )

  useEffect(() => {
    soundtrack.preload()
    // warm up the next chunks while the user reads the landing page
    const id = window.setTimeout(() => SCENE_ORDER.forEach((s) => void loaders[s]().catch(() => {})), 2500)
    return () => window.clearTimeout(id)
  }, [])

  // Deep link straight into an experience (#/tung, or a reload mid-scene): nobody pressed ENTER,
  // so let the first real interaction start the soundtrack, the way ENTER does on the landing.
  // (Audio itself is unlocked on every gesture by installAudioUnlock in main.tsx.)
  // Only user-activation events count — a touch `pointerdown` isn't one, and a music file's
  // play() would be rejected there — and we keep listening until the music really plays
  // (a blocked attempt retries on the next tap) or the user takes over the player.
  useEffect(() => {
    if (initialScene === 'landing') return
    const types = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const
    const IGNORED_KEYS = ['Tab', 'Shift', 'Alt', 'Control', 'Meta', 'Escape', 'CapsLock']
    function onGesture(e: Event) {
      if (!e.isTrusted) return
      if (e instanceof KeyboardEvent && IGNORED_KEYS.includes(e.key)) return
      if (e instanceof PointerEvent) {
        const mouse = e.pointerType === 'mouse'
        if (e.type === 'pointerdown' ? !mouse : mouse) return
      }
      // the music player handles its own buttons; the landing starts music on ENTER;
      // the birthday video wants silence
      if ((e.target as Element | null)?.closest?.('.mp')) return
      if (sceneRef.current === 'landing' || calmRef.current) return
      soundtrack.startIfIdle()
    }
    let unsub = () => {}
    const off = () => {
      types.forEach((t) => window.removeEventListener(t, onGesture, true))
      unsub()
    }
    const settled = () => {
      const s = soundtrack.getState()
      // playing for real, or the user paused / it ended on purpose
      return (s.playing && !s.loading) || (s.started && !s.playing && !s.blocked)
    }
    if (settled()) return
    types.forEach((t) => window.addEventListener(t, onGesture, { capture: true, passive: true }))
    unsub = soundtrack.subscribe(() => {
      if (settled()) off()
    })
    return off
  }, [initialScene])

  useFocusKeeper(stageRef, wipingRef)

  useEffect(() => {
    document.documentElement.dataset.calm = calm ? 'true' : 'false'
  }, [calm])

  useEffect(() => {
    document.documentElement.dataset.scene = scene
    const hash = scene === 'landing' ? '' : `#/${scene}`
    if (window.location.hash !== hash) history.replaceState(null, '', hash || window.location.pathname + window.location.search)
  }, [scene])

  const go = useCallback(
    (to: SceneId) => {
      if (wipeTo) return
      // every navigation is a user gesture: a good moment to (re)start music
      soundtrack.startIfIdle()
      if (calm) {
        setCalm(false)
        soundtrack.fadeIn(1200)
      }
      sfx.play('whoosh')
      wipingRef.current = true
      setWipeTo(to)
    },
    [wipeTo, calm],
  )

  const markComplete = useCallback((id: SceneId) => {
    setCompleted((prev) => {
      if (prev.has(id)) return prev
      const nextSet = new Set(prev).add(id)
      try {
        localStorage.setItem(COMPLETED_KEY, JSON.stringify([...nextSet]))
      } catch {
        /* ignore */
      }
      return nextSet
    })
  }, [])

  const ctx: AppContextValue = useMemo(
    () => ({
      scene,
      completed,
      go,
      next: () => go(nextScene(scene)),
      markComplete,
      calm,
      setCalm,
      transitioning: wipeTo !== null && !revealing,
      wiping: wipeTo !== null,
    }),
    [scene, completed, go, markComplete, calm, wipeTo, revealing],
  )

  const Scene = SCENE_COMPONENTS[scene]
  const sceneProps: SceneProps = useMemo(
    () => ({
      onComplete: () => markComplete(scene),
      onNext: () => go(nextScene(scene)),
      go,
    }),
    [scene, markComplete, go],
  )

  const onCovered = useCallback(() => {
    if (!wipeTo) return
    // behind the goo: sweep up the last scene's confetti and swap scenes
    clearConfetti()
    setScene(wipeTo)
    setSceneKey((k) => k + 1)
    return loaders[wipeTo]()
  }, [wipeTo])

  const onReveal = useCallback(() => setRevealing(true), [])

  const onWipeDone = useCallback(() => {
    wipingRef.current = false
    setWipeTo(null)
    setRevealing(false)
    // keyboard users: if the button they pressed went away with the old scene, start the
    // next Tab inside the new scene instead of back at the top of the page
    const active = document.activeElement
    if (!active || active === document.body) stageRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <AppContext.Provider value={ctx}>
      <MotionConfig reducedMotion="user">
        <div className={`app app--${scene} ${calm ? 'app--calm' : ''}`}>
          <AmbientBackground scene={scene} />
          {scene !== 'landing' && <TopBar />}
          <main className="app__stage" ref={setStageRef} tabIndex={-1}>
            <SceneErrorBoundary
              key={`${scene}-${sceneKey}`}
              onRetry={(error) => {
                // the browser caches a failed module fetch, so only a reload really retries it
                // (the hash keeps us on this scene, completed chapters live in localStorage)
                if (isChunkLoadError(error)) return window.location.reload()
                resetSceneLoader(scene)
                setSceneKey((k) => k + 1)
              }}
              onSkip={() => go(nextScene(scene) === scene ? 'landing' : nextScene(scene))}
            >
              <Suspense fallback={<SceneLoader />}>
                <Scene {...sceneProps} />
              </Suspense>
            </SceneErrorBoundary>
          </main>
          <MusicPlayer />
          <Toaster />
          <BrainWipe to={wipeTo} onCovered={onCovered} onReveal={onReveal} onDone={onWipeDone} />
        </div>
      </MotionConfig>
    </AppContext.Provider>
  )
}
