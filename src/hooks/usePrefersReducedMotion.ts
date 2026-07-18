import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Reactive read of the OS "reduce motion" setting. CSS `@media
 * (prefers-reduced-motion)` covers our CSS animations centrally, but SMIL /
 * JS-driven motion can't be reached that way — this hook lets those paths
 * render a static fallback instead (design rule: all motion is honored).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia?.(QUERY).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY)
    if (!mq) return
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}
