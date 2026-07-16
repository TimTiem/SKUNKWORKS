import { db } from '../../db/db'
import { rollRewardDrop } from '../../domain/rewardDrop'
import { buildRedemption } from '../../domain/rewards'
import { nowISO } from '../../lib/time'
import { newId } from '../../lib/uuid'
import { requestSync } from '../../sync/sync'
import type { RewardRow } from '../../types/rows'

/**
 * Roll for a free-reward drop after a completion and, if it hits, record it as
 * a FREE redemption: a `redemptions` row with `coins_spent: 0` and NO matching
 * `coin_ledger` spend, so the coin balance is never touched (Decision 2 — this
 * is a gift, not a purchase). Kept OUT of completeTask so it never blocks or
 * delays the guaranteed XP reward (P1); the caller fires it after the
 * completion has rendered, exactly like the fact reveal.
 *
 * Returns the gifted reward to celebrate, or null.
 */
export async function rollAndGrantDrop(rng: () => number = Math.random): Promise<RewardRow | null> {
  const rewards = await db.rewards.filter((r) => r.deleted_at === null).toArray()
  const reward = rollRewardDrop(rewards, rng)
  if (!reward) return null

  await db.redemptions.add(buildRedemption(reward, newId(), nowISO(), 0))
  requestSync()
  return reward
}
