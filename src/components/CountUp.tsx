import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

/** Animates a number from its previous value to `value`. Instant under reduced motion. */
export function CountUp({ value, className, duration = 0.6 }: { value: number; className?: string; duration?: number }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (reduce) { from.current = value; setShown(value); return }
    const c = animate(from.current, value, {
      duration, ease: 'easeOut',
      onUpdate: (v) => { from.current = v; setShown(Math.round(v)) },
    })
    return () => c.stop()
  }, [value, reduce, duration])
  return <span className={className} aria-hidden>{shown}</span>
}
