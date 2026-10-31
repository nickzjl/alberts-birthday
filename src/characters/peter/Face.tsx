/**
 * Peter's head: egg-shaped skull, side-swept hair, wire glasses with bulgy eyes,
 * bulb nose and the legendary cleft chin. Lids & pupils are driven by the rig;
 * mouth shapes, brows and extras are swapped per expression here.
 */
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { PeterExpression } from '../types'
import { C } from './parts'
import { EXPRESSIONS, GEO, type BrowId, type MouthId } from './poses'
import type { PeterRig } from './rig'

export const HEAD = 'M91 118C89 100 90 78 95 62C100 46 110 32 124 22C136 13 150 8 163 8C182 8 196 14 200 24C204 34 214 36 222 44C229 52 232 62 233.5 76C236 92 236 110 234 124C232 140 224 156 212 172L186 178C150 168 115 145 91 118Z'
const HAIR = 'M104 38C108 26 122 12 142 7C162 2 186 4 200 14C204 17 207 22 207 27C200 24 190 23 178 24C162 25 146 25 134 26L136 40C132 41.5 127 41 124 38C122 33 118 30 113 30C109 31 106 34 104 38Z'
const CHIN = 'M197.5 68.5C203 70.5 207.5 73 207.5 77C207.5 82 199 89 194.5 94.5C203 95.5 209.5 101 209 109C208.5 118 201 124.5 192 124.5C185 124.5 180 121 178.5 117C177 122 172 124.5 166 124.5C158 124.5 154 118 153.5 112C153.3 109 153.4 107 154 105.5'

interface MouthDef {
  d: string
  jaw: number
  open?: boolean
  teeth?: string
  teethLines?: string
  tongue?: [number, number, number, number]
}

const ALL = 'M120 30L220 30L220 110L120 110Z'

export const MOUTHS: Record<MouthId, MouthDef> = {
  smile: { d: 'M139.2 56.8C139.8 58.6 140.8 59.6 142.6 60C150 66.5 162 70 175 69.2C186 68.4 194 66 197.6 63.8C198.8 63.1 199.6 62.2 200.2 61.2', jaw: 0 },
  smug: { d: 'M145.2 62.6C146.4 64 147.6 64.6 149.2 64.8C158 69.4 171 70.2 182.4 67.4C190.4 65.4 195.6 62 198.6 57.8C199.4 56.8 200.4 56.4 201.6 56.8', jaw: 0 },
  smirk: { d: 'M157.6 65.2C158.4 66.8 159.4 67.6 161 67.8C172 69.2 184.4 66.6 193.6 60.8C195.8 59.4 197.6 57.4 198.6 55', jaw: 0 },
  soft: { d: 'M146.4 60.2C147.4 62 148.8 62.8 150.4 63C158.4 68.6 172.4 70.2 185 66.4C189.6 65 193.2 63.2 195.8 61.2C196.8 60.5 197.8 60.2 198.8 60.3', jaw: 0 },
  grin: {
    open: true,
    d: 'M140.5 57.5C158 62.5 182 62.5 200.5 57C200 70.5 189 81 170.5 81C152 81 141.5 70 140.5 57.5Z',
    teeth: 'M136 50L206 50L206 62C186 68.5 156 68.5 136 62Z',
    tongue: [171, 81, 15, 6.5],
    jaw: 3,
  },
  laugh: {
    open: true,
    d: 'M139.5 55.5C158 60.5 184 60 201.5 54.5C202.5 74.5 189 92.5 171 92.5C152.5 92.5 138.5 76 139.5 55.5Z',
    teeth: 'M134 48L208 48L208 59C186 66 156 66.5 134 60Z',
    tongue: [171, 91, 17, 9],
    jaw: 8,
  },
  laughB: {
    open: true,
    d: 'M141 56.5C158 60 183 59.5 200.5 55.5C200.5 71.5 189 86.5 171 86.5C153 86.5 140.5 73 141 56.5Z',
    teeth: 'M134 48L208 48L208 60C186 66.5 156 66.5 134 61Z',
    tongue: [171, 86, 15, 7.5],
    jaw: 5,
  },
  O: { open: true, d: 'M172 61.5C177.5 61.5 180.5 66 180.5 71C180.5 76.5 177 80 172 80C167 80 163.5 76.5 163.5 71C163.5 66 166.5 61.5 172 61.5Z', tongue: [172, 80, 6, 3.5], jaw: 3 },
  Obig: { open: true, d: 'M172 60C178.5 60 182 66 182 73C182 80.5 178 86 172 86C166 86 162 80.5 162 73C162 66 165.5 60 172 60Z', tongue: [172, 86, 7.5, 4.5], jaw: 6 },
  clench: {
    open: true,
    d: 'M141 60.5C160 57.5 182 56.5 200 58.5C201 62.5 200.5 67 199 70.5C181 73.5 160 74.5 143.5 73C141.5 69 140.5 65 141 60.5Z',
    teeth: ALL,
    teethLines: 'M141 66C160 64.5 182 64 200.5 64.5M150 59.5L150.5 73.5M159.5 58.5L160 74M169 58L169.5 74.5M178.5 57.5L179 74M188 57.5L188.5 73M196 58L196.5 71.5',
    jaw: 2,
  },
  clenchOpen: {
    open: true,
    d: 'M141 59.5C160 56.5 182 55.5 200 57.5C201 63 200.5 70 198.5 75C181 78.5 160 79.5 143 77.5C141 72 140.5 66 141 59.5Z',
    teeth: 'M130 40L210 40L210 63.5C182 61.5 160 62 130 64.5ZM130 90L210 90L210 71C182 73.5 160 74.5 130 72.5Z',
    teethLines: 'M150 58.5L150.5 63.5M160 57.5L160.5 62.8M170 57L170.5 62.4M180 56.8L180.5 62M190 57L190.5 62M151 73.5L151.3 78M161 74L161.3 79M171 74L171.3 79M181 73.5L181.3 78.5M191 72.5L191.3 77.5',
    jaw: 4,
  },
  grit: {
    open: true,
    d: 'M146 62.5C163 61 182 59 199 56.5C200.8 61 200.5 66.5 198 70.5C184 73 167 75.5 152.5 76.5C148 74.5 144.5 70 143 67.5C144 66 145 64.5 146 62.5Z',
    teeth: ALL,
    teethLines: 'M145 68C162 67 182 64.5 199.5 63M156 61L157 75.5M166 60.5L167 75M176 59.5L177 74M186 58.5L187 72.5M194 57.5L195 71',
    jaw: 3,
  },
  gritOpen: {
    open: true,
    d: 'M146 61.5C163 60 182 58 199 55.5C201 61 201 69 198 75C184 78 167 80.5 152 81.5C147.5 79 144 73.5 142.5 69.5C143.5 67 145 64.5 146 61.5Z',
    teeth: 'M130 40L210 40L210 61C182 63 162 65.5 130 67ZM130 95L210 95L210 70C182 73 162 75.5 130 76Z',
    teethLines: 'M156 60L156.5 65.5M166 59.5L166.5 64.8M176 58.5L176.5 63.8M186 57.5L186.5 62.8M157 74.8L157.3 80M167 73.8L167.3 79M177 72.8L177.3 78M187 71.8L187.3 76.8',
    jaw: 6,
  },
  talkS: { open: true, d: 'M148 61C160 63.5 180 63.5 194 60.5C192 68.5 183 72.5 171.5 72.5C160 72.5 151 68.5 148 61Z', tongue: [171.5, 72.5, 10, 4], jaw: 2 },
  talkM: {
    open: true,
    d: 'M143 59.5C157 62.5 181 62.5 198.5 58.5C197 72 186 80 171 80C156 80 145.5 71.5 143 59.5Z',
    teeth: 'M136 50L206 50L206 62C186 66.5 156 66.5 136 62.5Z',
    tongue: [171, 80, 13, 6],
    jaw: 4,
  },
  talkL: {
    open: true,
    d: 'M142 58.5C157 61.5 182 61.5 199.5 57.5C199.5 75 187.5 87.5 171 87.5C154.5 87.5 142 75 142 58.5Z',
    teeth: 'M136 50L206 50L206 61.5C186 66 156 66 136 62Z',
    tongue: [171, 87, 15, 7],
    jaw: 7,
  },
}

const BROWS: Record<BrowId, [string | null, string | null]> = {
  up: ['M140.5 22Q152.5 14.5 166 19.5', 'M178 15Q189 8 201 12.5'],
  high: ['M139.5 18.5Q152.5 9.5 166.5 15.5', 'M177.5 11Q189 3 202 8.5'],
  worried: ['M141 27Q153 24.5 165.5 18', 'M178.5 13.5Q190 15.5 200.5 21.5'],
  mischief: ['M141 25.5Q153 25.5 166.5 29.5', 'M177 11.5Q189.5 1.5 202.5 9.5'],
  angry: ['M141 24L167 33', 'M177 27L200 18'],
}

function Mouth({ id, uid }: { id: MouthId; uid: string }) {
  const m = MOUTHS[id]
  if (!m.open) return <path d={m.d} fill="none" stroke={C.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
  return (
    <g>
      <clipPath id={`${uid}-mouth`}>
        <path d={m.d} />
      </clipPath>
      <path d={m.d} fill={C.mouth} />
      <g clipPath={`url(#${uid}-mouth)`}>
        {m.tongue && <ellipse cx={m.tongue[0]} cy={m.tongue[1]} rx={m.tongue[2]} ry={m.tongue[3]} fill={C.tongue} />}
        {m.teeth && <path d={m.teeth} fill="#fff" />}
        {m.teethLines && <path d={m.teethLines} fill="none" stroke={C.ink} strokeWidth={1.3} strokeLinecap="round" opacity={0.85} />}
      </g>
      <path d={m.d} fill="none" stroke={C.ink} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
    </g>
  )
}

function Eye({ rig, k, uid, mode, lidW }: { rig: PeterRig; k: 'L' | 'R'; uid: string; mode: 'open' | 'happy' | 'squeeze'; lidW: number }) {
  const [cx, cy, r] = k === 'L' ? GEO.lensL : GEO.lensR
  const closed =
    mode === 'happy'
      ? k === 'L'
        ? 'M144.5 43.5Q154 33.5 163.5 43.5'
        : 'M180.5 37.5Q189 28 197.5 37.5'
      : k === 'L'
        ? 'M145.5 34L160 40L145.5 46'
        : 'M196.5 28L183 34L196.5 40'
  return (
    <g ref={rig.bind(`lens${k}`)}>
      <circle cx={cx} cy={cy} r={r} fill={C.lensShade} />
      <g clipPath={`url(#${uid}-lens${k})`}>
        <circle cx={cx + 2.2} cy={cy + 2.4} r={r - 0.6} fill="#fff" />
        <g ref={rig.bind(`pup${k}`)}>
          <circle r={2.1} fill={C.ink} />
          <circle cx={-0.7} cy={-0.8} r={0.65} fill="#fff" opacity={0.85} />
        </g>
        <g ref={rig.bind(`lidL${k}`)}>
          <path d="M-26 24L-14 6A19.3 19.3 0 0 1 14 6L26 24L26 46L-26 46Z" fill={C.skin} />
          <path d="M-14 6A19.3 19.3 0 0 1 14 6" fill="none" stroke={C.ink} strokeWidth={2} />
        </g>
        <g ref={rig.bind(`lidU${k}`)}>
          <rect x={-26} y={-44} width={52} height={44} fill={C.skin} />
          <rect x={-26} y={-44} width={52} height={44} fill={C.skinShade} opacity={0.18} />
          <line x1={-26} x2={26} y1={0} y2={0} stroke={C.ink} strokeWidth={lidW} strokeLinecap="round" />
        </g>
        <AnimatePresence>
          {mode !== 'open' && (
            <motion.path
              key={mode}
              d={closed}
              fill="none"
              stroke={C.ink}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            />
          )}
        </AnimatePresence>
      </g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.ink} strokeWidth={2.3} />
    </g>
  )
}

const SWEAT = 'M0 -6C2.8 -1.6 4.2 1.4 4.2 3.2C4.2 5.6 2.3 7.4 0 7.4C-2.3 7.4 -4.2 5.6 -4.2 3.2C-4.2 1.4 -2.8 -1.6 0 -6Z'

function Sweat({ intensity }: { intensity: number }) {
  const drops: [number, number, number][] = [
    [97, 30, 0],
    [238, 48, 0.45],
    [229, 22, 0.9],
  ]
  return (
    <g>
      {drops.slice(0, intensity > 0.4 ? 3 : 2).map(([x, y, delay]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <motion.path
            d={SWEAT}
            fill="#9feaff"
            stroke={C.ink}
            strokeWidth={1.5}
            initial={{ opacity: 0, y: -4, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], y: [-4, 0, 10, 16], scale: [0.6, 1, 1, 0.9] }}
            transition={{ duration: 1.3 - intensity * 0.4, repeat: Infinity, delay, ease: 'easeIn' }}
          />
        </g>
      ))}
    </g>
  )
}

export function Face({ rig, uid, expression, talking, intensity }: { rig: PeterRig; uid: string; expression: PeterExpression; talking: boolean; intensity: number }) {
  const E = EXPRESSIONS[expression]
  const [frame, setFrame] = useState(0)

  // flap through the expression's talk shapes while talking
  useEffect(() => {
    if (!talking) return
    let t: number
    const tick = () => {
      setFrame((f) => f + 1 + Math.floor(Math.random() * 2))
      t = window.setTimeout(tick, 85 + Math.random() * 75 - intensity * 25)
    }
    t = window.setTimeout(tick, 60)
    return () => window.clearTimeout(t)
  }, [talking, intensity])

  const mouth: MouthId = talking ? E.talk[frame % E.talk.length] : E.mouth
  useEffect(() => {
    rig.setJaw(MOUTHS[mouth].jaw)
  }, [rig, mouth])

  const brows = E.brows ? BROWS[E.brows] : null
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-flush`} cx={176} cy={74} r={62} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff3d5e" stopOpacity={0.42} />
          <stop offset="0.6" stopColor="#ff3d5e" stopOpacity={0.22} />
          <stop offset="1" stopColor="#ff3d5e" stopOpacity={0} />
        </radialGradient>
      </defs>
      <path d={HEAD} fill={C.skin} />
      <g clipPath={`url(#${uid}-head)`}>
        <path d="M84 132L84 40L128 12L134 22C118 36 106 58 104 80C102 100 104 116 112 134Z" fill={C.skinShade} opacity={0.6} />
        <path d="M225 50C231 64 232.5 80 232.5 100C232.5 112 231.5 122 229.5 132L240 132L240 50Z" fill={C.skinHi} opacity={0.75} />
        <ellipse cx={185} cy={64.5} rx={12} ry={3.2} fill={C.skinShade} opacity={0.55} />
        <path d="M153 117C156 127 166 130 178 125C186 131 203 130 209 116C210 127 202 135 186 136C168 137 156 130 153 117Z" fill={C.skinShade} opacity={0.45} />
        {E.flush && <path d={HEAD} fill={`url(#${uid}-flush)`} opacity={0.35 + intensity * 0.65} />}
      </g>
      <path d="M92 126C89 100 90 78 95 62C100 46 110 32 122 23" fill="none" stroke={C.ink} strokeWidth={GEO.o} strokeLinecap="round" />
      <path d="M201 27C204 34 214 36 222 44C229 52 232 62 233.5 76C236 92 236 110 234 124C233.6 128 233 131 232.2 134" fill="none" stroke={C.ink} strokeWidth={GEO.o} strokeLinecap="round" />

      {/* ear */}
      <path d="M121 30C114 26 107 31 108 37C109 43 115 46 121 43Z" fill={C.skin} />
      <path d="M121 30C114 26 107 31 108 37C109 43 115 46 121 43" fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M118.5 33.5C114.5 33.5 114 39 117.5 40" fill="none" stroke={C.ink} strokeWidth={1.8} strokeLinecap="round" />

      {/* glasses arm runs back to the ear */}
      <path d="M140.6 37.6L121.5 33.4" stroke={C.ink} strokeWidth={2} strokeLinecap="round" />

      {/* hair */}
      <path d={HAIR} fill={C.hair} stroke={C.ink} strokeWidth={GEO.o} strokeLinejoin="round" />
      <path d="M128 15C148 7 172 5 192 11C172 10 150 12 132 19Z" fill={C.hairHi} />
      <path d="M150 19C165 15.5 182 15.5 197 19.5M120 24C126 20 132 18 138 17" fill="none" stroke={C.hairShade} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />

      {/* nose (sits under the right lens) */}
      <path d="M172 55C175 59.5 180 61.5 186 61.5C194 61.5 199.5 57 199.5 51C199.5 46 196 43 191 43.5C184 45 177 49 172 55Z" fill={C.skin} />
      <path d="M172.6 54.4C174.4 59.4 180 61.5 186 61.5C194 61.5 199.5 57 199.5 51C199.5 47.4 197.8 45 195 44" fill="none" stroke={C.ink} strokeWidth={2.6} strokeLinecap="round" />

      <Eye rig={rig} k="L" uid={uid} mode={E.eyes.mode} lidW={E.lidW ?? 2.2} />
      <Eye rig={rig} k="R" uid={uid} mode={E.eyes.mode} lidW={E.lidW ?? 2.2} />
      <path d="M167.4 39Q172 35.4 176.6 36.6" fill="none" stroke={C.ink} strokeWidth={2.3} strokeLinecap="round" />

      {/* chin moves with the jaw */}
      <g ref={rig.bind('chin')}>
        <path d={CHIN} fill="none" stroke={C.ink} strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* the mouth pops a little whenever the expression changes */}
      <motion.g key={expression} initial={{ scaleX: 1.12, scaleY: 0.6 }} animate={{ scaleX: 1, scaleY: 1 }} transition={{ type: 'spring', stiffness: 700, damping: 16 }}>
        <Mouth id={mouth} uid={uid} />
      </motion.g>

      <AnimatePresence>
        {brows && (
          <motion.g
            key={E.brows}
            fill="none"
            stroke={C.ink}
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          >
            {brows[0] && <path d={brows[0]} />}
            {brows[1] && <path d={brows[1]} />}
          </motion.g>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {E.blush && (
          <motion.g key="blush" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ellipse cx={214} cy={70} rx={9} ry={4.5} fill="#ff5f8a" opacity={0.35} />
            <ellipse cx={136} cy={66} rx={7} ry={3.8} fill="#ff5f8a" opacity={0.3} />
          </motion.g>
        )}
      </AnimatePresence>
      {E.sweat && <Sweat intensity={intensity} />}
    </g>
  )
}
