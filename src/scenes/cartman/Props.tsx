import { AnimatePresence, motion } from 'motion/react'

/** The evidence: an empty birthday plate, crumbs, one sad candle. */
export function CakePlate({ rattle }: { rattle: boolean }) {
  return (
    <motion.div
      className="cms-plate"
      animate={rattle ? { y: [0, -10, 0, -6, 0], rotate: [0, -6, 4, -3, 0] } : { y: 0, rotate: 0 }}
      transition={rattle ? { duration: 0.5, repeat: Infinity, ease: 'easeOut' } : { duration: 0.3 }}
    >
      <span className="cms-plate__note">the evidence</span>
      <svg viewBox="0 0 120 64" aria-hidden="true">
        <ellipse cx="60" cy="50" rx="56" ry="12" fill="var(--ink)" opacity="0.3" />
        <ellipse cx="60" cy="44" rx="56" ry="15" fill="#f6f1ff" stroke="var(--ink)" strokeWidth="3.5" />
        <ellipse cx="60" cy="42" rx="38" ry="8.5" fill="#e3d8ff" />
        {/* frosting smear + crumbs */}
        <path d="M34,42 Q48,34 66,40 Q80,44 86,38" stroke="var(--hot)" strokeWidth="6" strokeLinecap="round" fill="none" />
        {[
          [30, 46],
          [44, 47],
          [52, 38],
          [74, 47],
          [88, 44],
          [70, 36],
          [40, 40],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 2 ? 2.2 : 3} fill="#8a5a3c" stroke="var(--ink)" strokeWidth="1.2" />
        ))}
        {/* lone tipped-over candle */}
        <g transform="rotate(62 70 40)">
          <rect x="66" y="14" width="8" height="26" rx="2" fill="var(--cyan)" stroke="var(--ink)" strokeWidth="2.5" />
          <path d="M66,20 L74,24 M66,28 L74,32" stroke="var(--white)" strokeWidth="2.4" />
          <path d="M70,14 V9" stroke="var(--ink)" strokeWidth="2" />
        </g>
        {/* fork */}
        <path d="M18,30 L30,44" stroke="var(--lavender)" strokeWidth="4" strokeLinecap="round" />
        <path d="M14,24 l3,6 M18,23 l2,6 M22,24 l0,6" stroke="var(--lavender)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="cms-plate__smoke is-ambient" aria-hidden="true" />
    </motion.div>
  )
}

/**
 * The "apology" contract he slaps down on beat 3. It never goes over his face (the smug look IS the joke):
 * beside him under his pointing mitten when there's room (side layout), low in front of his belly on phones.
 */
export function Contract({ show, side }: { show: boolean; side: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`cms-contract ${side ? 'cms-contract--side' : ''}`}
          initial={{ y: 140, x: side ? -80 : -60, rotate: side ? -50 : -40, scale: 0.4, opacity: 0 }}
          animate={{ y: 0, x: 0, rotate: side ? -6 : 4, scale: 1, opacity: 1 }}
          exit={{ y: -260, x: 220, rotate: 70, scale: 0.6, opacity: 0, transition: { duration: 0.45, ease: 'easeIn' } }}
          transition={{ type: 'spring', stiffness: 420, damping: 16 }}
          aria-hidden="true"
        >
          <span className="cms-contract__title">
            <small>Official</small> Apology Contract
          </span>
          <ol>
            <li>It was Albert's fault.</li>
            <li className="cms-contract__extra">Cartman gets the leftover cake.</li>
            <li>No take-backsies.</li>
          </ol>
          <span className="cms-contract__sign">
            sign here: <i>x</i>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
