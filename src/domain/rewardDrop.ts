import type { RewardRow } from '../types/rows'

/**
 * Surprise free-reward "drop" (Tim, 2026-07-16): a small chance that finishing
 * a task unlocks one of your OWN small-tier rewards for free. It's a
 * variable-ratio intermittent reward layered on top of the guaranteed XP/coins
 * — purely additive (P4/P8: a miss simply doesn't drop, never a penalty), and
 * distinct from the ~10% double-XP crit (that pays XP; this gifts a real
 * reward). Only genuinely SMALL rewards are ever gifted, so the coin economy
 * for the medium/big items stays meaningful.
 *
 * Pure and injectable (`rng`) so both the odds and the pick are deterministic
 * in tests. The feature layer (features/rewards/rewardDrop.ts) grants the
 * result as a free redemption and celebrates it.
 */

/** ~1 in 12 completions (Tim's call) — rare enough to stay a genuine surprise. */
export const REWARD_DROP_CHANCE = 0.08

/** Ceiling for a "small" reward (matches the small-tier default cost). */
export const DROP_MAX_COST = 50

/** The rewards a drop is allowed to gift: active, and genuinely small. */
export function eligibleDrops(rewards: readonly RewardRow[]): RewardRow[] {
  return rewards.filter(
    (r) =>
      r.deleted_at === null &&
      (r.tier.toLowerCase() === 'small' || r.coin_cost <= DROP_MAX_COST),
  )
}

/**
 * Roll once for a drop. Returns the reward to gift, or null (no drop this
 * time, or nothing small enough to gift). `rng` is called at most twice — the
 * odds check, then the pick — so a test can drive it deterministically.
 */
export function rollRewardDrop(
  rewards: readonly RewardRow[],
  rng: () => number = Math.random,
): RewardRow | null {
  if (rng() >= REWARD_DROP_CHANCE) return null
  const pool = eligibleDrops(rewards)
  if (pool.length === 0) return null
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length))
  return pool[index]
}
