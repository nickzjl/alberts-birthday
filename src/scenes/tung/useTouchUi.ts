import { useEffect, useState } from 'react'

const COARSE_OR_NARROW = '(pointer: coarse), (max-width: 767px)'

/** true on touch devices / narrow screens → show the on-screen pad. */
export function useTouchUi() {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(COARSE_OR_NARROW).matches)
  useEffect(() => {
    const mq = window.matchMedia(COARSE_OR_NARROW)
    const update = () => setOn(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return on
}
