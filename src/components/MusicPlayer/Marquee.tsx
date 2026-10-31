import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

/** Single-line text that scrolls back and forth only when it doesn't fit. */
export function Marquee({ text, className = '' }: { text: string; className?: string }) {
  const boxRef = useRef<HTMLSpanElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const [dist, setDist] = useState(0)

  useLayoutEffect(() => {
    const box = boxRef.current
    const inner = innerRef.current
    if (!box || !inner) return
    const measure = () => setDist(Math.max(0, Math.ceil(inner.scrollWidth - box.clientWidth)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    // web fonts can land after the first measure
    void document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [text])

  const style = dist > 2 ? ({ '--mq-dist': `${-dist}px`, '--mq-dur': `${Math.max(5, dist / 14 + 4)}s` } as CSSProperties) : undefined
  return (
    <span ref={boxRef} className={`mp-marquee ${dist > 2 ? 'is-scrolling' : ''} ${className}`} title={dist > 2 ? text : undefined}>
      <span ref={innerRef} className="mp-marquee__inner" style={style}>
        {text}
      </span>
    </span>
  )
}
