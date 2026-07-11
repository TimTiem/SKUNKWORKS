import { useEffect, useState } from 'react'

/**
 * Wall-clock snapshot as React state (render-pure), refreshed every
 * `intervalMs` and on tab re-focus — day-granularity UI (due labels,
 * deadline urgency) only needs a slow tick.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const interval = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [intervalMs])
  return now
}
