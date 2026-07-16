import { useCallback, useState, type ReactNode } from 'react'
import type { RewardRow } from '../../types/rows'
import { feedbackDrop } from '../../ui/feedback'
import { RewardDropCard } from './RewardDropCard'
import { RewardDropContext } from './rewardDropContext'
import { rollAndGrantDrop } from './rewardDrop'

/**
 * App-level free-reward surface: any completion path calls `rollDrop()` (from
 * `rewardDropContext`) after its reward has rendered; on the rare hit, a free
 * redemption is granted and the drop card + jackpot sound/haptic fire. A newer
 * drop replaces an older one. Mirrors FactRevealProvider.
 */
export function RewardDropProvider({ children }: { children: ReactNode }) {
  const [reward, setReward] = useState<RewardRow | null>(null)

  const rollDrop = useCallback(() => {
    void rollAndGrantDrop().then((r) => {
      if (r) {
        setReward(r)
        feedbackDrop()
      }
    })
  }, [])

  return (
    <RewardDropContext.Provider value={rollDrop}>
      {children}
      {reward && <RewardDropCard reward={reward} onDismiss={() => setReward(null)} />}
    </RewardDropContext.Provider>
  )
}
