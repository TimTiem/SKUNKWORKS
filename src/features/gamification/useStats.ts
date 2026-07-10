import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { coinBalance } from '../../domain/coins'
import { levelProgress, type LevelProgress } from '../../domain/levels'
import { totalXp } from '../../domain/xp'

export interface Stats extends LevelProgress {
  totalXp: number
  coinBalance: number
  totalCompletions: number
}

/**
 * Derived stats, recomputed live from the append-only logs on every local
 * write (Decision 1 — no cached counters; at personal volume the recompute
 * is instant, so correctness is free).
 */
export function useStats(): Stats | undefined {
  const completions = useLiveQuery(
    () => db.completions.filter((c) => c.deleted_at === null).toArray(),
    [],
  )
  const ledger = useLiveQuery(
    () => db.coin_ledger.filter((e) => e.deleted_at === null).toArray(),
    [],
  )
  if (!completions || !ledger) return undefined

  const xp = totalXp(completions)
  return {
    totalXp: xp,
    ...levelProgress(xp),
    coinBalance: coinBalance(ledger),
    totalCompletions: completions.length,
  }
}
