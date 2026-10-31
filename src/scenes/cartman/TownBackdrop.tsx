import { motion, useTransform, type MotionValue } from 'motion/react'
import { memo, type CSSProperties } from 'react'

/* ------------------------------------------------------------------ */
/* Deterministic geometry (computed once)                              */
/* ------------------------------------------------------------------ */

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

type Pt = [number, number]

/** A jagged range + zig-zag snow caps on every peak. */
function range(pts: Pt[], height: number, cap: number) {
  const body = `M0,${height} ` + pts.map(([x, y]) => `L${x},${y}`).join(' ') + ` L${pts[pts.length - 1][0]},${height} Z`
  const caps: string[] = []
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]
    const [lx, ly] = pts[i - 1]
    const [rx, ry] = pts[i + 1]
    if (y >= ly || y >= ry) continue
    const d = Math.min(cap, (ly - y) * 0.55, (ry - y) * 0.55)
    const l: Pt = [x - ((x - lx) * d) / (ly - y), y + d]
    const r: Pt = [x + ((rx - x) * d) / (ry - y), y + d]
    const teeth = 4
    const zig: string[] = []
    for (let k = 1; k < teeth * 2; k++) {
      const t = k / (teeth * 2)
      const zx = l[0] + (r[0] - l[0]) * t
      const zy = l[1] + (k % 2 ? -d * 0.28 : d * 0.08)
      zig.push(`L${zx.toFixed(1)},${zy.toFixed(1)}`)
    }
    caps.push(`M${x},${y} L${l[0].toFixed(1)},${l[1].toFixed(1)} ${zig.join(' ')} L${r[0].toFixed(1)},${r[1].toFixed(1)} Z`)
  }
  return { body, caps }
}

const FAR = range(
  [
    [0, 300], [90, 228], [170, 282], [292, 132], [380, 222], [452, 172], [560, 262], [684, 96], [770, 196], [836, 150],
    [940, 252], [1046, 124], [1132, 214], [1212, 158], [1322, 246], [1428, 112], [1524, 224], [1600, 176],
  ],
  500,
  48,
)

const MID = range(
  [
    [0, 260], [120, 170], [230, 250], [360, 120], [470, 230], [560, 196], [650, 270], [790, 140], [900, 236],
    [1000, 180], [1110, 262], [1240, 128], [1350, 226], [1460, 166], [1600, 240],
  ],
  400,
  40,
)

const HILLS =
  'M0,120 C120,70 240,60 360,96 C470,128 560,74 700,70 C830,66 920,118 1040,104 C1170,88 1240,52 1380,64 C1480,72 1550,100 1600,92 L1600,260 L0,260 Z'

/** little pine silhouettes along the hill ridge */
const RIDGE_PINES = (() => {
  const r = rng(7)
  const out: Array<{ x: number; y: number; h: number }> = []
  for (let x = 20; x < 1600; x += 34 + r() * 60) {
    // approximate ridge height by sampling the curve roughly
    const y = 92 + Math.sin(x / 210) * 22 + Math.cos(x / 97) * 6
    out.push({ x, y: y + 6, h: 26 + r() * 30 })
  }
  return out
})()

const STARS = (() => {
  const r = rng(42)
  return Array.from({ length: 70 }, (_, i) => ({
    x: r() * 1600,
    y: r() * 520,
    r: r() < 0.15 ? 2.6 : 0.8 + r() * 1.4,
    tw: i % 5 === 0,
    d: 1.6 + r() * 2.8,
    dl: -r() * 4,
  }))
})()

const FLAKES = (() => {
  const r = rng(1234)
  return Array.from({ length: 44 }, () => ({
    x: r() * 100,
    s: 2.5 + r() * 5.5,
    o: 0.45 + r() * 0.5,
    d: 7 + r() * 9,
    dl: -r() * 16,
    drift: (r() - 0.5) * 80,
    sway: 1.8 + r() * 2.4,
  }))
})()

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

interface HouseProps {
  left: string
  height: string
  body: string
  roof: string
  windows: [number, number]
  lit: number
  flip?: boolean
  chimney?: boolean
  z?: number
}

function House({ left, height, body, roof, windows, lit, flip, chimney = true, z = 0 }: HouseProps) {
  return (
    <div className="cms-house" style={{ left, height, zIndex: z, scale: flip ? '-1 1' : undefined }}>
      <svg viewBox="0 0 140 130" preserveAspectRatio="xMidYMax meet">
        {/* paper shadow */}
        <path d="M18,62 L72,20 L126,62 L126,130 L18,130 Z" fill="var(--ink)" opacity="0.35" transform="translate(6 -4)" />
        {chimney && <rect x="94" y="22" width="16" height="30" fill={roof} stroke="var(--ink)" strokeWidth="3.5" />}
        <rect x="22" y="56" width="100" height="74" fill={body} stroke="var(--ink)" strokeWidth="4" />
        <path d="M10,62 L72,14 L134,62 Z" fill={roof} stroke="var(--ink)" strokeWidth="4" strokeLinejoin="round" />
        {/* roof snow with drips */}
        <path
          d="M72,12 L12,58 Q18,66 24,58 Q30,68 38,56 L72,28 L106,56 Q114,68 120,58 Q126,66 132,58 Z"
          fill="#efe8ff"
          stroke="var(--ink)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {chimney && <rect x="92" y="18" width="20" height="7" rx="3" fill="#efe8ff" stroke="var(--ink)" strokeWidth="2.5" />}
        {windows.map((id, i) => {
          const on = id < lit
          const x = i === 0 ? 34 : 84
          return (
            <g key={id}>
              <circle cx={x + 13} cy={86} r={30} fill="url(#cms-win-glow)" className="cms-glow" style={{ opacity: on ? 1 : 0 }} />
              <rect x={x} y={74} width={26} height={24} rx={2} fill={on ? '#ffd23f' : '#1b0a3a'} stroke="var(--ink)" strokeWidth="3.5" className="cms-win" />
              <path d={`M${x + 13},74 V98 M${x},86 H${x + 26}`} stroke="var(--ink)" strokeWidth="2.5" />
            </g>
          )
        })}
        <rect x="62" y="98" width="20" height="32" rx="2" fill={roof} stroke="var(--ink)" strokeWidth="3.5" />
        <path d="M14,130 Q40,118 70,126 Q100,116 132,130 Z" fill="#efe8ff" />
      </svg>
    </div>
  )
}

function Pine({ left, height, shade = '#22104d', z = 0 }: { left: string; height: string; shade?: string; z?: number }) {
  return (
    <div className="cms-pine" style={{ left, height, zIndex: z }}>
      <svg viewBox="0 0 80 140" preserveAspectRatio="xMidYMax meet">
        <rect x="35" y="112" width="10" height="28" fill="#1a0b38" />
        <path d="M40,4 L66,52 L54,52 L74,90 L58,90 L78,122 L2,122 L22,90 L6,90 L26,52 L14,52 Z" fill={shade} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
        <path d="M40,4 L52,26 Q46,22 40,30 Q34,22 28,26 Z M26,52 L54,52 L58,60 Q50,54 44,62 Q38,54 30,62 Q24,56 22,60 Z M22,90 L58,90 L64,98 Q54,92 46,100 Q38,92 30,100 Q22,94 16,98 Z" fill="#e9e0ff" />
      </svg>
    </div>
  )
}

function Sign({ left, height }: { left: string; height: string }) {
  return (
    <div className="cms-sign" style={{ left, height }}>
      <svg viewBox="0 0 150 120" preserveAspectRatio="xMidYMax meet">
        <rect x="30" y="50" width="9" height="70" fill="#5b3a2e" stroke="var(--ink)" strokeWidth="3" />
        <rect x="111" y="50" width="9" height="70" fill="#5b3a2e" stroke="var(--ink)" strokeWidth="3" />
        <g transform="rotate(-3 75 40)">
          <rect x="6" y="10" width="138" height="58" rx="6" fill="var(--ink)" transform="translate(4 5)" opacity="0.5" />
          <rect x="6" y="10" width="138" height="58" rx="6" fill="#f6f1ff" stroke="var(--ink)" strokeWidth="3.5" />
          <text x="75" y="35" textAnchor="middle" className="cms-sign__small" textLength="92" lengthAdjust="spacingAndGlyphs">
            PLEASE DO NOT
          </text>
          <text x="75" y="58" textAnchor="middle" className="cms-sign__big" textLength="118" lengthAdjust="spacingAndGlyphs">
            FEED CARTMAN
          </text>
          <path d="M10,12 Q40,2 75,8 Q110,2 140,12 Q120,16 100,12 Q80,18 60,12 Q36,18 10,12 Z" fill="#e9e0ff" stroke="var(--ink)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Backdrop                                                            */
/* ------------------------------------------------------------------ */

export interface TownBackdropProps {
  /** 0..1 — tints the town red, pulses the vignette, turns the moon */
  heat: number
  /** how many house windows are lit (neighbours waking up) */
  lit: number
  /** camera push-in (1 = normal) */
  cam: MotionValue<number>
  /** pointer parallax −1..1 */
  px: MotionValue<number>
  py: MotionValue<number>
}

function useLayer(cam: MotionValue<number>, px: MotionValue<number>, py: MotionValue<number>, depth: number) {
  const x = useTransform(px, (v) => v * -depth * 14)
  const y = useTransform(py, (v) => v * -depth * 5)
  const scale = useTransform(cam, (c) => 1 + (c - 1) * depth)
  return { x, y, scale }
}

export const TownBackdrop = memo(function TownBackdrop({ heat, lit, cam, px, py }: TownBackdropProps) {
  const moon = useLayer(cam, px, py, 0.12)
  const far = useLayer(cam, px, py, 0.25)
  const mid = useLayer(cam, px, py, 0.45)
  const hills = useLayer(cam, px, py, 0.62)
  const town = useLayer(cam, px, py, 0.8)
  const ground = useLayer(cam, px, py, 1)
  const blood = heat > 0.85

  return (
    <div className="cms-bd" aria-hidden="true" style={{ '--heat': heat } as CSSProperties}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <radialGradient id="cms-win-glow">
            <stop offset="0" stopColor="#ffd23f" stopOpacity="0.75" />
            <stop offset="1" stopColor="#ffd23f" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="cms-snow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#efe8ff" />
            <stop offset="0.35" stopColor="#d7c8ff" />
            <stop offset="1" stopColor="#a58be6" />
          </linearGradient>
        </defs>
      </svg>

      <div className="cms-bd__sky" />

      <svg className="cms-bd__stars" viewBox="0 0 1600 540" preserveAspectRatio="xMidYMin slice">
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            className={s.tw ? 'cms-star cms-star--tw is-ambient' : 'cms-star'}
            style={s.tw ? ({ '--d': `${s.d}s`, '--dl': `${s.dl}s` } as CSSProperties) : undefined}
          />
        ))}
      </svg>

      <motion.div className="cms-bd__moon-wrap" style={moon}>
        <div className={`cms-moon is-ambient ${blood ? 'cms-moon--blood' : ''}`}>
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" className="cms-moon__disc" />
            <circle cx="36" cy="38" r="9" className="cms-moon__crater" />
            <circle cx="62" cy="60" r="12" className="cms-moon__crater" />
            <circle cx="64" cy="30" r="5" className="cms-moon__crater" />
            <circle cx="34" cy="68" r="4" className="cms-moon__crater" />
          </svg>
        </div>
      </motion.div>

      <motion.div className="cms-bd__layer cms-bd__far" style={far}>
        <svg viewBox="0 0 1600 500" preserveAspectRatio="xMidYMax slice">
          <path d={FAR.body} fill="#3d2185" />
          {FAR.caps.map((d, i) => (
            <path key={i} d={d} fill="#9f86e6" />
          ))}
        </svg>
      </motion.div>

      <motion.div className="cms-bd__layer cms-bd__mid" style={mid}>
        <svg viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice">
          <path d={MID.body} fill="var(--ink)" opacity="0.3" transform="translate(0 -7)" />
          <path d={MID.body} fill="#2b1468" />
          {MID.caps.map((d, i) => (
            <path key={i} d={d} fill="#d6c8ff" />
          ))}
        </svg>
      </motion.div>

      <motion.div className="cms-bd__layer cms-bd__hills" style={hills}>
        <svg viewBox="0 0 1600 260" preserveAspectRatio="xMidYMax slice">
          <path d={HILLS} fill="var(--ink)" opacity="0.35" transform="translate(0 -7)" />
          <path d={HILLS} fill="#1d0b45" />
          {RIDGE_PINES.map((p, i) => (
            <path key={i} d={`M${p.x},${p.y - p.h} L${p.x + p.h * 0.32},${p.y + 4} L${p.x - p.h * 0.32},${p.y + 4} Z`} fill="#150735" />
          ))}
        </svg>
      </motion.div>

      <motion.div className="cms-bd__layer cms-bd__town" style={town}>
        <Pine left="1%" height="clamp(90px, 21vh, 190px)" shade="#1d0c42" />
        <House left="5%" height="clamp(70px, 15vh, 140px)" body="#5a2fb0" roof="#2a1158" windows={[0, 5]} lit={lit} />
        <Sign left="17%" height="clamp(46px, 9vh, 86px)" />
        <Pine left="27%" height="clamp(70px, 16vh, 150px)" />
        <House left="56%" height="clamp(64px, 13vh, 124px)" body="#7b52c9" roof="#a3285f" windows={[1, 4]} lit={lit} flip />
        <Pine left="66%" height="clamp(80px, 19vh, 170px)" shade="#1d0c42" />
        <House left="76%" height="clamp(72px, 16vh, 150px)" body="#4a2596" roof="#24507a" windows={[2, 6]} lit={lit} />
        <Pine left="90%" height="clamp(96px, 23vh, 210px)" />
        <House left="38%" height="clamp(56px, 11vh, 104px)" body="#6a3fc0" roof="#2a1158" windows={[3, 7]} lit={lit} chimney={false} z={-1} />
      </motion.div>

      <motion.div className="cms-bd__layer cms-bd__ground" style={ground}>
        <svg viewBox="0 0 1600 260" preserveAspectRatio="none">
          <path d="M0,30 C200,6 380,48 600,26 C820,4 1000,40 1200,24 C1380,10 1500,30 1600,22 L1600,260 L0,260 Z" fill="var(--ink)" opacity="0.3" transform="translate(0 -6)" />
          <path d="M0,30 C200,6 380,48 600,26 C820,4 1000,40 1200,24 C1380,10 1500,30 1600,22 L1600,260 L0,260 Z" fill="url(#cms-snow)" />
          <path d="M80,120 C260,100 420,128 560,116 M900,140 C1060,120 1220,150 1400,128 M300,200 C520,184 700,214 900,198" stroke="#b9a2f0" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
        </svg>
      </motion.div>

      <div className="cms-bd__snow">
        {FLAKES.map((f, i) => (
          <span
            key={i}
            className="cms-flake is-ambient"
            style={{ '--x': `${f.x}%`, '--s': `${f.s}px`, '--o': f.o, '--d': `${f.d}s`, '--dl': `${f.dl}s`, '--drift': `${f.drift}px`, '--sway': `${f.sway}s` } as CSSProperties}
          >
            <i />
          </span>
        ))}
      </div>

      <div className="cms-bd__tint" style={{ opacity: Math.min(1, heat * 1.05) }} />
      <div className="cms-bd__vignette" style={{ opacity: Math.max(0, (heat - 0.3) / 0.7) }} />
    </div>
  )
})
