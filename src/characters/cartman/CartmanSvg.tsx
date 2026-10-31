import { AnimatePresence, motion, type MotionValue } from 'motion/react'
import {
  BODY, BRIM, BRIM_LOW, BUTTONS, CHIN, COLORS as C, EYE, HAND_Y, HAT, HEAD, JACKET_FOLDS, JACKET_SEAM,
  LEG, LIP, MITTEN, PIVOT, POM, POM_FOLDS, SHOE, SLEEVE,
} from './geometry'
import type { HandKind } from './rig'
import type { Rig } from './useCartmanRig'

/** transform origin in local viewBox units (stable no matter how the group's bbox changes) */
const at = (x: number, y: number) => ({ transformBox: 'view-box', originX: `${x}px`, originY: `${y}px` }) as const

const INK = { stroke: C.ink, strokeWidth: 2.2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

interface Props {
  rig: Rig
  uid: string
  handL: HandKind
  handR: HandKind
  crying: boolean
  furious: boolean
  sheepish: boolean
  steam: boolean
}

export function CartmanSvg({ rig, uid, handL, handR, crying, furious, sheepish, steam }: Props) {
  const url = (n: string) => `url(#${uid}-${n})`
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMax meet" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`${uid}-head`}>
          <path d={HEAD} />
        </clipPath>
        <clipPath id={`${uid}-eyeL`}>
          <ellipse cx={EYE.lx} cy={EYE.cy} rx={EYE.rX} ry={EYE.ry} />
        </clipPath>
        <clipPath id={`${uid}-eyeR`}>
          <ellipse cx={EYE.rx} cy={EYE.cy} rx={EYE.rX} ry={EYE.ry} />
        </clipPath>
        <clipPath id={`${uid}-mouth`}>
          <motion.path d={rig.mouthD} />
        </clipPath>
      </defs>

      <motion.g style={{ scaleX: rig.flipSX, ...at(200, 0) }}>
        {/* ground shadow + stomp dust stay on the floor */}
        <motion.ellipse cx={200} cy={397} rx={166} ry={9} fill={C.ink} fillOpacity={0.42} style={{ scaleX: rig.shadowSX, opacity: rig.shadowO, ...at(200, 397) }} />
        <Dust o={rig.dustL} s={rig.dustLS} x={104} />
        <Dust o={rig.dustR} s={rig.dustRS} x={296} />

        <motion.g style={{ x: rig.rootX, y: rig.rootY, rotate: rig.rootRot, ...at(200, 300) }}>
          <motion.g style={{ scaleX: rig.bodySX, scaleY: rig.bodySY, ...at(200, 400) }}>
            <Leg rot={rig.legLRot} y={rig.legLY} sy={rig.legLSY} />
            <g transform="translate(400 0) scale(-1 1)">
              <Leg rot={rig.legRRot} y={rig.legRY} sy={rig.legRSY} />
            </g>
            <Body />
            <Head rig={rig} url={url} crying={crying} furious={furious} sheepish={sheepish} steam={steam} />
            {/* feet point at the camera when he sits / lies on his back, so they're in front of everything but the arms */}
            <Soles rig={rig} />
            <Arm rot={rig.armLRot} sy={rig.armLSY} handY={rig.handLY} handRot={rig.handLRot} handS={rig.handLS} kind={handL} />
            <g transform="translate(400 0) scale(-1 1)">
              <Arm rot={rig.armRRot} sy={rig.armRSY} handY={rig.handRY} handRot={rig.handRRot} handS={rig.handRS} kind={handR} />
            </g>
          </motion.g>
        </motion.g>
      </motion.g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */

function Dust({ o, s, x }: { o: MotionValue<number>; s: MotionValue<number>; x: number }) {
  return (
    <motion.g style={{ opacity: o, scale: s, ...at(x, 398) }} fill={C.dust}>
      <circle cx={x - 34} cy={393} r={9} />
      <circle cx={x - 16} cy={385} r={14} />
      <circle cx={x + 6} cy={382} r={16} />
      <circle cx={x + 28} cy={388} r={12} />
      <circle cx={x + 44} cy={395} r={7} />
    </motion.g>
  )
}

/**
 * shoe soles facing the camera — legs stuck out in front while sitting, or kicking at us during the tantrum
 * (a kicked sole rises and grows; a pant shin stretches between it and the jacket hem)
 */
function Soles({ rig }: { rig: Rig }) {
  const sides = [
    { x: 116, r: 14, y: rig.soleLY, s: rig.soleLS, t: rig.shinLT, h: rig.shinLH },
    { x: 284, r: -14, y: rig.soleRY, s: rig.soleRS, t: rig.shinRT, h: rig.shinRH },
  ]
  return (
    <motion.g style={{ opacity: rig.soleO }}>
      {sides.map(({ x, r, y, s, t, h }) => (
        <g key={x}>
          <motion.rect x={x - 18} y={t} width={36} height={h} rx={9} fill={C.pants} {...INK} />
          <motion.g style={{ y, scale: s, ...at(x, 372) }}>
            <g transform={`rotate(${r} ${x} 356)`}>
              <path d={`M${x - 20} 338C${x - 30} 330 ${x - 22} 328 ${x} 330C${x + 22} 328 ${x + 30} 330 ${x + 20} 338Z`} fill={C.pants} {...INK} />
              <ellipse cx={x} cy={356} rx={27} ry={21} fill={C.shoe} {...INK} />
              <ellipse cx={x} cy={350} rx={17} ry={10} fill="#4a403c" />
              <ellipse cx={x} cy={367} rx={13} ry={5} fill="#4a403c" />
            </g>
          </motion.g>
        </g>
      ))}
    </motion.g>
  )
}

function Leg({ rot, y, sy }: { rot: MotionValue<number>; y: MotionValue<number>; sy: MotionValue<number> }) {
  return (
    <motion.g style={{ y, rotate: rot, scaleY: sy, ...at(PIVOT.hip[0], PIVOT.hip[1]) }}>
      <path d={LEG} fill={C.pants} {...INK} />
      <path d={SHOE} fill={C.shoe} {...INK} />
    </motion.g>
  )
}

function Body() {
  return (
    <g>
      <path d={BODY} fill={C.jacket} {...INK} />
      <path d={JACKET_FOLDS} fill="none" stroke={C.crease} strokeWidth={1.6} strokeLinecap="round" opacity={0.75} />
      <path d={JACKET_SEAM} stroke={C.crease} strokeWidth={1.6} />
      {BUTTONS.map((y) => (
        <circle key={y} cx={199} cy={y} r={3} fill={C.button} />
      ))}
    </g>
  )
}

interface ArmProps {
  rot: MotionValue<number>
  sy: MotionValue<number>
  handY: MotionValue<number>
  handRot: MotionValue<number>
  handS: MotionValue<number>
  kind: HandKind
}

function Arm({ rot, sy, handY, handRot, handS, kind }: ArmProps) {
  return (
    <g transform={`translate(${PIVOT.shoulder[0]} ${PIVOT.shoulder[1]})`}>
      <motion.g style={{ rotate: rot, ...at(0, 0) }}>
        <motion.path d={SLEEVE} fill={C.jacket} stroke={C.crease} strokeWidth={2} style={{ scaleY: sy, ...at(0, 0) }} />
        <motion.g style={{ y: handY }}>
          <g transform={`translate(0 ${HAND_Y})`}>
            <motion.g style={{ rotate: handRot, scale: handS, ...at(0, 8) }}>
              <Mitten kind={kind} />
            </motion.g>
          </g>
        </motion.g>
      </motion.g>
    </g>
  )
}

function Mitten({ kind }: { kind: HandKind }) {
  return (
    <motion.g key={kind} initial={{ scale: 0.55 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 14 }} style={at(0, 10)}>
      {kind === 'open' && (
        <>
          <path d={MITTEN.open.thumb} fill={C.mitten} {...INK} />
          <path d={MITTEN.open.main} fill={C.mitten} {...INK} />
        </>
      )}
      {kind === 'fist' && (
        <>
          <path d={MITTEN.fist.main} fill={C.mitten} {...INK} />
          <path d={MITTEN.fist.curl} fill="none" stroke={C.mittenShade} strokeWidth={2.2} strokeLinecap="round" />
        </>
      )}
      {kind === 'point' && (
        <>
          <path d={MITTEN.point.finger} fill={C.mitten} {...INK} />
          <path d={MITTEN.point.nail} fill="none" stroke={C.mittenShade} strokeWidth={2} strokeLinecap="round" />
          <path d={MITTEN.fist.main} fill={C.mitten} {...INK} />
          <path d={MITTEN.fist.curl} fill="none" stroke={C.mittenShade} strokeWidth={2.2} strokeLinecap="round" />
        </>
      )}
    </motion.g>
  )
}

/* ------------------------------------------------------------------ */

interface HeadProps {
  rig: Rig
  url: (n: string) => string
  crying: boolean
  furious: boolean
  sheepish: boolean
  steam: boolean
}

function Head({ rig, url, crying, furious, sheepish, steam }: HeadProps) {
  return (
    <motion.g style={{ y: rig.headY, rotate: rig.headRot, scale: rig.headS, ...at(PIVOT.neck[0], PIVOT.neck[1]) }}>
      <path d={HEAD} fill={C.skin} />
      <motion.path d={HEAD} fill={C.flush} style={{ opacity: rig.redO }} />
      <motion.g style={{ opacity: rig.cheeksO }} fill={C.blush}>
        <ellipse cx={116} cy={226} rx={21} ry={11} />
        <ellipse cx={286} cy={226} rx={21} ry={11} />
      </motion.g>
      <path d={CHIN} fill="none" stroke={C.ink} strokeWidth={1.8} strokeLinecap="round" />
      <path d={LIP} fill="none" stroke={C.ink} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />

      {/* hat */}
      <g clipPath={url('head')}>
        <path d={BRIM_LOW} transform="translate(0 4)" fill="none" stroke={C.skinShade} strokeWidth={6} />
        <path d={HAT} fill={C.hat} />
        <path d="M70 120C96 86 140 70 170 68" fill="none" stroke="#5fd3e6" strokeWidth={6} strokeLinecap="round" opacity={0.45} />
      </g>
      <path d={HEAD} fill="none" {...INK} />
      <path d={BRIM} fill={C.brim} {...INK} strokeWidth={1.8} />

      {/* pom with secondary jiggle */}
      <motion.g style={{ rotate: rig.pomRot, ...at(PIVOT.pom[0], PIVOT.pom[1]) }}>
        <g transform="translate(197 88) scale(0.94 0.74) translate(-197 -88)">
          <path d={POM} transform="translate(1 5)" fill={C.hatShade} />
          <path d={POM} fill={C.pom} {...INK} strokeWidth={2.2} />
          <path d={POM_FOLDS} fill="none" stroke={C.pomShade} strokeWidth={2.2} strokeLinecap="round" />
        </g>
      </motion.g>

      <Eye side="L" rig={rig} url={url} />
      <Eye side="R" rig={rig} url={url} />

      {/* brows */}
      <motion.g style={{ opacity: rig.browO, y: rig.browY }} stroke={C.ink} strokeWidth={7} strokeLinecap="round">
        <motion.line x1={138} y1={146} x2={194} y2={146} style={{ rotate: rig.browRotL, ...at(166, 146) }} />
        <motion.line x1={207} y1={146} x2={263} y2={146} style={{ rotate: rig.browRotR, ...at(235, 146) }} />
      </motion.g>

      {/* squeezed-shut eyes */}
      <motion.g style={{ opacity: rig.squintO }} fill="none" stroke={C.ink} strokeWidth={4.5} strokeLinecap="round">
        <path d="M136 186Q166 162 198 183" />
        <path d="M203 183Q235 162 265 186" />
        <path d="M134 176L124 170M267 176L277 170" strokeWidth={3} />
      </motion.g>

      <Mouth rig={rig} url={url} />

      <AnimatePresence>
        {crying && <Tears key="tears" />}
        {furious && <Vein key="vein" />}
        {sheepish && <Sweat key="sweat" />}
        {steam && <Steam key="steam" />}
      </AnimatePresence>
    </motion.g>
  )
}

function Eye({ side, rig, url }: { side: 'L' | 'R'; rig: Rig; url: (n: string) => string }) {
  const cx = side === 'L' ? EYE.lx : EYE.rx
  const { cy, rX, ry } = EYE
  const top = cy - ry
  const bot = cy + ry
  return (
    <motion.g style={{ scaleX: rig.eyeSX, scaleY: rig.eyeSY, ...at(cx, cy) }}>
      <ellipse cx={cx} cy={cy} rx={rX} ry={ry} fill={C.eye} />
      <g clipPath={url(`eye${side}`)}>
        <motion.circle cx={side === 'L' ? rig.pupilLX : rig.pupilRX} cy={rig.pupilY} r={rig.pupilR} fill={C.pupil} />
        {/* expression lid (tilts for angry / worried) */}
        <motion.g style={{ rotate: side === 'L' ? rig.lidRotL : rig.lidRotR, ...at(cx, cy) }}>
          <motion.g style={{ y: rig.lidY }}>
            <motion.rect x={cx - 55} y={top - 100} width={110} height={100} fill={rig.lidFill} />
            <motion.line x1={cx - 55} y1={top} x2={cx + 55} y2={top} stroke={C.ink} strokeWidth={2.6} style={{ opacity: rig.lidLineO }} />
          </motion.g>
        </motion.g>
        {/* happy cheek lid */}
        <motion.g style={{ y: rig.lowLidY }}>
          <motion.path d={`M${cx - 50} ${bot + 6}Q${cx} ${bot - 14} ${cx + 50} ${bot + 6}L${cx + 50} ${bot + 100}L${cx - 50} ${bot + 100}Z`} fill={rig.lidFill} />
          <motion.path d={`M${cx - 50} ${bot + 6}Q${cx} ${bot - 14} ${cx + 50} ${bot + 6}`} fill="none" stroke={C.ink} strokeWidth={2.2} style={{ opacity: rig.lowLineO }} />
        </motion.g>
        {/* blink */}
        <motion.g style={{ y: rig.blinkY }}>
          <motion.rect x={cx - 55} y={top - 104} width={110} height={100} fill={rig.lidFill} />
          <line x1={cx - 55} y1={top - 4} x2={cx + 55} y2={top - 4} stroke={C.ink} strokeWidth={2.4} />
        </motion.g>
      </g>
      <ellipse cx={cx} cy={cy} rx={rX} ry={ry} fill="none" stroke={C.ink} strokeWidth={1.8} />
    </motion.g>
  )
}

function Mouth({ rig, url }: { rig: Rig; url: (n: string) => string }) {
  return (
    <motion.g style={{ x: rig.mouthX, y: rig.mouthY }}>
      <motion.path d={rig.mouthD} fill={C.mouth} />
      <g clipPath={url('mouth')}>
        <motion.ellipse cx={0} cy={rig.tongueY} rx={rig.tongueRX} ry={9} fill={C.tongue} style={{ opacity: rig.tongueO }} />
        <motion.g style={{ y: rig.teethY, opacity: rig.teethO }}>
          <rect x={-40} y={0} width={80} height={7} fill={C.teeth} />
          <path d="M-7 0V7M6 0V7" stroke={C.mouth} strokeWidth={2.2} />
        </motion.g>
        <motion.g style={{ opacity: rig.clenchO }}>
          <rect x={-40} y={-30} width={80} height={60} fill={C.teeth} />
          <path d="M-40 0.5H40M-17 -30V30M-6 -30V30M5 -30V30M16 -30V30" stroke="#a89a9a" strokeWidth={1.4} />
        </motion.g>
      </g>
      <motion.path d={rig.mouthD} fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" />
    </motion.g>
  )
}

/* ------------------------------------------------------------------ */
/* Overlays                                                             */
/* ------------------------------------------------------------------ */
const fadeInOut = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25 } }

const DROP = 'M0 -7C3 -2 5 1 5 4A5 5 0 0 1 -5 4C-5 1 -3 -2 0 -7Z'

function Tears() {
  return (
    <motion.g {...fadeInOut}>
      {[{ x: 138, dir: -1 }, { x: 263, dir: 1 }].map(({ x, dir }) => (
        <g key={x}>
          {/* streaming rivers down the cheeks */}
          <motion.path
            d={`M${x} 184C${x + dir * 6} 206 ${x + dir * 1} 234 ${x + dir * 10} 268`}
            fill="none" stroke={C.tear} strokeWidth={9} strokeLinecap="round" opacity={0.9}
            animate={{ pathLength: [0.5, 1, 0.5] }}
            transition={{ duration: 0.45, repeat: Infinity, ease: 'easeInOut' }}
          />
          <path d={`M${x + dir * 1.5} 190C${x + dir * 5} 206 ${x + dir * 2} 226 ${x + dir * 6} 244`} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
          {/* sprinkler drops */}
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.path
              key={i}
              d={DROP}
              fill={C.tear}
              stroke={C.ink}
              strokeWidth={1}
              initial={{ x, y: 186, opacity: 0, scale: 1 }}
              animate={{ x: [x, x + dir * (22 + i * 4), x + dir * (44 + i * 6)], y: [186, 168 - i * 2, 236], opacity: [0, 1, 0], scale: [1, 1.6, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12, ease: 'easeOut' }}
            />
          ))}
        </g>
      ))}
    </motion.g>
  )
}

function Vein() {
  return (
    <motion.g {...fadeInOut}>
      <g transform="translate(306 200)">
        <motion.path
          d="M-10 -3Q-3 -3 -3 -10M3 -10Q3 -3 10 -3M10 3Q3 3 3 10M-3 10Q-3 3 -10 3"
          fill="none" stroke={C.vein} strokeWidth={3.6} strokeLinecap="round"
          animate={{ scale: [1, 1.28, 1] }}
          transition={{ duration: 0.42, repeat: Infinity, ease: 'easeInOut' }}
          style={at(0, 0)}
        />
      </g>
    </motion.g>
  )
}

function Sweat() {
  return (
    <motion.g {...fadeInOut}>
      <g transform="translate(300 178) scale(1.6)">
        <motion.g animate={{ y: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
          <path d={DROP} fill={C.tear} stroke={C.ink} strokeWidth={0.8} />
          <path d="M-2 2A2.5 2.5 0 0 0 0 5" fill="none" stroke="#fff" strokeWidth={1} strokeLinecap="round" />
        </motion.g>
      </g>
    </motion.g>
  )
}

function Steam() {
  // puffs shoot out from under the hat brim, then billow upward
  return (
    <motion.g {...fadeInOut}>
      {[{ x: 62, dir: -1 }, { x: 338, dir: 1 }].map(({ x, dir }) =>
        [0, 1, 2, 3].map((i) => (
          <motion.circle
            key={`${x}-${i}`}
            cx={0}
            cy={0}
            r={13}
            fill={C.steam}
            stroke={C.ink}
            strokeWidth={1.5}
            initial={{ x, y: 164, scale: 0.2, opacity: 0 }}
            animate={{ x: [x, x + dir * 24, x + dir * 36, x + dir * 40], y: [164, 150, 118, 84], scale: [0.25, 1, 1.5, 2], opacity: [0, 1, 0.85, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.25, ease: 'easeOut', times: [0, 0.25, 0.6, 1] }}
          />
        )),
      )}
    </motion.g>
  )
}
