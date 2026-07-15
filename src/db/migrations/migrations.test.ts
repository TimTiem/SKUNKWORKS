import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { migrations, pendingMigrations, type Migration } from './index'
import { SEED_REWARDS, SEEDED_AT } from './seedRewards'

const noop = async () => {}
const m = (version: number): Migration => ({ version, name: `m${version}`, run: noop })

describe('pendingMigrations', () => {
  it('returns everything when nothing has been applied', () => {
    expect(pendingMigrations([m(1), m(2)], 0).map((x) => x.version)).toEqual([1, 2])
  })

  it('returns only migrations newer than the stored schema_version', () => {
    expect(pendingMigrations([m(1), m(2), m(3)], 2).map((x) => x.version)).toEqual([3])
  })

  it('returns an empty list when up to date', () => {
    expect(pendingMigrations([m(1)], 1)).toEqual([])
  })

  it('sorts out-of-order definitions', () => {
    expect(pendingMigrations([m(2), m(1)], 0).map((x) => x.version)).toEqual([1, 2])
  })

  it('rejects gaps in the version sequence', () => {
    expect(() => pendingMigrations([m(1), m(3)], 0)).toThrow(/not contiguous/)
  })

  it('rejects duplicate versions', () => {
    expect(() => pendingMigrations([m(1), m(1)], 0)).toThrow(/not contiguous/)
  })

  it('rejects lists that do not start at 1', () => {
    expect(() => pendingMigrations([m(2)], 0)).toThrow(/not contiguous/)
  })

  it('the real migration list is valid', () => {
    expect(() => pendingMigrations(migrations, 0)).not.toThrow()
  })
})

describe('seed-reward-tiers (migration 3)', () => {
  const seedMigration = migrations.find((m) => m.name === 'seed-reward-tiers')!

  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('seed rows are deterministic: fixed unique uuids, fixed stamp, never dirty', () => {
    const ids = new Set(SEED_REWARDS.map((r) => r.id))
    expect(ids.size).toBe(SEED_REWARDS.length)
    for (const r of SEED_REWARDS) {
      expect(r.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      // dirty:0 is the safety property — a seed row must never enter the outbox.
      expect(r.dirty).toBe(0)
      expect(r.created_at).toBe(SEEDED_AT)
      expect(r.updated_at).toBe(SEEDED_AT)
      expect(r.deleted_at).toBeNull()
    }
  })

  it('maps the tiers to the standard costs (small 50 / medium 200 / big 600)', () => {
    const costs = { small: 50, medium: 200, big: 600 } as Record<string, number>
    for (const r of SEED_REWARDS) expect(r.coin_cost).toBe(costs[r.tier])
    expect(SEED_REWARDS.filter((r) => r.tier === 'big')).toHaveLength(4)
    expect(SEED_REWARDS.filter((r) => r.tier === 'medium')).toHaveLength(12)
    expect(SEED_REWARDS.filter((r) => r.tier === 'small')).toHaveLength(7)
  })

  it('is idempotent and preserves a newer local/synced version of a seed row', async () => {
    await seedMigration.run()
    expect(await db.rewards.count()).toBe(SEED_REWARDS.length)

    // Simulate a synced edit having landed before a re-run (e.g. retry after
    // a mid-way failure): the edited row must survive.
    const edited = { ...SEED_REWARDS[0], name: 'Edited', updated_at: '2026-08-01T00:00:00.000Z' }
    await db.rewards.put(edited)

    await seedMigration.run()
    expect(await db.rewards.count()).toBe(SEED_REWARDS.length)
    expect((await db.rewards.get(SEED_REWARDS[0].id))?.name).toBe('Edited')
  })
})
