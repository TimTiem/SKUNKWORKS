import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import type {
  CoinLedgerRow,
  CompletionRow,
  FactUnlockRow,
  FocusSessionRow,
  RedemptionRow,
} from '../../types/rows'
import { StatsScreen } from './StatsScreen'

const now = Date.now()
const iso = (ms: number) => new Date(ms).toISOString()
const uid = () => crypto.randomUUID()

function completion(over: Partial<CompletionRow> = {}): CompletionRow {
  return {
    id: uid(),
    user_id: null,
    task_id: null,
    completed_at: iso(now),
    xp_awarded: 25,
    coins_awarded: 12,
    multiplier: 1,
    focus_session_id: null,
    created_at: iso(now),
    updated_at: iso(now),
    deleted_at: null,
    dirty: 0,
    ...over,
  }
}

describe('StatsScreen', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('renders the productivity dashboard from the logs without crashing', async () => {
    await db.completions.bulkAdd([
      completion({ completed_at: iso(now) }),
      completion({ completed_at: iso(now), xp_awarded: 50, multiplier: 2 }), // crit
      completion({ completed_at: iso(now - 10 * 86_400_000), focus_session_id: 'f1' }),
    ])
    await db.focus_sessions.add({
      id: 'f1',
      user_id: null,
      task_id: null,
      started_at: iso(now - 25 * 60_000),
      ended_at: iso(now),
      planned_ms: 25 * 60_000,
      actual_ms: 30 * 60_000,
      created_at: iso(now),
      updated_at: iso(now),
      deleted_at: null,
      dirty: 0,
    } satisfies FocusSessionRow)
    await db.coin_ledger.bulkAdd([
      { id: uid(), user_id: null, delta: 36, reason: 'completion', ref_id: null, at: iso(now), created_at: iso(now), updated_at: iso(now), deleted_at: null, dirty: 0 },
      { id: uid(), user_id: null, delta: -50, reason: 'redemption', ref_id: null, at: iso(now), created_at: iso(now), updated_at: iso(now), deleted_at: null, dirty: 0 },
    ] satisfies CoinLedgerRow[])
    await db.redemptions.add({
      id: uid(),
      user_id: null,
      reward_id: 'r1',
      reward_name_snapshot: 'Treat',
      coins_spent: 50,
      at: iso(now),
      created_at: iso(now),
      updated_at: iso(now),
      deleted_at: null,
      dirty: 0,
    } satisfies RedemptionRow)
    await db.fact_unlocks.add({
      id: uid(),
      user_id: null,
      fact_id: 'bio-001',
      unlocked_at: iso(now),
      created_at: iso(now),
      updated_at: iso(now),
      deleted_at: null,
      dirty: 0,
    } satisfies FactUnlockRow)

    render(<StatsScreen />)

    // Headline + every dashboard card mounts.
    expect(await screen.findByText('Momentum')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText(/done this week/i)).toBeInTheDocument()
    expect(screen.getByText('Weekly rhythm')).toBeInTheDocument()
    expect(screen.getByText(/Activity · last 12 weeks/i)).toBeInTheDocument()
    expect(screen.getByText('Lifetime')).toBeInTheDocument()
    expect(screen.getByText('Facts unlocked')).toBeInTheDocument()

    // The activity chart bucketed the two completions finished today into one
    // day → a mark whose tooltip reports the tally (also proves tooltips exist).
    expect(screen.getAllByTitle(/2 done/i).length).toBeGreaterThanOrEqual(1)

    // A landed crit is tallied in the lifetime section.
    expect(screen.getByText('2× crits landed')).toBeInTheDocument()
  })

  it('renders calmly with no activity yet (endowed, never a shame surface)', async () => {
    render(<StatsScreen />)
    expect(await screen.findByText('Momentum')).toBeInTheDocument()
    // No focus data → the ring caption states it plainly, no failure framing.
    expect(screen.getByText(/No focus sessions yet/i)).toBeInTheDocument()
  })
})
