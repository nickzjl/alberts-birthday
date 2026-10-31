import { motion, useTransform, type MotionValue } from 'motion/react'
import { memo, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import { sfx } from '../../audio/sfx'
import { createTimers, play, prefersReduced } from './fx'
import type { StageApi, StickerDef, StickerId } from './stickers'

interface Props {
  def: StickerDef
  index: number
  /** shared pointer position, -1..1, already smoothed */
  px: MotionValue<number>
  py: MotionValue<number>
  stage: StageApi
  onPoke: (id: StickerId) => void
  register: (id: StickerId, el: HTMLDivElement | null) => void
  /** entrance delay (s) */
  delay: number
}

const SQUASH: Keyframe[] = [
  { transform: 'scale(1, 1)' },
  { transform: 'scale(1.2, 0.8)', offset: 0.2 },
  { transform: 'scale(0.9, 1.12)', offset: 0.45 },
  { transform: 'scale(1.04, 0.97)', offset: 0.7 },
  { transform: 'scale(1, 1)' },
]

/**
 * While a sticker is dragged (or springing home), its whole layer rises above the title so the
 * sticker can be dragged over it. A counter keeps the layer up while any sticker is still in flight.
 */
function liftLayer(slot: HTMLElement | null, d: 1 | -1) {
  const layer = slot?.parentElement
  if (!layer) return
  const n = Math.max(0, Number(layer.dataset.lifted ?? 0) + d)
  layer.dataset.lifted = String(n)
  layer.classList.toggle('is-dragging', n > 0)
}

/**
 * One floating sticker. Layers (outside → in):
 *   slot (position, from CSS) › parallax (pointer) › float (CSS idle bob) › entrance slap
 *   › drag/hover button › tilt (base rotation) › act (sticker reactions) › squash › art (die-cut filter)
 * plus an unrotated fx overlay for particles.
 */
export const StickerSlot = memo(function StickerSlot({ def, index, px, py, stage, onPoke, register, delay }: Props) {
  const slotRef = useRef<HTMLDivElement>(null)
  const actRef = useRef<HTMLDivElement>(null)
  const squashRef = useRef<HTMLDivElement>(null)
  const artRef = useRef<HTMLDivElement>(null)
  const fxRef = useRef<HTMLDivElement>(null)
  const dragged = useRef(false)
  const count = useRef(0)
  const mem = useRef<Record<string, number>>({})
  const timers = useMemo(createTimers, [])

  const x = useTransform(px, (v) => v * def.depth * 26)
  const y = useTransform(py, (v) => v * def.depth * 18)
  const rotate = useTransform(px, (v) => v * def.depth * 3)
  const hoverTilt = index % 2 ? 5 : -5

  // layout effect so the parent's first measurement already sees every sticker
  useLayoutEffect(() => {
    register(def.id, slotRef.current)
    return () => {
      register(def.id, null)
      timers.clear()
    }
  }, [def.id, register, timers])

  const poke = () => {
    const svg = artRef.current?.querySelector('svg')
    const act = actRef.current
    const squash = squashRef.current
    const fx = fxRef.current
    const slot = slotRef.current
    if (!svg || !act || !squash || !fx || !slot) return
    count.current += 1
    if (!def.ownSquash) squash.animate(SQUASH, { duration: 460, easing: 'ease-out' })
    def.poke({ svg, act, squash, fx, slot, stage, mem: mem.current, timers, reduced: prefersReduced(), count: count.current })
    onPoke(def.id)
  }

  return (
    <div ref={slotRef} className={`stk stk--${def.id}`} style={{ '--ar': def.aspect, '--i': index } as CSSProperties}>
      <motion.div className="stk__par" style={{ x, y, rotate }}>
        <div className="stk__float">
          <motion.div
            className="stk__in"
            initial={{ scale: 2.4, opacity: 0, rotate: hoverTilt * -4, y: -30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 17, mass: 0.9, delay, opacity: { duration: 0.12, delay } }}
          >
            <motion.button
              type="button"
              className="stk__btn"
              aria-label={`${def.label} — poke it`}
              drag
              dragSnapToOrigin
              dragElastic={0.5}
              dragTransition={{ bounceStiffness: 420, bounceDamping: 13 }}
              whileHover={{ scale: 1.08, rotate: hoverTilt, transition: { type: 'spring', stiffness: 420, damping: 12 } }}
              whileDrag={{ scale: 1.14, rotate: -hoverTilt * 1.4, cursor: 'grabbing' }}
              // no-op until audio is unlocked by a real gesture (never tries to unlock on hover)
              onHoverStart={() => sfx.play('hover', { pitch: 0.8 + index * 0.06, volume: 0.6 })}
              onPointerDown={() => {
                dragged.current = false
              }}
              onDragStart={() => {
                if (slotRef.current) slotRef.current.style.zIndex = '7'
                liftLayer(slotRef.current, 1)
                play('pop', { pitch: 0.8, volume: 0.4 })
              }}
              onDrag={(_, info) => {
                if (Math.hypot(info.offset.x, info.offset.y) > 10) dragged.current = true
              }}
              onDragEnd={() => {
                play('boing', { volume: 0.5, pitch: 1.2 })
                timers.later(() => {
                  if (slotRef.current) slotRef.current.style.zIndex = ''
                  liftLayer(slotRef.current, -1)
                }, 700)
              }}
              onClick={() => {
                if (dragged.current) {
                  dragged.current = false
                  return
                }
                poke()
              }}
            >
              <div className="stk__tilt">
                <div className="stk__act" ref={actRef}>
                  <div className="stk__squash" ref={squashRef}>
                    <div className="stk__art" ref={artRef}>
                      <def.Art />
                    </div>
                  </div>
                </div>
              </div>
              <div className="stk__fx" ref={fxRef} />
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
})
