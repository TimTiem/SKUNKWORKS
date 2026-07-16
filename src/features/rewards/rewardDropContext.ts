import { createContext, useContext } from 'react'

/** Call after a completion has rendered to roll for (and maybe grant) a free reward. */
export const RewardDropContext = createContext<() => void>(() => {})

export function useRewardDrop() {
  return useContext(RewardDropContext)
}
