/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CHARACTER ART CONFIG — swap the built-in SVG characters for real images here.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  renderer: 'svg'   → the built-in layered, animated SVG character (default)
 *  renderer: 'image' → use your own images, one per expression. Missing expressions
 *                      fall back to `neutral`. PNG / WebP / GIF / animated WebP all work.
 *                      Files go in /public/characters/<name>/…
 *
 *  Whole-body animation (bobbing, squash & stretch, tantrums, dancing, attacks) is
 *  applied by the character rig in BOTH modes, so swapped art still moves.
 *
 *  Example:
 *    cartman: {
 *      renderer: 'image',
 *      images: { neutral: '/characters/cartman/neutral.png', angry: '/characters/cartman/angry.png' },
 *    },
 */
import type { CartmanExpression, PeterExpression, TungExpression } from './types'

export interface CharacterArt<E extends string> {
  renderer: 'svg' | 'image'
  images: Partial<Record<E, string>>
  /** width / height of your images (keeps layout identical to the SVG) */
  aspect?: number
}

export const characterArt: {
  cartman: CharacterArt<CartmanExpression>
  peter: CharacterArt<PeterExpression>
  tung: CharacterArt<TungExpression>
} = {
  cartman: { renderer: 'svg', images: {} },
  peter: { renderer: 'svg', images: {} },
  tung: { renderer: 'svg', images: {} },
}
