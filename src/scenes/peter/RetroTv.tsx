import './tv.css'

/**
 * Peter's beloved TV, parked right behind the present (that's why he shoves the box away).
 * Drawn in the same 100 × 100 box as the gift so it hides behind it: only the rabbit-ear
 * antennas and the screen glow peek out until the present slides off. On screen: the giant
 * chicken fight, live, obviously.
 */
export function RetroTv() {
  return (
    <div className="pt-tv" aria-hidden="true">
      <div className="pt-tv__glow is-ambient" />
      <svg className="pt-tv__svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="pt-tv-screen" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#b9f3ff" />
            <stop offset="0.55" stopColor="#7fb8ff" />
            <stop offset="1" stopColor="#7b5cff" />
          </linearGradient>
          <linearGradient id="pt-tv-wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a4630" />
            <stop offset="1" stopColor="#4e2a1c" />
          </linearGradient>
          <clipPath id="pt-tv-clip">
            <rect x="18.5" y="48.5" width="46" height="31" rx="6" />
          </clipPath>
          <pattern id="pt-tv-lines" width="2" height="1.6" patternUnits="userSpaceOnUse">
            <rect width="2" height="0.55" fill="#0e0620" opacity="0.22" />
          </pattern>
        </defs>

        {/* rabbit ears */}
        <g stroke="#0e0620" strokeLinecap="round">
          <line x1="49" y1="40" x2="13" y2="-7" strokeWidth="2.6" />
          <line x1="49" y1="40" x2="13" y2="-7" strokeWidth="1.2" stroke="#c9c3d6" />
          <line x1="52" y1="40" x2="89" y2="-11" strokeWidth="2.6" />
          <line x1="52" y1="40" x2="89" y2="-11" strokeWidth="1.2" stroke="#c9c3d6" />
        </g>
        <circle cx="13" cy="-7" r="2.2" fill="#ff3ea5" stroke="#0e0620" strokeWidth="1.1" />
        <circle cx="89" cy="-11" r="2.2" fill="#ff3ea5" stroke="#0e0620" strokeWidth="1.1" />
        <ellipse cx="50.5" cy="40.5" rx="7" ry="3.6" fill="#2b1a2e" stroke="#0e0620" strokeWidth="1.3" />

        {/* legs */}
        <path d="M21 87 L19 96 L25 96 L27 87 Z M73 87 L75 96 L81 96 L79 87 Z" fill="#3a1f15" stroke="#0e0620" strokeWidth="1.3" strokeLinejoin="round" />

        {/* wooden cabinet */}
        <rect x="9" y="41" width="82" height="47" rx="5.5" fill="url(#pt-tv-wood)" stroke="#0e0620" strokeWidth="1.8" />
        <path d="M13 44.5 H87" stroke="#a8694a" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
        <path d="M12 60 C30 58 40 62 60 59" stroke="#3e2116" strokeWidth="0.6" fill="none" opacity="0.6" />
        <path d="M12 74 C26 76 44 72 66 75" stroke="#3e2116" strokeWidth="0.6" fill="none" opacity="0.6" />

        {/* screen bezel + screen */}
        <rect x="15" y="45.5" width="53" height="37" rx="7.5" fill="#241628" stroke="#0e0620" strokeWidth="1.4" />
        <rect x="18.5" y="48.5" width="46" height="31" rx="6" fill="url(#pt-tv-screen)" className="pt-tv__screen" />
        <g clipPath="url(#pt-tv-clip)">
          {/* a little arena floor */}
          <ellipse cx="41.5" cy="80" rx="30" ry="6" fill="#5b3fd0" opacity="0.55" />
          {/* the giant chicken, fighting someone off-screen */}
          <g className="pt-tv__chicken is-ambient">
            <path d="M33 70 C30 62 36 56 43 58 C46 54 51 54 52 58 C55 59 55 63 52 64 C52 70 46 74 40 73 C37 73 34 72 33 70 Z" fill="#fffaf0" stroke="#0e0620" strokeWidth="1" />
            <path d="M47 54.5 C47.5 52.5 49 52.5 49.5 54 C50 52 52 52 51.8 54.5" fill="#ff3b4e" stroke="#0e0620" strokeWidth="0.7" />
            <path d="M53.5 59.3 L57 60.5 L53.5 61.6 Z" fill="#ffd23f" stroke="#0e0620" strokeWidth="0.6" strokeLinejoin="round" />
            <circle cx="50.8" cy="58.6" r="0.9" fill="#0e0620" />
            <path d="M52.6 62.6 C53.4 64.4 52.4 65.6 51.4 64.8" fill="#ff3b4e" stroke="#0e0620" strokeWidth="0.5" />
            <path d="M38 64 C41 62 44 63 45 66" fill="none" stroke="#0e0620" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M40 73 L39 78 M45 72.5 L46.5 78" stroke="#ffb02e" strokeWidth="1.1" strokeLinecap="round" />
          </g>
          {/* a fist flying in from off-screen */}
          <g className="pt-tv__punch is-ambient">
            <rect x="57" y="60" width="9" height="5.5" rx="2.6" fill="#f9bba4" stroke="#0e0620" strokeWidth="0.8" />
            <path d="M66 61 h6 M66 64.5 h6" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" opacity="0.8" />
          </g>
          {/* LIVE badge */}
          <rect x="21" y="51" width="11.5" height="5" rx="1.4" fill="#ff3b4e" stroke="#0e0620" strokeWidth="0.6" />
          <circle cx="23.3" cy="53.5" r="0.95" fill="#fff" className="pt-tv__live is-ambient" />
          <text x="25" y="55" fontSize="3.4" fontWeight="800" fill="#fff" fontFamily="var(--font-body)">LIVE</text>
          {/* lower third */}
          <rect x="18.5" y="74" width="46" height="5.6" fill="#0e0620" opacity="0.78" />
          <text x="20.5" y="78.1" fontSize="3" fontWeight="700" fill="#c8ff2e" fontFamily="var(--font-body)" letterSpacing="0.1">
            CHICKEN FIGHT · RD 47
          </text>
          <rect x="18.5" y="46.9" width="46" height="33" fill="url(#pt-tv-lines)" className="pt-tv__scan" />
          {/* glass glare */}
          <path d="M21 51 C30 49.5 42 49.5 52 50.5 L50 54 C40 53 30 53.5 22 55 Z" fill="#fff" opacity="0.28" />
        </g>

        {/* knobs + speaker grille */}
        <circle cx="79" cy="53" r="4.3" fill="#2b1a2e" stroke="#0e0620" strokeWidth="1.2" />
        <path d="M79 49.5 V53" stroke="#c9b3ff" strokeWidth="1" strokeLinecap="round" />
        <circle cx="79" cy="64" r="3.4" fill="#2b1a2e" stroke="#0e0620" strokeWidth="1.2" />
        <path d="M79 64 L81.4 62.2" stroke="#c9b3ff" strokeWidth="1" strokeLinecap="round" />
        <g stroke="#2b1a2e" strokeWidth="1.1" strokeLinecap="round">
          <path d="M73.5 72 H84.5 M73.5 75.2 H84.5 M73.5 78.4 H84.5 M73.5 81.6 H84.5" />
        </g>
        <circle cx="86" cy="45.5" r="0.9" fill="#c8ff2e" className="pt-tv__live is-ambient" />
      </svg>
    </div>
  )
}
