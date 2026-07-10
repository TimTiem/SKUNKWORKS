import { createContext, useContext } from 'react'

/** Call after a completion has rendered to roll for (and maybe show) a fact. */
export const FactRevealContext = createContext<() => void>(() => {})

export function useFactReveal() {
  return useContext(FactRevealContext)
}
