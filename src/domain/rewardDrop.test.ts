import { describe, expect, it } from 'vitest'
import type { RewardRow } from '../types/rows'
import {
  DROP_MAX_COST,
  REWARD_DROP_CHANCE,
  eligibleDrops,
  rollRewardDrop,
} from './rewardDrop'

function reward(over: Partial<RewardRow> = {}): RewardRow {
  return {
    id: over.id ?? 'r1',
    user_id: null,
    name: over.name ?? 'Good steak',
    description: null,
    tier: over.tier ?? 'small',
    coin_cost: over.coin_cost ?? 50,
    min_level: null,
    created_at: '2026-07-16T00:00:00.000Z',
    updated_at: '2026-07-16T00:00:00.000Z',
    deleted_at: over.deleted_at ?? null,
    dirty: 0,
    ...over,
  }
}

/** A deterministic rng that yields the given values in order (then repeats the last). */
function seq(...values: number[]): () => number {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

describe('eligibleDrops', () => {
  it('includes small-tier rewards regardless of cost', () => {
    const r = reward({ tier: 'small', coin_cost: 999 })
    expect(eligibleDrops([r])).toEqual([r])
  })

  it('includes any active reward at or under the small cost ceiling', () => {
    const cheapMedium = reward({ id: 'm', tier: 'medium', coin_cost: DROP_MAX_COST })
    expect(eligibleDrops([cheapMedium])).toEqual([cheapMedium])
  })

  it('excludes expensive non-small rewards and soft-deleted ones', () => {
    const big = reward({ id: 'b', tier: 'big', coin_cost: 600 })
    const deletedSmall = reward({ id: 'd', tier: 'small', deleted_at: '2026-07-16T01:00:00.000Z' })
    expect(eligibleDrops([big, deletedSmall])).toEqual([])
  })
})

describe('rollRewardDrop', () => {
  const smalls = [
    reward({ id: 'a', name: 'A' }),
    reward({ id: 'b', name: 'B' }),
    reward({ id: 'c', name: 'C' }),
  ]

  it('returns null when the odds roll misses', () => {
    // First rng ≥ chance → no drop, and the pick rng is never consulted.
    expect(rollRewardDrop(smalls, seq(REWARD_DROP_CHANCE))).toBeNull()
    expect(rollRewardDrop(smalls, seq(0.5))).toBeNull()
  })

  it('gifts an eligible reward when the odds roll hits', () => {
    // hit (0 < chance), then pick index 0 (0 * len = 0).
    expect(rollRewardDrop(smalls, seq(0, 0))?.id).toBe('a')
    // hit, then pick the middle of three (0.5 * 3 = 1.5 → 1).
    expect(rollRewardDrop(smalls, seq(0, 0.5))?.id).toBe('b')
    // hit, then the top edge stays in-bounds (0.999 * 3 → clamps to last).
    expect(rollRewardDrop(smalls, seq(0, 0.999))?.id).toBe('c')
  })

  it('never gifts when there is nothing small to gift, even on a hit', () => {
    const big = reward({ id: 'b', tier: 'big', coin_cost: 600 })
    expect(rollRewardDrop([big], seq(0, 0))).toBeNull()
  })
})
