import { motion, useReducedMotion, useTransform } from 'motion/react'
import { useId } from 'react'
import { characterArt } from '../config'
import { ImageCharacter } from '../ImageCharacter'
import type { CartmanExpression, CartmanProps } from '../types'
import { CartmanSvg } from './CartmanSvg'
import { POSES } from './rig'
import { useCartmanRig, type Rig } from './useCartmanRig'

/**
 * Eric Cartman — layered, procedurally animated South Park cut-out.
 * Fills its parent box (aspect 1), feet on the bottom edge. See CartmanProps for the API.
 */
export function Cartman({
  expression = 'neutral',
  pose = 'idle',
  talking = false,
  intensity = 0,
  redness = 0,
  steam = false,
  flip = false,
  className,
  style,
  label = 'Eric Cartman',
}: CartmanProps) {
  const reduced = !!useReducedMotion()
  const rig = useCartmanRig({ expression, pose, talking, intensity, redness, flip, reduced })
  const uid = 'cm' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const art = characterArt.cartman
  const { handL, handR } = POSES[pose] ?? POSES.idle

  return (
    <div className={className ? `cartman ${className}` : 'cartman'} style={{ position: 'relative', width: '100%', height: '100%', ...style }} role="img" aria-label={label}>
      {art.renderer === 'image' ? (
        <ImageRig rig={rig} images={art.images} expression={expression} talking={talking} label={label} />
      ) : (
        <CartmanSvg
          rig={rig}
          uid={uid}
          handL={handL}
          handR={handR}
          crying={expression === 'crying'}
          furious={expression === 'furious'}
          sheepish={expression === 'sheepish'}
          steam={steam}
        />
      )}
    </div>
  )
}

/** Same whole-body rig, but moving the owner's image art instead of the SVG. */
function ImageRig({ rig, images, expression, talking, label }: { rig: Rig; images: Partial<Record<CartmanExpression, string>>; expression: CartmanExpression; talking: boolean; label: string }) {
  // rig values are in 400-unit viewBox space → percentages of the box
  const pct = (v: number) => `${v / 4}%`
  const x = useTransform(rig.rootX, pct)
  const y = useTransform(() => pct(rig.rootY.get() + rig.headY.get() * 0.35))
  const rotate = useTransform(() => rig.rootRot.get() + rig.headRot.get() * 0.3)
  const fill = { position: 'absolute', inset: 0 } as const
  return (
    <motion.div style={{ ...fill, scaleX: rig.flipSX, originX: 0.5 }}>
      <motion.div style={{ ...fill, x, y, rotate, originX: 0.5, originY: 0.75 }}>
        <motion.div style={{ ...fill, scaleX: rig.bodySX, scaleY: rig.bodySY, originX: 0.5, originY: 1 }}>
          <ImageCharacter images={images} expression={expression} alt={label} talking={talking} />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default Cartman
