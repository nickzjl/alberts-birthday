import { useEffect, useMemo, useRef, useState } from 'react'
import { voice, type VoiceProfile } from '../../audio/voice'

export interface TypewriterProps {
  text: string
  /** who is talking (blip timbre). Omit for silent typing. */
  voice?: VoiceProfile
  /** characters per second (default 34) */
  cps?: number
  /** 0..1 — louder, more frantic blips */
  intensity?: number
  /** finish instantly */
  skip?: boolean
  onDone?: () => void
  /** called on every revealed character (e.g. to flap a mouth) */
  onChar?: (ch: string) => void
  className?: string
}

interface Seg {
  text: string
  em: boolean
}

/**
 * `*word*` marks emphasis (rendered loud + wobbly). A multi-word emphasis is split into
 * one wobbling chip per word, so long phrases can still wrap and each word gets its own space.
 */
function parse(text: string): Seg[] {
  const out: Seg[] = []
  const re = /\*([^*]+)\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), em: false })
    for (const part of m[1].split(/(\s+)/)) if (part) out.push({ text: part, em: !/^\s+$/.test(part) })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), em: false })
  return out
}

/** Emphasis chip classes: drop the side margin that touches punctuation ("*cake*." / "(*so* rude)"). */
function emClass(prev: Seg | undefined, next: Seg | undefined) {
  let c = 'tw-em'
  if (next && /^[.,!?;:…'"’”)\]]/.test(next.text)) c += ' tw-em--tight-r'
  if (prev && /['"‘“(\[]$/.test(prev.text)) c += ' tw-em--tight-l'
  return c
}

/**
 * Types text out with character-voice blips. The full text is laid out invisibly
 * from the start so the bubble never jumps in size while typing.
 */
export function Typewriter({ text, voice: profile, cps = 34, intensity = 0, skip, onDone, onChar, className }: TypewriterProps) {
  const segs = useMemo(() => parse(text), [text])
  const total = useMemo(() => segs.reduce((n, s) => n + s.text.length, 0), [segs])
  const plain = useMemo(() => segs.map((s) => s.text).join(''), [segs])
  // progress is tied to the text it belongs to, so a new line never flashes the old one
  const [prog, setProg] = useState({ text, shown: 0, done: false })
  const shown = prog.text === text ? prog.shown : 0
  const setShown = (n: number) => setProg({ text, shown: n, done: false })
  const doneFor = useRef<string | null>(null)
  const cbs = useRef({ onDone, onChar })
  useEffect(() => {
    cbs.current = { onDone, onChar }
  })

  useEffect(() => {
    if (skip && shown < total) setProg({ text, shown: total, done: false })
  }, [skip, shown, total, text])

  useEffect(() => {
    if (shown >= total) {
      if (doneFor.current !== text) {
        doneFor.current = text
        cbs.current.onDone?.()
      }
      return
    }
    const ch = plain[shown]
    const prev = plain[shown - 1] ?? ''
    let delay = 1000 / cps
    if ('.!?'.includes(prev)) delay *= 7
    else if (',;:—'.includes(prev)) delay *= 3.5
    else if (prev === '…') delay *= 6
    const id = window.setTimeout(() => {
      setShown(shown + 1)
      if (profile && /[a-z0-9]/i.test(ch) && shown % 2 === 0) voice.blip(profile, ch, intensity)
      cbs.current.onChar?.(ch)
    }, delay)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, total, plain, cps, profile, intensity, text])

  let budget = shown
  return (
    <span className={className} style={{ position: 'relative', display: 'inline' }}>
      <span className="u-visually-hidden">{plain}</span>
      <span aria-hidden="true">
        {segs.map((s, i) => {
          const vis = Math.max(0, Math.min(s.text.length, budget))
          budget -= s.text.length
          return (
            <span key={i} className={s.em ? emClass(segs[i - 1], segs[i + 1]) : undefined} style={s.em ? { animationDelay: `${-(i % 4) * 0.14}s` } : undefined}>
              <span>{s.text.slice(0, vis)}</span>
              <span style={{ opacity: 0 }}>{s.text.slice(vis)}</span>
            </span>
          )
        })}
      </span>
    </span>
  )
}
