import type { ComponentType } from 'react'
import type { ShakeOptions } from '../../../components/ui/shake'
import type { Timers } from '../fx'

export type StickerId = 'ghost' | 'gorilla' | 'monster' | 'trufru' | 'guitar' | 'piano' | 'records' | 'gloves'

/** Stage-level effects a sticker can trigger (things that escape the sticker's box). */
export interface StageApi {
  /** the landing root (all stage coordinates are relative to it) */
  root: () => HTMLElement | null
  shake: (o?: ShakeOptions) => void
  /** comic starburst centered at (x, y) stage px */
  burst: (text: string, x: number, y: number, o?: { color?: string; size?: number; rotate?: number }) => void
  /** throw frozen blueberries from (x, y) stage px */
  berries: (x: number, y: number, n: number, size: number) => void
  confetti: (x: number, y: number, count?: number) => void
}

export interface PokeCtx {
  svg: SVGSVGElement
  /** whole-sticker transform layer (rotated with the sticker) */
  act: HTMLElement
  /** squash layer (inside act) */
  squash: HTMLElement
  /** unrotated overlay with the sticker's box, for particles */
  fx: HTMLElement
  /** the absolutely positioned slot (raise its z-index for big moves) */
  slot: HTMLElement
  stage: StageApi
  /** per-instance scratch memory */
  mem: Record<string, number>
  timers: Timers
  reduced: boolean
  /** 1-based poke count */
  count: number
}

export interface StickerDef {
  id: StickerId
  /** accessible name */
  label: string
  /** width / height of the art */
  aspect: number
  /** parallax depth multiplier */
  depth: number
  Art: ComponentType
  poke: (ctx: PokeCtx) => void
  /** the sticker does its own squash/anticipation */
  ownSquash?: boolean
}

export const INK = '#0e0620'
