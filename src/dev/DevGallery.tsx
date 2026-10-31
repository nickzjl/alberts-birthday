import { useState, type ComponentType } from 'react'
import { Cartman } from '../characters/cartman/Cartman'
import { Peter } from '../characters/peter/Peter'
import { Tung } from '../characters/tung/Tung'
import { CARTMAN_EXPRESSIONS, CARTMAN_POSES, PETER_EXPRESSIONS, PETER_POSES, TUNG_EXPRESSIONS, TUNG_POSES } from '../characters/types'
import './dev.css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyChar = ComponentType<any>

const REG: Record<string, { C: AnyChar; expressions: readonly string[]; poses: readonly string[]; base: string; extra?: Record<string, unknown> }> = {
  cartman: { C: Cartman, expressions: CARTMAN_EXPRESSIONS, poses: CARTMAN_POSES, base: 'neutral' },
  peter: { C: Peter, expressions: PETER_EXPRESSIONS, poses: PETER_POSES, base: 'neutral' },
  tung: { C: Tung, expressions: TUNG_EXPRESSIONS, poses: TUNG_POSES, base: 'creepy', extra: { hasBat: true } },
}

/**
 * Dev-only character sheet: #/dev/cartman, #/dev/peter, #/dev/tung
 * Optional query after the name: #/dev/cartman?e=angry&p=fistShake&t=1&i=0.8&size=520
 * renders a single large character (handy for screenshots).
 */
export default function DevGallery({ which }: { which: string }) {
  const [name, query] = which.split('?')
  const params = new URLSearchParams(query ?? '')
  const entry = REG[name]
  const [talking, setTalking] = useState(params.get('t') === '1')
  const [intensity, setIntensity] = useState(Number(params.get('i') ?? 0))
  if (!entry) {
    return (
      <div className="dev">
        <h1>Dev gallery</h1>
        <p>
          Try <a href="#/dev/cartman">#/dev/cartman</a>, <a href="#/dev/peter">#/dev/peter</a>, <a href="#/dev/tung">#/dev/tung</a> (reload after changing the hash)
        </p>
      </div>
    )
  }
  const { C, expressions, poses, base, extra } = entry
  if (params.get('e') || params.get('p')) {
    const size = Number(params.get('size') ?? 520)
    return (
      <div className="dev dev--single">
        <div className="dev__cell dev__cell--single" style={{ width: size, height: size }}>
          <C expression={params.get('e') ?? base} pose={params.get('p') ?? 'idle'} talking={talking} intensity={intensity} {...extra} hasBat={params.get('bat') === '0' ? false : extra?.hasBat} />
        </div>
      </div>
    )
  }
  return (
    <div className="dev">
      <header className="dev__head">
        <h1>{name} — character sheet</h1>
        <label>
          <input type="checkbox" checked={talking} onChange={(e) => setTalking(e.target.checked)} /> talking
        </label>
        <label>
          intensity <input type="range" min={0} max={1} step={0.1} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} /> {intensity}
        </label>
      </header>
      <h2>Expressions (pose: idle)</h2>
      <div className="dev__grid">
        {expressions.map((e) => (
          <figure key={e} className="dev__fig">
            <div className="dev__cell">
              <C expression={e} pose="idle" talking={talking} intensity={intensity} {...extra} />
            </div>
            <figcaption>{e}</figcaption>
          </figure>
        ))}
      </div>
      <h2>Poses (expression: {base})</h2>
      <div className="dev__grid">
        {poses.map((p) => (
          <figure key={p} className="dev__fig">
            <div className="dev__cell">
              <C expression={base} pose={p} talking={talking} intensity={intensity} {...extra} />
            </div>
            <figcaption>{p}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
