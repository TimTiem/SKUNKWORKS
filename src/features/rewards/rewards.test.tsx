import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { buildCompletion } from '../../domain/completions'
import { buildCoinEarn } from '../../domain/completions'
import { redeemReward } from './rewardActions'
import { RewardsScreen } from './RewardsScreen'

vi.mock('../../sync/sync', () => ({ requestSync: vi.fn() }))

/** Seed coins the honest way: completions + their ledger earns. */
async function seedEarnings(completionCount: number) {
  for (let i = 0; i < completionCount; i++) {
    const completion = buildCompletion({
      id: `c-${i}`,
      taskId: null,
      nowIso: '2026-07-10T09:00:00.000Z',
    })
    await db.completions.add(completion)
    await db.coin_ledger.add(buildCoinEarn(completion, `l-${i}`))
  }
}

async function addRewardViaForm(name: string, tierLabel?: RegExp) {
  fireEvent.click(await screen.findByRole('button', { name: /add a reward/i }))
  fireEvent.change(await screen.findByLabelText(/reward name/i), { target: { value: name } })
  if (tierLabel) fireEvent.click(screen.getByRole('button', { name: tierLabel }))
  fireEvent.click(screen.getByRole('button', { name: /^add reward$/i }))
}

describe('rewards store', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('creates a reward; picking a tier pre-fills its suggested cost', async () => {
    render(<RewardsScreen />)
    await addRewardViaForm('Cinema night', /medium/i)

    expect(await screen.findByText('Cinema night')).toBeInTheDocument()
    const [row] = await db.rewards.toArray()
    expect(row).toMatchObject({ name: 'Cinema night', tier: 'medium', coin_cost: 200, dirty: 1 })
  })

  it('redeems when covered: both events logged, balance drops, XP untouched (P4)', async () => {
    await seedEarnings(12) // 60 coins, 120 XP worth of completions
    render(<RewardsScreen />)
    await addRewardViaForm('Ice cream') // small, 50

    fireEvent.click(await screen.findByRole('button', { name: /^redeem$/i }))

    expect(await screen.findByText(/you earned this/i)).toBeInTheDocument()
    expect(screen.getByText('Ice cream', { selector: 'p.text-accent-ink' })).toBeInTheDocument()

    const [redemption] = await db.redemptions.toArray()
    expect(redemption).toMatchObject({ reward_name_snapshot: 'Ice cream', coins_spent: 50 })
    const ledger = await db.coin_ledger.toArray()
    expect(ledger.reduce((s, e) => s + e.delta, 0)).toBe(10) // 60 earned − 50 spent
    // The redemption spent coins ONLY — the completions log (XP) is untouched.
    expect(await db.completions.count()).toBe(12)
  })

  it('shows how close an unaffordable reward is — no locked shame state (P6/P8)', async () => {
    await seedEarnings(6) // 30 coins
    render(<RewardsScreen />)
    await addRewardViaForm('Ice cream') // 50

    expect(await screen.findByText(/20 more to go/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^redeem$/i })).not.toBeInTheDocument()
  })

  it('a double redeem cannot spend the same coins twice', async () => {
    await seedEarnings(10) // 50 coins — covers exactly one redemption
    const reward = (await import('../../domain/rewards')).newReward(
      { name: 'Ice cream', tier: 'small', coinCost: 50 },
      'r-1',
      '2026-07-10T09:00:00.000Z',
    )
    await db.rewards.add(reward)

    const results = await Promise.all([redeemReward(reward), redeemReward(reward)])

    expect(results.filter(Boolean)).toHaveLength(1)
    expect(await db.redemptions.count()).toBe(1)
    expect((await db.coin_ledger.toArray()).reduce((s, e) => s + e.delta, 0)).toBe(0)
  })

  it('edits update the row for sync; deletes are soft', async () => {
    render(<RewardsScreen />)
    await addRewardViaForm('Cinema night')

    fireEvent.click(await screen.findByRole('button', { name: /^edit$/i }))
    fireEvent.change(await screen.findByLabelText(/reward name/i), {
      target: { value: 'Movie night' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(await screen.findByText('Movie night')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /delete "movie night"/i }))
    await waitFor(() => expect(screen.queryByText('Movie night')).not.toBeInTheDocument())
    const [row] = await db.rewards.toArray() // tombstone, not gone
    expect(row.deleted_at).not.toBeNull()
    expect(row.dirty).toBe(1)
  })
})
