import { createContext, useContext } from 'react'

export type SceneId = 'landing' | 'cartman' | 'tung' | 'peter'

export const SCENE_ORDER: SceneId[] = ['landing', 'cartman', 'tung', 'peter']

export interface SceneMeta {
  id: SceneId
  chapter: number
  short: string
  title: string
  /** short line for the transition screen */
  loading: string
  /** scene accent color */
  accent: string
}

export const SCENES: Record<SceneId, SceneMeta> = {
  landing: { id: 'landing', chapter: 0, short: 'Start', title: "Albert's Starter Pack", loading: 'Rebooting brain…', accent: '#c8ff2e' },
  cartman: { id: 'cartman', chapter: 1, short: 'Cartman', title: "Cartman's Birthday Roast", loading: 'Locating an apology…', accent: '#ff3b4e' },
  tung: { id: 'tung', chapter: 2, short: 'Tung Tung', title: 'Tung Tung Tung Sahur Boss Fight', loading: 'Waking up for sahur…', accent: '#ff8a2b' },
  peter: { id: 'peter', chapter: 3, short: 'Peter', title: "Peter Griffin's Birthday Present", loading: 'Wrapping the present…', accent: '#38e8ff' },
}

/** Props every scene component receives. */
export interface SceneProps {
  /** Mark this experience complete (shows a check in the chapter nav). Idempotent. */
  onComplete: () => void
  /** Go to the next experience with the brain-wipe transition. */
  onNext: () => void
  /** Go to any scene. */
  go: (id: SceneId) => void
}

export interface AppContextValue {
  scene: SceneId
  completed: ReadonlySet<SceneId>
  go: (id: SceneId) => void
  next: () => void
  markComplete: (id: SceneId) => void
  /** Calm mode: dims ambient animation + chrome while the birthday video plays. */
  calm: boolean
  setCalm: (calm: boolean) => void
  /**
   * true while the brain-wipe covers the screen. It turns false the moment the goo starts lifting
   * off the new scene, so entrances (and scene intros gated on it) play in view instead of hidden.
   */
  transitioning: boolean
  /** true for the whole brain-wipe, lift included (navigation is locked until it's gone) */
  wiping: boolean
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const v = useContext(AppContext)
  if (!v) throw new Error('useApp must be used inside <App>')
  return v
}

export function nextScene(id: SceneId): SceneId {
  const i = SCENE_ORDER.indexOf(id)
  return SCENE_ORDER[Math.min(SCENE_ORDER.length - 1, i + 1)]
}
