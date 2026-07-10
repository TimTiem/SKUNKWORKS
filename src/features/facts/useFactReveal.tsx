import { useCallback, useState, type ReactNode } from 'react'
import type { Fact } from '../../content/facts/facts'
import { FactRevealContext } from './factRevealContext'
import { rollForFact } from './factReveal'
import { FactCard } from './FactCard'

/**
 * App-level fact surface: any completion path calls `revealFact()` (from
 * `factRevealContext`) after its reward has rendered; if the roll hits, the
 * card appears over the app. A newer reveal replaces an older one.
 */
export function FactRevealProvider({ children }: { children: ReactNode }) {
  const [fact, setFact] = useState<Fact | null>(null)

  const revealFact = useCallback(() => {
    void rollForFact().then((rolled) => {
      if (rolled) setFact(rolled)
    })
  }, [])

  return (
    <FactRevealContext.Provider value={revealFact}>
      {children}
      {fact && <FactCard fact={fact} onDismiss={() => setFact(null)} />}
    </FactRevealContext.Provider>
  )
}
