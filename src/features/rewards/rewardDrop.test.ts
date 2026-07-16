import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { newReward } from '../../domain/rewards'
import { rollAndGrantDrop } from './rewardDrop'

vi.mock('../../sync/sync', () => ({ requestSync: vi.fn() }))

const AT = '2026-07-16T09:00:00.000Z'

/** rng yielding the given values in order (then repeating the last). */
function seq(...values: number[]): () => number {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

async function addReward(name: string, tier: string, coinCost: number) {
  await db.rewards.add(newReward({ name, tier, coinCost }, `r-${name}`, AT))
}

describe('rollAndGrantDrop (free-reward drop)', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('on a hit: gifts a small reward as a FREE redemption — no coins spent (P4/P8)', async () => {
    await addReward('Good steak', 'small', 50)

    const gifted = await rollAndGrantDrop(seq(0, 0)) // hit, then pick index 0

    expect(gifted?.name).toBe('Good steak')
    const [redemption] = await db.redemptions.toArray()
    expect(redemption).toMatchObject({ reward_name_snapshot: 'Good steak', coins_spent: 0 })
    // Crucially: the balance is never touched — no ledger spend is appended.
    expect(await db.coin_ledger.count()).toBe(0)
  })

  it('on a miss: grants nothing', async () => {
    await addReward('Good steak', 'small', 50)

    expect(await rollAndGrantDrop(seq(0.5))).toBeNull() // 0.5 ≥ 8% chance
    expect(await db.redemptions.count()).toBe(0)
  })

  it('never gifts a big-ticket reward, even on a hit', async () => {
    await addReward('TV', 'big', 600)

    expect(await rollAndGrantDrop(seq(0, 0))).toBeNull()
    expect(await db.redemptions.count()).toBe(0)
  })
})
