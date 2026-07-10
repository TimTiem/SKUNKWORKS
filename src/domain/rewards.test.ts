import { describe, expect, it } from 'vitest'
import { buildCoinSpend, buildRedemption, coinsShort, newReward } from './rewards'

const T0 = '2026-07-10T10:00:00.000Z'

const reward = () =>
  newReward({ name: 'Ice cream', tier: 'small', coinCost: 50 }, 'r-1', T0)

describe('newReward', () => {
  it('builds a dirty LWW row with trimmed fields', () => {
    const r = newReward(
      { name: '  Ice cream  ', description: ' the good stuff ', tier: 'small', coinCost: 50 },
      'r-1',
      T0,
    )
    expect(r).toMatchObject({
      name: 'Ice cream',
      description: 'the good stuff',
      tier: 'small',
      coin_cost: 50,
      dirty: 1,
      deleted_at: null,
    })
  })
})

describe('redemption pair', () => {
  it('snapshots the reward name and cost at redemption time', () => {
    const redemption = buildRedemption(reward(), 'red-1', T0)
    expect(redemption).toMatchObject({
      reward_id: 'r-1',
      reward_name_snapshot: 'Ice cream',
      coins_spent: 50,
      at: T0,
      dirty: 1,
    })
  })

  it('spends via a negative ledger delta referencing the redemption', () => {
    const redemption = buildRedemption(reward(), 'red-1', T0)
    const spend = buildCoinSpend(redemption, 'l-1')
    expect(spend).toMatchObject({
      delta: -50,
      reason: 'redemption',
      ref_id: 'red-1',
      dirty: 1,
    })
  })
})

describe('coinsShort', () => {
  it('reports distance to affordability, never negative', () => {
    expect(coinsShort(30, { coin_cost: 50 })).toBe(20)
    expect(coinsShort(50, { coin_cost: 50 })).toBe(0)
    expect(coinsShort(80, { coin_cost: 50 })).toBe(0)
  })
})
