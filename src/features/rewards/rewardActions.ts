import { db } from '../../db/db'
import { coinBalance } from '../../domain/coins'
import {
  buildCoinSpend,
  buildRedemption,
  newReward,
  withRewardDeleted,
  withRewardPatch,
  type RewardInput,
} from '../../domain/rewards'
import { nowISO } from '../../lib/time'
import { newId } from '../../lib/uuid'
import { requestSync } from '../../sync/sync'
import { feedbackRedeem } from '../../ui/feedback'
import type { RewardRow } from '../../types/rows'

export async function addReward(input: RewardInput): Promise<void> {
  if (!input.name.trim() || input.coinCost <= 0) return
  await db.rewards.add(newReward(input, newId(), nowISO()))
  requestSync()
}

export async function updateReward(
  reward: RewardRow,
  patch: Partial<Pick<RewardRow, 'name' | 'description' | 'tier' | 'coin_cost'>>,
): Promise<void> {
  await db.rewards.put(withRewardPatch(reward, patch, nowISO()))
  requestSync()
}

export async function removeReward(reward: RewardRow): Promise<void> {
  await db.rewards.put(withRewardDeleted(reward, nowISO()))
  requestSync()
}

/**
 * Redeem inside ONE transaction with the balance re-checked from the ledger,
 * so a double tap (or two racing writes) can't spend the same coins twice.
 * Returns false when the balance genuinely doesn't cover it.
 */
export async function redeemReward(reward: RewardRow): Promise<boolean> {
  const now = nowISO()
  const redemption = buildRedemption(reward, newId(), now)
  const spend = buildCoinSpend(redemption, newId())

  const redeemed = await db.transaction('rw', [db.coin_ledger, db.redemptions], async () => {
    const ledger = await db.coin_ledger.filter((e) => e.deleted_at === null).toArray()
    if (coinBalance(ledger) < reward.coin_cost) return false
    await db.redemptions.add(redemption)
    await db.coin_ledger.add(spend)
    return true
  })

  if (redeemed) {
    feedbackRedeem()
    requestSync()
  }
  return redeemed
}
