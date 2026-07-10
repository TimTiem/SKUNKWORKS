import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { RewardRow } from '../../types/rows'

/** Live list of the user's rewards, cheapest first. */
export function useRewards(): { rewards: RewardRow[]; loading: boolean } {
  const rows = useLiveQuery(
    () => db.rewards.filter((r) => r.deleted_at === null).toArray(),
    [],
  )
  return {
    rewards: (rows ?? []).sort((a, b) => a.coin_cost - b.coin_cost),
    loading: rows === undefined,
  }
}
