import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { PeterPose } from '../../characters/types'

/** Named stage marks (x = horizontal center, px from the stage's left edge). */
export type PeterSpot = 'home' | 'front' | 'stage' | 'nearGift' | 'mid' | 'aside' | 'watch' | 'off'
export type GiftSpot = 'home' | 'pushed' | 'center' | 'peek'

/**
 * - phone: narrow portrait — Peter overlaps the box a little, bubble above his head
 * - wide:  tablets / laptops — bubble beside his head when there's room, else above
 * - short: landscape phones / short windows — no room above him, so the bubble always sits
 *          beside his head and the pair moves right to make space for it
 */
export type StageMode = 'phone' | 'wide' | 'short'

export interface StageLayout {
  W: number
  H: number
  mode: StageMode
  /** Peter's box height (width = ph * 0.62) */
  ph: number
  pw: number
  /** gift box width (height ≈ gs * 1.04 incl. bow) */
  gs: number
  /** distance from the stage bottom to the floor line the feet stand on */
  floor: number
  /** phone layout (kept for the gift tag side) */
  compact: boolean
  /** screen-edge margin the art keeps */
  edge: number
  peter: Record<PeterSpot, number>
  gift: Record<GiftSpot, number>
}

const ASPECT = 0.62

/**
 * How far Peter's art reaches left / right of his center, × his box width (measured from the rig
 * at the intensities the scene uses, animation included). The box is only ±0.5 — wide poses
 * overflow it, so the marks below keep every pose on screen.
 */
export const REACH: Record<PeterPose, readonly [number, number]> = {
  idle: [0.6, 0.64],
  walk: [0.76, 0.81],
  block: [0.94, 0.96],
  dance: [1.02, 1.06],
  push: [0.54, 1.14],
  kneePain: [0.98, 0.86],
  laugh: [0.77, 0.68],
  thumbsUp: [0.66, 0.62],
  present: [0.92, 0.76],
  shrug: [0.8, 0.82],
}
/** reach with the art mirrored */
export const reachOf = (pose: PeterPose, flip: boolean): readonly [number, number] => {
  const r = REACH[pose]
  return flip ? [r[1], r[0]] : r
}

/** everything he does at his home mark (laugh, shrug, thumbs up…) fits inside this */
const HOME_REACH = 0.8
/** the tallest poses (laugh / present / walk bob) stand ~1.12 × his box */
const HEAD_ROOM = 0.13
/** room the side bubble needs left of his head in the short layout */
const SIDE_BUBBLE = 250

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** nearest x to `x` where `pose` (mirrored or not) stays fully on screen */
export function fitPose(l: StageLayout, x: number, pose: PeterPose, flip = false) {
  const [a, b] = reachOf(pose, flip)
  const lo = a * l.pw + l.edge
  const hi = l.W - b * l.pw - l.edge
  return lo > hi ? l.W / 2 : clamp(x, lo, hi)
}

export function computeLayout(W: number, H: number): StageLayout {
  // a short, wide stage (landscape phones, short windows) beats "narrow": there's no headroom
  const short = H < 430 && W > H * 1.25
  const compact = W < 640 && !short
  const mode: StageMode = compact ? 'phone' : short ? 'short' : 'wide'
  const giftRatio = compact ? 0.7 : 0.74
  const M = Math.max(6, Math.min(28, W * 0.022)) // screen-edge margin for the art
  const floor = compact || short ? Math.max(8, H * 0.03) : Math.max(14, H * 0.05)

  // vertical budget: phones / desktops keep room above his head for a ~3-line bubble
  const bubbleRoom = compact ? Math.max(158, H * 0.27) : short ? 0 : Math.min(170, Math.max(118, H * 0.27))
  const byHeight = short ? (H - floor - 6) / (1 + HEAD_ROOM) : H - floor - bubbleRoom
  // horizontal budget: [reach][Peter][gap][gift]; phones overlap Peter and the box a little
  const overlap = compact ? 0.11 : 0
  const spanK = (HOME_REACH + 0.5) * ASPECT + giftRatio - overlap // span / ph (without a positive gap)
  const wideGap = Math.max(24, W * 0.035)
  const side = short ? SIDE_BUBBLE : 0
  const byWidth = compact ? (W - 2 * M) / spanK : (W - 2 * M - side - wideGap - (short ? 0 : 60)) / spanK
  const ph = Math.max(140, Math.min(560, byHeight, byWidth))
  const gap = compact ? -ph * overlap : wideGap
  const pw = ph * ASPECT
  const gs = ph * giftRatio
  const span = (HOME_REACH + 0.5) * pw + gap + gs
  // left edge of the group (incl. Peter's reach); short: centered in what the bubble leaves free
  const left = short ? M + side + Math.max(0, (W - 2 * M - side - span) * 0.5) : Math.max(M, (W - span) / 2)
  const peterHome = left + HOME_REACH * pw
  const giftHome = peterHome + pw / 2 + gap + gs / 2

  // keep a pose's art on screen at x (lo/hi = reach × pw)
  const fit = (x: number, pose: PeterPose, flip = false) => {
    const [l, r] = reachOf(pose, flip)
    const lo = l * pw + M
    const hi = W - r * pw - M
    return lo > hi ? W / 2 : clamp(x, lo, hi)
  }

  // shoved towards the right edge — far enough to read as a shove even when that means
  // sliding partly off-stage (but at least ~55% of it stays visible)
  // (phones: the box already sits at the right edge, so it skids mostly off-screen — "where did it go??"
  // — which also uncovers the TV behind it)
  const giftPushed = compact
    ? Math.max(giftHome + gs * 0.4, W + gs * 0.08)
    : Math.min(giftHome + ph * 0.62, Math.max(W - gs * 0.62, giftHome + gs * 0.4), W - gs * 0.05)
  // the reveal happens center stage, with Peter stepping aside to the left of the box
  // (short: it stays put so his side bubble keeps its room)
  const presentLo = reachOf('present', true)[0] * pw + M
  const giftCenter = short ? giftHome : clamp(W / 2 + pw * 0.22, presentLo + pw * 0.42 + gap + gs / 2, Math.max(giftHome, W - gs / 2 - M))
  const peterMid = fit(peterHome + (giftPushed - gs * 0.5 - pw * 0.4 - peterHome) * 0.55, 'kneePain')
  // the present waddles back by itself while he's down: it stops just past his outstretched leg
  // (not on top of him) when there's room, but always visibly walks back (≥ 0.45 × its width)
  const giftPeek = Math.max(giftHome, Math.min(peterMid + 0.7 * pw + gs * 0.35, giftPushed - gs * 0.45))
  return {
    W,
    H,
    mode,
    ph,
    pw,
    gs,
    floor,
    compact,
    edge: M,
    peter: {
      home: peterHome,
      // blocking: planted in front of the box, both arms out (and still on screen)
      front: Math.max(peterHome, fit(giftHome - gs * 0.08, 'block')),
      // the birthday dance needs room for both fists
      stage: fit(peterHome, 'dance'),
      // shoving: from home his lunge already reaches the box
      nearGift: peterHome,
      mid: peterMid,
      // presenting the box (mirrored, arm sweeping towards it)
      aside: fit(giftCenter - gs * 0.5 - gap - pw * 0.42, 'present', true),
      // after the shove: clear of the TV screen (behind the box's home mark) so it stays in view.
      // Wide stages already have him clear at home; phones overlap him with the box, so step left
      watch: Math.min(peterHome, fit(giftHome - gs * 0.41 - pw * 0.55, 'idle')),
      off: -pw * 1.2,
    },
    gift: { home: giftHome, pushed: giftPushed, center: giftCenter, peek: giftPeek },
  }
}

/**
 * Measures the stage, publishes sizes as CSS variables on it (no re-render needed for sizing),
 * and returns a ref with the latest layout. `onChange` lets the scene snap motion values.
 */
export function useStageLayout(ref: RefObject<HTMLElement | null>, onChange: (l: StageLayout) => void) {
  const layout = useRef<StageLayout>(computeLayout(1200, 700))
  const [ready, setReady] = useState(false)
  const cb = useRef(onChange)
  useLayoutEffect(() => {
    cb.current = onChange
  })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const apply = () => {
      const r = el.getBoundingClientRect()
      if (r.width < 10 || r.height < 10) return
      const l = computeLayout(r.width, r.height)
      layout.current = l
      el.style.setProperty('--ph', `${l.ph}px`)
      el.style.setProperty('--pw', `${l.pw}px`)
      el.style.setProperty('--gs', `${l.gs}px`)
      el.style.setProperty('--floor', `${l.floor}px`)
      el.dataset.mode = l.mode
      cb.current(l)
      setReady(true)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return { layout, ready }
}
