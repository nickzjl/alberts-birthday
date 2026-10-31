import type { ReactNode } from 'react'
import { INK } from './types'

/**
 * Shared 120×220 energy-drink can: body, label area (clipped), shading, neck,
 * lid with pull tab. Children are drawn inside the body clip.
 * Animatable parts: .can-lid, .can-tab, .can-hole
 */
export function CanShell({ id, body, rim = '#d9d3e6', lid = '#efeaf8', children }: { id: string; body: string; rim?: string; lid?: string; children?: ReactNode }) {
  return (
    <g>
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x="12" y="30" width="96" height="172" rx="12" />
        </clipPath>
      </defs>
      <rect x="12" y="30" width="96" height="172" rx="12" fill={body} />
      <g clipPath={`url(#${id}-clip)`}>
        {children}
        {/* cylinder shading */}
        <rect x="86" y="30" width="22" height="172" fill="#000" opacity="0.16" />
        <rect x="98" y="30" width="10" height="172" fill="#000" opacity="0.12" />
        <rect x="21" y="40" width="7" height="152" rx="3.5" fill="#fff" opacity="0.42" />
        <rect x="32" y="40" width="2.5" height="152" rx="1.25" fill="#fff" opacity="0.24" />
      </g>
      <rect x="12" y="30" width="96" height="172" rx="12" fill="none" stroke={INK} strokeWidth="5" />
      {/* bottom rim */}
      <path d="M15 194 Q17 210 33 211 H87 Q103 210 105 194 Z" fill={rim} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M26 203 H94" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      {/* neck */}
      <path d="M23 19 H97 L109 37 H11 Z" fill={rim} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M22 31 H98" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
      {/* lid */}
      <g className="can-lid">
        <ellipse cx="60" cy="19" rx="38" ry="9" fill={lid} stroke={INK} strokeWidth="4" />
        <ellipse cx="60" cy="19.5" rx="29" ry="5.2" fill="#cfc7de" />
        <ellipse className="can-hole" cx="69" cy="19.5" rx="8" ry="3" fill={INK} opacity="0" />
        <g className="can-tab">
          <rect x="47" y="14.5" width="22" height="9" rx="4.5" fill="#e6e1f1" stroke={INK} strokeWidth="2.2" />
          <ellipse cx="53.5" cy="19" rx="3.2" ry="2.1" fill={INK} />
          <circle cx="64" cy="19" r="1.6" fill={INK} />
        </g>
      </g>
    </g>
  )
}
