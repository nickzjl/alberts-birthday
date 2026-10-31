import { useAnimationFrame, useReducedMotionConfig } from 'motion/react'
import { useEffect, useId, useLayoutEffect, useState } from 'react'
import { characterArt } from '../config'
import { ImageCharacter } from '../ImageCharacter'
import type { PeterProps } from '../types'
import { Face, HEAD } from './Face'
import { Arm, BELLY, Belly, CHEST, C, ChestFill, ChestInk, Lapels, Leg, NeckSkin, SleeveFill, SleeveInk, Waist } from './parts'
import { GEO, POSES } from './poses'
import { PeterRig } from './rig'

/**
 * Peter Griffin — layered, procedurally animated SVG character.
 * Fills its parent box (aspect CHARACTER_ASPECT.peter), feet on the bottom edge; wide poses overflow.
 */
export function Peter({ expression = 'neutral', pose = 'idle', talking = false, intensity = 0, flip = false, className, style, label = 'Peter Griffin' }: PeterProps) {
  const uid = 'pg' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const reduced = useReducedMotionConfig() ?? false
  const [rig] = useState(() => new PeterRig(pose, expression))

  useEffect(() => rig.setPose(pose), [rig, pose])
  useEffect(() => rig.setExpression(expression), [rig, expression])
  useEffect(() => rig.setTalking(talking), [rig, talking])
  useEffect(() => rig.setIntensity(intensity), [rig, intensity])
  useEffect(() => rig.setReduced(reduced), [rig, reduced])
  // paint the first frame before the browser shows anything
  useLayoutEffect(() => rig.step(0), [rig])
  useAnimationFrame((_, delta) => rig.step(delta / 1000))

  const art = characterArt.peter
  if (art.renderer === 'image') {
    return (
      <div className={className} style={{ position: 'relative', width: '100%', height: '100%', ...style }} role="img" aria-label={label}>
        <div ref={rig.bind('img')} style={{ position: 'absolute', inset: 0, transformOrigin: '50% 100%', scale: flip ? '-1 1' : undefined }}>
          <ImageCharacter images={art.images} expression={expression} alt={label} talking={talking} />
        </div>
      </div>
    )
  }

  const P = POSES[pose]
  const [handF, handB] = P.hands
  return (
    <svg
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible', ...style }}
      viewBox={`0 0 ${GEO.W} ${GEO.H}`}
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label={label}
    >
      <defs>
        <clipPath id={`${uid}-chest`}>
          <path d={CHEST} />
        </clipPath>
        <clipPath id={`${uid}-belly`}>
          <path d={BELLY} />
        </clipPath>
        <clipPath id={`${uid}-head`}>
          <path d={HEAD} />
        </clipPath>
        <clipPath id={`${uid}-lensL`}>
          <circle cx={GEO.lensL[0]} cy={GEO.lensL[1]} r={GEO.lensL[2] - 0.5} />
        </clipPath>
        <clipPath id={`${uid}-lensR`}>
          <circle cx={GEO.lensR[0]} cy={GEO.lensR[1]} r={GEO.lensR[2] - 0.5} />
        </clipPath>
      </defs>
      <g transform={flip ? `translate(${GEO.W} 0) scale(-1 1)` : undefined}>
        <ellipse ref={rig.bind('shadow')} cx={0} cy={0} rx={118} ry={8} fill={C.ink} opacity={0.3} />
        <g ref={rig.bind('root')}>
          <g ref={rig.bind('pelvis')}>
            <Leg rig={rig} k="B" />
            <g ref={rig.bind('legFslot0')}>
              <Leg rig={rig} k="F" />
            </g>
            <Waist />
            <g ref={rig.bind('upper')}>
              <g ref={rig.bind('armBslot0')}>
                <Arm rig={rig} k="B" hand={handB} slot={0} />
              </g>
              <g ref={rig.bind('sleeveB', 0)}>
                <SleeveInk />
              </g>
              <g ref={rig.bind('sleeveF', 0)}>
                <SleeveInk />
              </g>
              <ChestInk />
              <ChestFill uid={uid} />
              <g ref={rig.bind('belly')}>
                <Belly uid={uid} />
              </g>
              <g ref={rig.bind('sleeveB', 1)}>
                <SleeveFill />
              </g>
              <NeckSkin />
              <g ref={rig.bind('head')}>
                <Face rig={rig} uid={uid} expression={expression} talking={talking} intensity={intensity} />
              </g>
              <Lapels />
              <g ref={rig.bind('upperInv')}>
                <g ref={rig.bind('legFslot1')}>
                  <Leg rig={rig} k="F" slot={1} />
                </g>
              </g>
              <g ref={rig.bind('armBslot1')}>
                <Arm rig={rig} k="B" hand={handB} slot={1} />
              </g>
              <g ref={rig.bind('sleeveF', 1)}>
                <SleeveFill />
              </g>
              <Arm rig={rig} k="F" hand={handF} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  )
}

export default Peter
