import { memo, type CSSProperties } from 'react'

export type RoomMode = 'normal' | 'disco' | 'dim' | 'calm' | 'party'

/**
 * Original cozy-cartoon living room at night, in the site's grape palette:
 * window + moon, couch, floor lamp, wall frames, a hand-made (misspelled) banner,
 * bunting and balloons. Pure SVG/CSS; ambient loops carry `is-ambient`.
 */
export const LivingRoom = memo(function LivingRoom({ mode }: { mode: RoomMode }) {
  return (
    <div className={`pt-room pt-room--${mode}`} aria-hidden="true">
      <div className="pt-room__wall" />
      <div className="pt-room__moonbeam" />
      <Window />
      <div className="pt-room__frames">
        <Frame kind="clock" />
        <Frame kind="chicken" />
      </div>
      <Banner />
      <Bunting />
      <div className="pt-room__floor" />
      <div className="pt-room__baseboard" />
      <Rug />
      <Couch />
      <Lamp />
      <Balloons />
      <Disco on={mode === 'disco' || mode === 'party'} />
      <div className="pt-room__dim" />
      <div className="pt-room__veil" />
    </div>
  )
})

function Window() {
  return (
    <div className="pt-room__window">
      <svg viewBox="0 0 200 220" className="pt-room__svg">
        <defs>
          <linearGradient id="pt-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b0416" />
            <stop offset="1" stopColor="#2a1158" />
          </linearGradient>
          <radialGradient id="pt-moonglow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f6f1ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#f6f1ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* glass */}
        <rect x="26" y="20" width="148" height="164" rx="6" fill="url(#pt-sky)" />
        <circle cx="122" cy="66" r="44" fill="url(#pt-moonglow)" className="pt-room__moonglow is-ambient" />
        {/* crescent moon */}
        <path d="M128 44 a24 24 0 1 0 14 40 a19 19 0 1 1 -14 -40z" fill="#f6f1ff" />
        <circle cx="122" cy="72" r="2.4" fill="#c9b3ff" opacity="0.7" />
        <circle cx="114" cy="60" r="1.6" fill="#c9b3ff" opacity="0.7" />
        {/* stars */}
        <g fill="#e9e0ff" className="pt-room__stars is-ambient">
          <circle cx="52" cy="44" r="1.6" />
          <circle cx="70" cy="96" r="1.2" />
          <circle cx="150" cy="124" r="1.4" />
          <circle cx="58" cy="150" r="1.1" />
          <circle cx="96" cy="128" r="1.3" />
          <path d="M84 52 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5z" />
        </g>
        {/* rooftops silhouette */}
        <path d="M26 184 V150 h22 l10 -10 l10 10 h18 v-16 h20 v30 h14 l12 -12 l12 12 h20 v-22 h10 V184z" fill="#12062a" />
        <rect x="56" y="156" width="5" height="6" fill="#ffd23f" opacity="0.7" />
        <rect x="104" y="146" width="5" height="6" fill="#ffd23f" opacity="0.5" />
        {/* frame */}
        <rect x="26" y="20" width="148" height="164" rx="6" fill="none" stroke="#5326a8" strokeWidth="10" />
        <rect x="26" y="20" width="148" height="164" rx="6" fill="none" stroke="#0e0620" strokeWidth="3" />
        <path d="M100 20 V184 M26 102 H174" stroke="#5326a8" strokeWidth="7" />
        <path d="M100 20 V184 M26 102 H174" stroke="#0e0620" strokeWidth="1.5" opacity="0.6" />
        {/* sill */}
        <rect x="12" y="184" width="176" height="12" rx="4" fill="#6d36d6" stroke="#0e0620" strokeWidth="3" />
        {/* curtains */}
        <path d="M6 8 C 30 60, 10 130, 30 206 L 0 206 L 0 8z" fill="#8b4dff" stroke="#0e0620" strokeWidth="3" />
        <path d="M12 30 C 24 80, 14 140, 22 200" stroke="#6d36d6" strokeWidth="4" fill="none" />
        <path d="M194 8 C 170 60, 190 130, 170 206 L 200 206 L 200 8z" fill="#8b4dff" stroke="#0e0620" strokeWidth="3" />
        <path d="M188 30 C 176 80, 186 140, 178 200" stroke="#6d36d6" strokeWidth="4" fill="none" />
        {/* rod */}
        <rect x="-6" y="2" width="212" height="8" rx="4" fill="#3b1a7a" stroke="#0e0620" strokeWidth="3" />
      </svg>
    </div>
  )
}

function Frame({ kind }: { kind: 'clock' | 'chicken' }) {
  if (kind === 'clock') {
    return (
      <svg viewBox="0 0 80 80" className="pt-room__frame pt-room__frame--clock">
        <circle cx="40" cy="40" r="34" fill="#e9e0ff" stroke="#0e0620" strokeWidth="5" />
        <circle cx="40" cy="40" r="28" fill="none" stroke="#c9b3ff" strokeWidth="2" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x="38.5" y="13" width="3" height="7" rx="1.5" fill="#3b1a7a" transform={`rotate(${i * 90} 40 40)`} />
        ))}
        <path d="M40 40 L40 18" stroke="#0e0620" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M40 40 L42 24" stroke="#ff3ea5" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="40" cy="40" r="3" fill="#0e0620" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 90 100" className="pt-room__frame pt-room__frame--chicken">
      <rect x="4" y="4" width="82" height="92" rx="4" fill="#ffd23f" stroke="#0e0620" strokeWidth="4" />
      <rect x="12" y="12" width="66" height="76" fill="#3b1a7a" stroke="#0e0620" strokeWidth="2" />
      {/* a very serious portrait of a chicken */}
      <path d="M33 70 C 26 60, 30 44, 44 42 C 44 34, 52 30, 57 36 C 61 40, 58 46, 55 48 C 62 52, 64 64, 56 72 C 50 77, 38 76, 33 70z" fill="#f6f1ff" stroke="#0e0620" strokeWidth="2" />
      <path d="M50 30 l3 -5 l3 5 l3 -4 l1 6z" fill="#ff3b4e" stroke="#0e0620" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M58 40 l6 2 l-6 2z" fill="#ff8a2b" stroke="#0e0620" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="54" cy="38.5" r="1.6" fill="#0e0620" />
      <path d="M52 34.5 l4 1.5" stroke="#0e0620" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M42 76 v6 m10 -6 v6" stroke="#ff8a2b" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function Banner() {
  const letters = 'HAPPY BIRTHDAY ALBRET'.split('')
  return (
    <div className="pt-room__banner">
      <svg viewBox="0 0 400 60" className="pt-room__banner-string" preserveAspectRatio="none">
        <path d="M2 6 Q 200 46 398 6" fill="none" stroke="#c9b3ff" strokeWidth="2" />
      </svg>
      <div className="pt-room__banner-letters">
        {letters.map((ch, i) =>
          ch === ' ' ? (
            <span key={i} className="pt-room__banner-gap" />
          ) : (
            <span
              key={i}
              className={`pt-room__flag ${i >= 18 ? 'is-oops' : ''}`}
              style={{ '--i': i, '--n': letters.length } as CSSProperties}
            >
              {ch}
            </span>
          ),
        )}
        <span className="pt-room__banner-fix">ERT</span>
      </div>
    </div>
  )
}

function Bunting() {
  const colors = ['#c9b3ff', '#ff3ea5', '#c8ff2e', '#38e8ff', '#ffd23f', '#8b4dff']
  const flags = Array.from({ length: 22 }, (_, i) => i)
  return (
    <svg className="pt-room__bunting is-ambient" viewBox="0 0 1000 70" preserveAspectRatio="none">
      <path d="M0 8 Q 250 46 500 10 Q 750 46 1000 8" fill="none" stroke="#e9e0ff" strokeOpacity="0.55" strokeWidth="2" />
      {flags.map((i) => {
        const x = 12 + i * 45.5
        const half = x < 500 ? x / 500 : (x - 500) / 500
        const y = 8 + Math.sin(half * Math.PI) * 30
        return <path key={i} d={`M${x - 14} ${y} L${x + 14} ${y} L${x} ${y + 30} Z`} fill={colors[i % colors.length]} stroke="#0e0620" strokeWidth="2.5" strokeLinejoin="round" opacity="0.88" />
      })}
    </svg>
  )
}

function Rug() {
  return (
    <svg className="pt-room__rug" viewBox="0 0 600 90" preserveAspectRatio="none">
      <ellipse cx="300" cy="45" rx="296" ry="42" fill="#3b1a7a" stroke="#0e0620" strokeWidth="4" />
      <ellipse cx="300" cy="45" rx="270" ry="34" fill="none" stroke="#c9b3ff" strokeWidth="3" strokeDasharray="12 9" opacity="0.55" />
      <ellipse cx="300" cy="45" rx="220" ry="24" fill="#5326a8" opacity="0.55" />
    </svg>
  )
}

function Couch() {
  return (
    <div className="pt-room__couch">
      <svg viewBox="0 0 520 210" className="pt-room__svg">
        {/* back */}
        <path d="M58 30 C 58 12, 72 6, 92 6 H 428 C 448 6, 462 12, 462 30 V 120 H 58 Z" fill="#4a2296" stroke="#0e0620" strokeWidth="5" />
        <path d="M92 20 H 250 V 112 H 80 V 34 C 80 26, 84 20, 92 20 Z M270 20 H 428 C 436 20, 440 26, 440 34 V 112 H 270 Z" fill="#5a2bb4" stroke="#0e0620" strokeWidth="3.5" />
        <path d="M100 30 C 140 26, 200 26, 236 32 M284 32 C 330 26, 380 26, 422 30" stroke="#8b4dff" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.6" />
        {/* seat cushions */}
        <path d="M70 118 H 252 V 158 H 70 C 62 158, 58 152, 58 144 V 132 C 58 124, 62 118, 70 118 Z" fill="#6d36d6" stroke="#0e0620" strokeWidth="4.5" />
        <path d="M268 118 H 450 C 458 118, 462 124, 462 132 V 144 C 462 152, 458 158, 450 158 H 268 Z" fill="#6d36d6" stroke="#0e0620" strokeWidth="4.5" />
        <path d="M78 126 H 240 M278 126 H 444" stroke="#9a66ff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
        {/* base */}
        <rect x="40" y="156" width="440" height="30" rx="8" fill="#3b1a7a" stroke="#0e0620" strokeWidth="5" />
        {/* arms */}
        <path d="M10 92 C 10 72, 26 64, 44 64 C 64 64, 74 74, 74 92 V 186 H 10 Z" fill="#5a2bb4" stroke="#0e0620" strokeWidth="5" />
        <path d="M446 92 C 446 74, 456 64, 476 64 C 494 64, 510 72, 510 92 V 186 H 446 Z" fill="#5a2bb4" stroke="#0e0620" strokeWidth="5" />
        <path d="M24 80 C 32 72, 52 72, 60 80 M460 80 C 468 72, 488 72, 496 80" stroke="#8b4dff" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
        {/* throw pillow */}
        <path d="M384 70 C 400 60, 432 62, 444 74 C 448 92, 446 104, 440 116 C 420 120, 398 120, 382 112 C 378 98, 378 84, 384 70 Z" fill="#ff3ea5" stroke="#0e0620" strokeWidth="4" />
        <path d="M396 80 C 408 76, 422 76, 432 82" stroke="#ff9bd0" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* legs */}
        <path d="M60 186 l-6 20 h14 l4 -20z M446 186 l4 20 h14 l-6 -20z" fill="#12062a" stroke="#0e0620" strokeWidth="3" />
      </svg>
    </div>
  )
}

function Lamp() {
  return (
    <div className="pt-room__lamp">
      <div className="pt-room__lampglow is-ambient" />
      <svg viewBox="0 0 120 420" className="pt-room__svg">
        <defs>
          <linearGradient id="pt-shade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9e0ff" />
            <stop offset="0.6" stopColor="#c9b3ff" />
            <stop offset="1" stopColor="#a585f5" />
          </linearGradient>
          <linearGradient id="pt-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff4d6" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff4d6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M30 96 L -30 330 H 150 L 90 96 Z" fill="url(#pt-cone)" />
        <rect x="56" y="90" width="8" height="310" rx="3" fill="#3b1a7a" stroke="#0e0620" strokeWidth="3" />
        <ellipse cx="60" cy="404" rx="34" ry="10" fill="#3b1a7a" stroke="#0e0620" strokeWidth="4" />
        <path d="M24 30 H 96 L 112 98 H 8 Z" fill="url(#pt-shade)" stroke="#0e0620" strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M30 44 H 92" stroke="#fff" strokeWidth="3" opacity="0.5" strokeLinecap="round" />
        <path d="M8 98 H 112" stroke="#8b4dff" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function Balloons() {
  const b = [
    { x: 36, y: 40, c: '#8b4dff', r: -6 },
    { x: 74, y: 18, c: '#ff3ea5', r: 4 },
    { x: 108, y: 48, c: '#c9b3ff', r: 8 },
  ]
  return (
    <div className="pt-room__balloons is-ambient">
      <svg viewBox="0 0 150 300" className="pt-room__svg">
        {b.map((p, i) => (
          <g key={i} transform={`rotate(${p.r} ${p.x} ${p.y + 40})`}>
            <path d={`M${p.x} ${p.y + 46} C ${p.x - 8} ${p.y + 120}, ${75 + (i - 1) * 4} ${200}, 75 290`} stroke="#e9e0ff" strokeOpacity="0.6" strokeWidth="1.5" fill="none" />
            <ellipse cx={p.x} cy={p.y} rx="27" ry="33" fill={p.c} stroke="#0e0620" strokeWidth="4" />
            <path d={`M${p.x - 5} ${p.y + 32} l5 8 l5 -8z`} fill={p.c} stroke="#0e0620" strokeWidth="3" strokeLinejoin="round" />
            <ellipse cx={p.x - 9} cy={p.y - 12} rx="6" ry="9" fill="#fff" opacity="0.45" transform={`rotate(-20 ${p.x - 9} ${p.y - 12})`} />
          </g>
        ))}
      </svg>
    </div>
  )
}

function Disco({ on }: { on: boolean }) {
  return (
    <div className={`pt-room__disco ${on ? 'is-on' : ''}`}>
      <div className="pt-room__disco-lights">
        <span style={{ '--c': '#ff3ea5', '--d': '0s' } as CSSProperties} />
        <span style={{ '--c': '#38e8ff', '--d': '-0.7s' } as CSSProperties} />
        <span style={{ '--c': '#c8ff2e', '--d': '-1.4s' } as CSSProperties} />
        <span style={{ '--c': '#ffd23f', '--d': '-2.1s' } as CSSProperties} />
        <span style={{ '--c': '#8b4dff', '--d': '-2.8s' } as CSSProperties} />
      </div>
      <div className="pt-room__ball">
        <div className="pt-room__ball-cord" />
        <svg viewBox="0 0 100 100" className="pt-room__ball-svg">
          <defs>
            <clipPath id="pt-ballclip">
              <circle cx="50" cy="50" r="44" />
            </clipPath>
          </defs>
          <circle cx="50" cy="50" r="44" fill="#c9b3ff" />
          <g clipPath="url(#pt-ballclip)" className="pt-room__ball-tiles">
            {Array.from({ length: 10 }, (_, r) =>
              Array.from({ length: 12 }, (_, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={c * 10 - 6 + (r % 2) * 5}
                  y={r * 10 + 1}
                  width="9"
                  height="9"
                  fill={(r * 7 + c * 3) % 5 === 0 ? '#fff' : (r + c) % 3 === 0 ? '#8b4dff' : (r + c) % 3 === 1 ? '#e9e0ff' : '#b396ff'}
                />
              )),
            )}
          </g>
          <circle cx="50" cy="50" r="44" fill="none" stroke="#0e0620" strokeWidth="5" />
          <ellipse cx="34" cy="30" rx="10" ry="6" fill="#fff" opacity="0.7" transform="rotate(-30 34 30)" />
        </svg>
      </div>
    </div>
  )
}
