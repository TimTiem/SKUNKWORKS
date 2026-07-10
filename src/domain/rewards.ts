import type { CoinLedgerRow, RedemptionRow, RewardRow } from '../types/rows'

/**
 * Rewards-store domain (Decision 2): redeeming spends COINS only — two
 * append-only events (a redemption + a negative ledger entry). XP and level
 * are never touched; there is no code path from here to them (P4).
 * Framing everywhere is "you earned this", never "you lost N coins" (P8).
 */

export interface TierDefault {
  tier: string
  label: string
  suggestedCost: number
  effortHint: string
}

/** Defaults per CLAUDE.md — the user can rename/re-cost/add freely. */
export const TIER_DEFAULTS: TierDefault[] = [
  { tier: 'small', label: 'Small', suggestedCost: 50, effortHint: '~a day' },
  { tier: 'medium', label: 'Medium', suggestedCost: 200, effortHint: '~a few days' },
  { tier: 'big', label: 'Big', suggestedCost: 600, effortHint: '~a couple weeks' },
]

export interface RewardInput {
  name: string
  description?: string | null
  tier: string
  coinCost: number
}

export function newReward(input: RewardInput, id: string, nowIso: string): RewardRow {
  return {
    id,
    user_id: null,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    tier: input.tier,
    coin_cost: input.coinCost,
    min_level: null, // optional unlock gate — schema supports it, UI parked
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
    dirty: 1,
  }
}

export function withRewardPatch(
  reward: RewardRow,
  patch: Partial<Pick<RewardRow, 'name' | 'description' | 'tier' | 'coin_cost'>>,
  nowIso: string,
): RewardRow {
  return { ...reward, ...patch, updated_at: nowIso, dirty: 1 }
}

export function withRewardDeleted(reward: RewardRow, nowIso: string): RewardRow {
  return { ...reward, deleted_at: nowIso, updated_at: nowIso, dirty: 1 }
}

/** Snapshot the name/cost at redemption time — later edits can't rewrite history. */
export function buildRedemption(reward: RewardRow, id: string, nowIso: string): RedemptionRow {
  return {
    id,
    user_id: null,
    reward_id: reward.id,
    reward_name_snapshot: reward.name,
    coins_spent: reward.coin_cost,
    at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
    dirty: 1,
  }
}

export function buildCoinSpend(redemption: RedemptionRow, id: string): CoinLedgerRow {
  return {
    id,
    user_id: null,
    delta: -redemption.coins_spent,
    reason: 'redemption',
    ref_id: redemption.id,
    at: redemption.at,
    created_at: redemption.created_at,
    updated_at: redemption.updated_at,
    deleted_at: null,
    dirty: 1,
  }
}

/** How many coins are still to earn before this reward — anticipation, not shame (P6/P8). */
export function coinsShort(balance: number, reward: Pick<RewardRow, 'coin_cost'>): number {
  return Math.max(0, reward.coin_cost - balance)
}
