/**
 * The setting: pre-dawn Indonesian village street with a pos ronda (night-watch hut).
 * Perf rule: the big set SVG is completely static; everything that animates lives in its own
 * small element on top (so only that layer is composited/repainted, never the whole street).
 */
import { memo, useMemo, type CSSProperties } from 'react'
import { FLOOR, H, HORIZON } from './constants'
import { Kentongan } from './Props'

const INK = '#0e0620'
const EXT = 900 // how far the set extends past the arena on each side (units)
const BELOW = 700 // ground extends below the arena (under the dock)

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------ */
/* Sky (full-bleed SceneShell backdrop)                                 */
/* ------------------------------------------------------------------ */

const STARS = (() => {
  const r = rng(7)
  return Array.from({ length: 70 }, (_, i) => ({ x: r() * 1000, y: r() * 520, s: r() < 0.12 ? 2 : r() < 0.4 ? 1.4 : 0.9, g: i % 3 }))
})()

export const SkyBackdrop = memo(function SkyBackdrop() {
  return (
    <div className="tg-sky" aria-hidden="true">
      <div className="tg-sky__red" />
      {[0, 1, 2].map((g) => (
        <svg key={g} className={`tg-sky__stars tg-twinkle tg-twinkle--${g} is-ambient`} viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
          {STARS.filter((s) => s.g === g).map((s, i) =>
            s.s >= 2 ? (
              <path key={i} d={`M${s.x} ${s.y - 6}l1.4 4.6 4.6 1.4 -4.6 1.4 -1.4 4.6 -1.4 -4.6 -4.6 -1.4 4.6 -1.4z`} fill="#f6f1ff" />
            ) : (
              <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#e9e0ff" />
            ),
          )}
        </svg>
      ))}
      <div className="tg-moon is-ambient">
        <svg viewBox="0 0 120 120" width="100%" height="100%">
          <defs>
            <radialGradient id="tg-moon-glow">
              <stop offset="0.35" stopColor="#e9e0ff" stopOpacity="0.45" />
              <stop offset="1" stopColor="#8b4dff" stopOpacity="0" />
            </radialGradient>
            <mask id="tg-moon-mask">
              <rect width="120" height="120" fill="#fff" />
              <circle cx="74" cy="50" r="27" fill="#000" />
            </mask>
          </defs>
          <circle cx="60" cy="60" r="60" fill="url(#tg-moon-glow)" />
          <g mask="url(#tg-moon-mask)">
            <circle cx="58" cy="60" r="30" fill="#f6f1ff" stroke={INK} strokeWidth="3" />
            <circle cx="46" cy="70" r="4" fill="#c9b3ff" />
            <circle cx="40" cy="54" r="2.5" fill="#c9b3ff" />
          </g>
        </svg>
      </div>
      <div className="tg-cloud tg-cloud--a is-ambient" />
      <div className="tg-cloud tg-cloud--b is-ambient" />
      <div className="tg-cloud tg-cloud--c is-ambient" />
    </div>
  )
})

/* ------------------------------------------------------------------ */
/* Street set (inside the scaled arena)                                 */
/* ------------------------------------------------------------------ */

function skyline(w: number) {
  const r = rng(42)
  const far: string[] = []
  const windows: Array<{ x: number; y: number; w: number; h: number }> = []
  const palms: Array<{ x: number; h: number }> = []
  let x = -EXT
  while (x < w + EXT) {
    const bw = 90 + r() * 90
    const wallH = 40 + r() * 46
    const roofH = 26 + r() * 22
    const base = HORIZON - 10
    const top = base - wallH
    // house: wall + gable roof with overhang
    far.push(`M${x + 6} ${base} V${top} H${x - 8} L${x + bw / 2} ${top - roofH} L${x + bw + 8} ${top} H${x + bw - 6} V${base} Z`)
    if (r() < 0.7) windows.push({ x: x + bw * 0.25, y: top + 12, w: 12 + r() * 8, h: 12 })
    if (r() < 0.4) windows.push({ x: x + bw * 0.62, y: top + 14, w: 10, h: 14 })
    if (r() < 0.35) palms.push({ x: x + bw + 14, h: 120 + r() * 70 })
    x += bw + 18 + r() * 30
  }
  return { far: far.join(' '), windows, palms }
}

/** Mosque silhouette (dome + minaret) — sahur is a Ramadan thing. */
function Mosque({ x }: { x: number }) {
  const b = HORIZON - 10
  return (
    <g fill="#1f0d40" stroke="#4b2590" strokeWidth="3" strokeLinejoin="round">
      <rect x={x - 70} y={b - 70} width="140" height="70" />
      <path d={`M${x - 52} ${b - 70} C ${x - 52} ${b - 140} ${x + 52} ${b - 140} ${x + 52} ${b - 70} Z`} />
      <rect x={x - 2} y={b - 160} width="4" height="26" />
      <path d={`M${x + 92} ${b} V${b - 170} L${x + 102} ${b - 196} L${x + 112} ${b - 170} V${b} Z`} />
      <rect x={x + 88} y={b - 130} width="28" height="8" />
      <g stroke="none">
        <circle cx={x} cy={b - 166} r="6" fill="#ffd23f" opacity="0.8" />
        <rect x={x - 46} y={b - 50} width="14" height="22" rx="7" fill="#ffd23f" opacity="0.4" />
        <rect x={x + 32} y={b - 50} width="14" height="22" rx="7" fill="#ffd23f" opacity="0.4" />
      </g>
    </g>
  )
}

function lampGeo(x: number) {
  const top = HORIZON - 300
  return { top, bulbX: x + 52, bulbY: top + 30 }
}

function StreetLamp({ x }: { x: number }) {
  const base = HORIZON + 6
  const { top } = lampGeo(x)
  return (
    <g>
      <rect x={x - 6} y={top + 10} width="12" height={base - top - 10} rx="4" fill="#3b2456" stroke={INK} strokeWidth="3" />
      <rect x={x - 12} y={base - 22} width="24" height="22" rx="5" fill="#2e1a48" stroke={INK} strokeWidth="3" />
      <path d={`M${x} ${top + 18} C ${x} ${top - 12} ${x + 20} ${top - 18} ${x + 50} ${top + 6}`} fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" />
      <path d={`M${x} ${top + 18} C ${x} ${top - 12} ${x + 20} ${top - 18} ${x + 50} ${top + 6}`} fill="none" stroke="#3b2456" strokeWidth="7" strokeLinecap="round" />
      <path d={`M${x + 34} ${top + 6} h36 l-8 18 h-20 z`} fill="#2e1a48" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx={x + 52} cy={top + 27} rx="9" ry="6" fill="#fff4d6" stroke={INK} strokeWidth="2.5" />
    </g>
  )
}

function ronda(x: number) {
  const halfW = 120
  return { halfW, floorY: HORIZON - 44, beam: HORIZON - 222, postL: x - halfW + 8 }
}

function PosRonda({ x }: { x: number }) {
  const base = HORIZON + 4
  const { halfW, floorY, beam, postL } = ronda(x)
  const posts = [postL, x + halfW - 8]
  return (
    <g>
      {/* back wall: bamboo slats */}
      <rect x={x - halfW + 8} y={beam + 20} width={halfW * 2 - 16} height={floorY - beam - 20} fill="#3e1d3c" stroke={INK} strokeWidth="3" />
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} x={x - halfW + 14 + i * 18} y={beam + 24} width="12" height={floorY - beam - 26} rx="5" fill={i % 2 ? '#5a2c4e' : '#653457'} />
      ))}
      <rect x={x - halfW + 8} y={beam + 70} width={halfW * 2 - 16} height="8" fill="#2a0e26" opacity="0.6" />
      {/* night-watch schedule on the back wall */}
      <g transform={`rotate(3 ${x + 57} ${beam + 114})`}>
        <rect x={x + 26} y={beam + 92} width="62" height="44" rx="3" fill="#e9e0ff" stroke={INK} strokeWidth="2.5" />
        <path d={`M${x + 34} ${beam + 104} h40 M${x + 34} ${beam + 114} h46 M${x + 34} ${beam + 124} h30`} stroke="#6d36d6" strokeWidth="3" />
      </g>
      {/* raised floor (bale-bale) */}
      <rect x={x - halfW - 4} y={floorY} width={halfW * 2 + 8} height="16" rx="3" fill="#8a4a5e" stroke={INK} strokeWidth="3" />
      <path d={`M${x - halfW} ${floorY + 6} H${x + halfW}`} stroke="#5a2c4e" strokeWidth="2" />
      <rect x={x - halfW + 4} y={floorY + 16} width={halfW * 2 - 8} height={base - floorY - 16} fill="#2a1030" opacity="0.7" />
      {[-halfW + 10, 0, halfW - 10].map((dx) => (
        <rect key={dx} x={x + dx - 6} y={floorY + 14} width="12" height={base - floorY - 14} fill="#5e3550" stroke={INK} strokeWidth="2.5" />
      ))}
      {/* posts */}
      {posts.map((px) => (
        <g key={px}>
          <rect x={px - 9} y={beam} width="18" height={base - beam} fill="#6e3d5c" stroke={INK} strokeWidth="3" />
          <rect x={px - 5} y={beam + 4} width="4" height={base - beam - 8} fill="#9a5a74" opacity="0.6" />
        </g>
      ))}
      {/* tea + sandals on the floor */}
      <rect x={x - 70} y={floorY - 16} width="13" height="16" rx="2" fill="#e9e0ff" stroke={INK} strokeWidth="2.5" />
      <path d={`M${x - 57} ${floorY - 12} q8 2 0 9`} fill="none" stroke={INK} strokeWidth="2.5" />
      <ellipse cx={x - 30} cy={floorY - 2} rx="14" ry="4" fill="#38e8ff" stroke={INK} strokeWidth="2" />
      <ellipse cx={x - 8} cy={floorY - 2} rx="14" ry="4" fill="#38e8ff" stroke={INK} strokeWidth="2" />
      {/* roof */}
      <rect x={x - halfW - 26} y={beam - 4} width={halfW * 2 + 52} height="16" fill="#5e3550" stroke={INK} strokeWidth="3" />
      <path d={`M${x - halfW - 48} ${beam + 2} L${x - halfW + 20} ${beam - 74} H${x + halfW - 20} L${x + halfW + 48} ${beam + 2} Z`} fill="#7d2f5f" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${x - halfW - 40 + i * 14} ${beam - 6 - i * 18} H${x + halfW + 40 - i * 14}`} stroke="#5a1d45" strokeWidth="3" />
      ))}
      <path d={`M${x - halfW + 20} ${beam - 74} H${x + halfW - 20}`} stroke="#c9b3ff" strokeWidth="3" opacity="0.5" />
      {/* sign */}
      <g transform={`rotate(-2 ${x} ${beam + 2})`}>
        <path d={`M${x - 50} ${beam + 10} V${beam + 22} M${x + 50} ${beam + 10} V${beam + 22}`} stroke={INK} strokeWidth="2.5" />
        <rect x={x - 78} y={beam + 18} width="156" height="40" rx="5" fill="#1b0a3a" stroke={INK} strokeWidth="3" />
        <rect x={x - 73} y={beam + 23} width="146" height="30" rx="3" fill="none" stroke="#ffd23f" strokeWidth="1.5" opacity="0.6" />
        <text x={x} y={beam + 46} textAnchor="middle" className="tg-sign-text">
          POS RONDA
        </text>
      </g>
    </g>
  )
}

function Bench({ x }: { x: number }) {
  const b = HORIZON + 8
  return (
    <g>
      <rect x={x - 60} y={b - 62} width="120" height="10" rx="3" fill="#7a4560" stroke={INK} strokeWidth="3" />
      <rect x={x - 60} y={b - 46} width="120" height="10" rx="3" fill="#7a4560" stroke={INK} strokeWidth="3" />
      <rect x={x - 66} y={b - 30} width="132" height="12" rx="3" fill="#8a4a5e" stroke={INK} strokeWidth="3" />
      {[-54, 46].map((dx) => (
        <rect key={dx} x={x + dx} y={b - 70} width="8" height="70" rx="2" fill="#5e3550" stroke={INK} strokeWidth="2.5" />
      ))}
    </g>
  )
}

const BULB_COLORS = ['#ff3ea5', '#c8ff2e', '#38e8ff', '#ffd23f']
const SAG = 46

function bulbPoints(x0: number, x1: number, y: number) {
  const n = Math.max(6, Math.round((x1 - x0) / 46))
  return Array.from({ length: n - 1 }, (_, k) => {
    const t = (k + 1) / n
    // point on the quadratic wire  M x0,y  Q mid, y+2*SAG  x1,y
    return { x: x0 + (x1 - x0) * t, y: y + 4 * SAG * t * (1 - t) }
  })
}

/** Ramadan-style string lights: three separately-twinkling layers of bulbs. */
function LightBulbs({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const pts = bulbPoints(x0, x1, y)
  const vb = { x: x0 - 20, y: y - 10, w: x1 - x0 + 40, h: SAG * 2 + 50 }
  return (
    <>
      {[0, 1, 2].map((g) => (
        <svg
          key={g}
          className={`tg-layer-abs tg-bulbs tg-bulbs--${g} is-ambient`}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          style={{ left: vb.x, top: vb.y, width: vb.w, height: vb.h }}
          aria-hidden="true"
        >
          {pts.map((p, i) =>
            i % 3 === g ? (
              <g key={i}>
                <circle cx={p.x} cy={p.y + 9} r="11" fill={BULB_COLORS[i % 4]} opacity="0.28" />
                <rect x={p.x - 4.5} y={p.y + 2} width="9" height="13" rx="4.5" fill={BULB_COLORS[i % 4]} stroke={INK} strokeWidth="2" />
              </g>
            ) : null,
          )}
        </svg>
      ))}
    </>
  )
}

const abs = (left: number, top: number, width: number, height: number): CSSProperties => ({ left, top, width, height })

/** The village street — static SVG drawn once per arena width, plus small animated layers. */
export const StreetSet = memo(function StreetSet({ w }: { w: number }) {
  const { far, windows, palms } = useMemo(() => skyline(w), [w])
  const lampX = Math.max(70, Math.min(150, w * 0.1))
  const posX = Math.max(lampX + 320, w - 175)
  const lamp = lampGeo(lampX)
  const rd = ronda(posX)
  const lights = { x0: lampX + 56, x1: posX - 150, y: HORIZON - 290 }
  const gravel = useMemo(() => {
    const r = rng(9)
    return Array.from({ length: 140 }, () => ({ x: -EXT + r() * (w + EXT * 2), y: HORIZON + 14 + r() * (H + 160 - HORIZON), r: 1 + r() * 2.4 }))
  }, [w])
  const vb = `${-EXT} 0 ${w + EXT * 2} ${H + BELOW}`
  const setStyle = { left: -EXT, width: w + EXT * 2, height: H + BELOW }
  const coneH = FLOOR + 30 - lamp.bulbY
  // phase 3: the neighbours wake up — a handful of on-screen windows blaze on, one after another
  const angry = useMemo(() => {
    // only windows nothing stands in front of (mosque, lamp post, bench, pos ronda)
    const mx = w * 0.42
    const blocked: Array<[number, number]> = [
      [mx - 78, mx + 122],
      [lampX - 16, lampX + 16],
      [posX - 285, posX + 175],
    ]
    const vis = windows.filter((wd) => wd.x > 30 && wd.x + wd.w < w - 30 && !blocked.some(([a, b]) => wd.x + wd.w > a && wd.x < b))
    const n = Math.min(5, vis.length)
    return Array.from({ length: n }, (_, i) => vis[Math.floor(((i + 0.5) * vis.length) / n)])
  }, [windows, w, lampX, posX])
  return (
    <>
      {/* far skyline + windows (behind everything else, so the angry windows can sit on top of it) */}
      <svg className="tg-set" viewBox={vb} style={setStyle} aria-hidden="true">
        <path d={far} fill="#14062e" transform="translate(8 -8)" />
        <path d={far} fill="#2a1158" stroke="#4b2590" strokeWidth="3" strokeLinejoin="round" />
        {windows.map((wd, i) => (
          <rect key={i} x={wd.x} y={wd.y} width={wd.w} height={wd.h} rx="2" fill="#ffd23f" opacity={i % 3 ? 0.5 : 0.75} />
        ))}
      </svg>
      {angry.map((wd, i) => (
        <div key={i} className="tg-layer-abs tg-nwin" style={{ ...abs(wd.x - 3, wd.y - 3, wd.w + 6, wd.h + 6), '--i': i } as CSSProperties} />
      ))}
      <svg className="tg-set" viewBox={vb} style={setStyle} aria-hidden="true">
        <defs>
          <linearGradient id="tg-road" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3a1a6a" />
            <stop offset="0.25" stopColor="#2a1158" />
            <stop offset="1" stopColor="#12062a" />
          </linearGradient>
        </defs>
        <Mosque x={w * 0.42} />
        {palms.map((p, i) => (
          <g key={i} fill="#1a0a3a">
            <path d={`M${p.x - 3} ${HORIZON - 8} Q ${p.x + 8} ${HORIZON - p.h / 2} ${p.x + 2} ${HORIZON - p.h} l6 0 Q ${p.x + 14} ${HORIZON - p.h / 2} ${p.x + 4} ${HORIZON - 8} Z`} />
            {[-60, -25, 15, 50, 160].map((a) => (
              <ellipse key={a} cx={p.x + 5} cy={HORIZON - p.h} rx="34" ry="7" transform={`rotate(${a} ${p.x + 5} ${HORIZON - p.h}) translate(26 0)`} />
            ))}
          </g>
        ))}
        {/* low wall along the far side */}
        <rect x={-EXT} y={HORIZON - 26} width={w + EXT * 2} height="20" fill="#2e1456" />
        <path d={`M${-EXT} ${HORIZON - 26} H${w + EXT}`} stroke={INK} strokeWidth="3" />
        {/* road */}
        <rect x={-EXT} y={HORIZON - 8} width={w + EXT * 2} height={H + BELOW - HORIZON + 8} fill="url(#tg-road)" />
        <rect x={-EXT} y={HORIZON - 8} width={w + EXT * 2} height="10" fill="#4a2a7a" stroke={INK} strokeWidth="3" />
        {gravel.map((g, i) => (
          <circle key={i} cx={g.x} cy={g.y} r={g.r} fill={i % 4 ? '#3b1a7a' : '#5326a8'} opacity="0.7" />
        ))}
        <path d={`M${-EXT} ${FLOOR + 46} H${w + EXT}`} stroke="#c9b3ff" strokeWidth="4" strokeDasharray="38 46" opacity="0.13" />

        <path d={`M${lights.x0} ${lights.y} Q ${(lights.x0 + lights.x1) / 2} ${lights.y + SAG * 2} ${lights.x1} ${lights.y}`} fill="none" stroke={INK} strokeWidth="2.5" />
        <Bench x={posX - 210} />
        <PosRonda x={posX} />
        <StreetLamp x={lampX} />
      </svg>

      {/* ---- animated layers (each its own small element) ---- */}
      <div className="tg-layer-abs tg-pool is-ambient" style={abs(lampX + 60 - 250, FLOOR + 6 - 52, 500, 104)} />
      <svg className="tg-layer-abs tg-cone is-ambient" viewBox={`0 0 350 ${coneH}`} preserveAspectRatio="none" style={abs(lampX - 120, lamp.bulbY, 350, coneH)} aria-hidden="true">
        <defs>
          <linearGradient id="tg-cone" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffcf8a" stopOpacity="0.32" />
            <stop offset="1" stopColor="#ffcf8a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M172 0 L0 ${coneH} L350 ${coneH} Z`} fill="url(#tg-cone)" />
      </svg>
      <div className="tg-layer-abs tg-bulbglow is-ambient" style={abs(lamp.bulbX - 42, lamp.bulbY - 42, 84, 84)} />
      <LightBulbs {...lights} />
      <div className="tg-layer-abs tg-kentongan is-ambient" style={abs(rd.postL - 46, rd.beam + 10, 32, 92)}>
        <span className="tg-rope" style={{ height: 24 }} />
        <span className="tg-kentongan__drum">
          <Kentongan rope={false} />
        </span>
      </div>
      <div className="tg-layer-abs tg-stick is-ambient" style={abs(rd.postL - 14, rd.beam + 10, 10, 76)}>
        <span className="tg-rope" style={{ height: 30 }} />
        <span className="tg-stick__wood" />
      </div>
      <svg className="tg-layer-abs tg-steam is-ambient" viewBox="0 0 12 30" style={abs(posX - 69, rd.floorY - 50, 12, 30)} aria-hidden="true">
        <path d="M6 28 q-4 -6 0 -12 q4 -6 0 -12" fill="none" stroke="#e9e0ff" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {/* …and they are NOT happy about it (phase 3 only, CSS-timed) */}
      {/* up in the sky over the string lights, clear of everyone's heads */}
      <div className="tg-shout tg-shout--a" style={{ left: Math.max(30, w * 0.12), top: HORIZON - 290 }} aria-hidden="true">
        WHO IS BANGING AT 3AM?!
      </div>
      <div className="tg-shout tg-shout--b" style={{ right: Math.max(30, w * 0.1), top: HORIZON - 250 }} aria-hidden="true">
        SOME OF US HAVE WORK!!
      </div>
    </>
  )
})
