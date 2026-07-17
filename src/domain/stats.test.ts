import { describe, expect, it } from 'vitest'
import type {
  CoinLedgerRow,
  CompletionRow,
  FocusSessionRow,
  RedemptionRow,
  TaskRow,
} from '../types/rows'
import { computeAppStats, dailyActivity, startOfLocalDay, weekdayRhythm } from './stats'

const NOW = new Date('2026-07-16T12:00:00.000Z').getTime()
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString()

function completion(over: Partial<CompletionRow> = {}): CompletionRow {
  return {
    id: over.id ?? 'c',
    user_id: null,
    task_id: null,
    completed_at: over.completed_at ?? daysAgo(1),
    xp_awarded: over.xp_awarded ?? 25,
    coins_awarded: 12,
    multiplier: over.multiplier ?? 1,
    focus_session_id: over.focus_session_id ?? null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
    deleted_at: over.deleted_at ?? null,
    dirty: 0,
    ...over,
  }
}
function ledger(delta: number, deleted: string | null = null): CoinLedgerRow {
  return {
    id: `l-${delta}-${Math.random()}`,
    user_id: null,
    delta,
    reason: delta > 0 ? 'completion' : 'redemption',
    ref_id: null,
    at: daysAgo(1),
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
    deleted_at: deleted,
    dirty: 0,
  }
}
function redemption(coinsSpent: number): RedemptionRow {
  return {
    id: `r-${Math.random()}`,
    user_id: null,
    reward_id: 'x',
    reward_name_snapshot: 'Treat',
    coins_spent: coinsSpent,
    at: daysAgo(1),
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
    deleted_at: null,
    dirty: 0,
  }
}
function focus(actualMs: number, plannedMs = 25 * 60_000): FocusSessionRow {
  return {
    id: `f-${Math.random()}`,
    user_id: null,
    task_id: 't',
    started_at: daysAgo(1),
    ended_at: daysAgo(1),
    planned_ms: plannedMs,
    actual_ms: actualMs,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
    deleted_at: null,
    dirty: 0,
  }
}
function task(status: TaskRow['status'], deleted: string | null = null): TaskRow {
  return {
    id: `t-${Math.random()}`,
    user_id: null,
    text: 'x',
    note: null,
    tag: null,
    estimate_ms: null,
    status,
    due_at: null,
    parent_id: null,
    importance: 50,
    urgency: 50,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
    deleted_at: deleted,
    dirty: 0,
  }
}

describe('computeAppStats', () => {
  it('rolls up completions: totals, crits, focus, and time windows', () => {
    const s = computeAppStats({
      completions: [
        completion({ xp_awarded: 25, completed_at: daysAgo(1) }),
        completion({ xp_awarded: 50, multiplier: 2, completed_at: daysAgo(2) }),
        completion({ xp_awarded: 40, focus_session_id: 'f1', completed_at: daysAgo(10) }),
        completion({ xp_awarded: 25, completed_at: daysAgo(40) }), // outside 30d
        completion({ deleted_at: 'x' }), // tombstoned → ignored
      ],
      ledger: [],
      redemptions: [],
      focusSessions: [],
      tasks: [],
      nowMs: NOW,
    })
    expect(s.totalCompletions).toBe(4)
    expect(s.xpEarned).toBe(140)
    expect(s.critCount).toBe(1)
    expect(s.focusCompletions).toBe(1)
    expect(s.completions7d).toBe(2) // days 1 and 2
    expect(s.xp7d).toBe(75)
    expect(s.completions30d).toBe(3) // days 1, 2, 10 (not 40)
  })

  it('splits the coin ledger into earned vs spent, ignoring tombstones', () => {
    const s = computeAppStats({
      completions: [],
      ledger: [ledger(12), ledger(5), ledger(-50), ledger(9, 'tomb')],
      redemptions: [],
      focusSessions: [],
      tasks: [],
      nowMs: NOW,
    })
    expect(s.coinsEarned).toBe(17)
    expect(s.coinsSpent).toBe(50)
  })

  it('separates paid redemptions from free drops', () => {
    const s = computeAppStats({
      completions: [],
      ledger: [],
      redemptions: [redemption(50), redemption(0), redemption(200)],
      focusSessions: [],
      tasks: [],
      nowMs: NOW,
    })
    expect(s.rewardsRedeemed).toBe(2)
    expect(s.freeDrops).toBe(1)
  })

  it('aggregates focus time and counts only open tasks', () => {
    const s = computeAppStats({
      completions: [],
      ledger: [],
      redemptions: [],
      focusSessions: [focus(30 * 60_000), focus(20 * 60_000)],
      tasks: [task('open'), task('open'), task('done'), task('open', 'tomb')],
      nowMs: NOW,
    })
    expect(s.focusSessions).toBe(2)
    expect(s.focusMsTotal).toBe(50 * 60_000)
    expect(s.avgFocusMs).toBe(25 * 60_000)
    expect(s.openTasks).toBe(2)
  })
})

// Local-day charts. Build timestamps from LOCAL calendar parts so these assert
// the same way in any timezone (no UTC-vs-local drift at the day boundary).
const atLocal = (y: number, m: number, d: number, h = 12) =>
  new Date(y, m - 1, d, h).toISOString()
const NOW_LOCAL = new Date(2026, 6, 16, 12).getTime() // 2026-07-16, local noon

describe('dailyActivity', () => {
  it('returns one bucket per day, oldest first, including empty days', () => {
    const buckets = dailyActivity([], NOW_LOCAL, 7)
    expect(buckets).toHaveLength(7)
    expect(buckets.every((b) => b.completions === 0 && b.xp === 0)).toBe(true)
    // Oldest first, last bucket is today.
    expect(buckets[6].dayMs).toBe(startOfLocalDay(NOW_LOCAL))
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].dayMs).toBeGreaterThan(buckets[i - 1].dayMs)
    }
  })

  it('buckets completions into their local day and sums XP', () => {
    const buckets = dailyActivity(
      [
        completion({ completed_at: atLocal(2026, 7, 16, 9), xp_awarded: 25 }), // today
        completion({ completed_at: atLocal(2026, 7, 16, 20), xp_awarded: 40 }), // today
        completion({ completed_at: atLocal(2026, 7, 14, 10), xp_awarded: 30 }), // 2 days ago
        completion({ completed_at: atLocal(2026, 7, 1, 10), xp_awarded: 99 }), // outside window
        completion({ completed_at: atLocal(2026, 7, 15), deleted_at: 'x' }), // tombstoned
      ],
      NOW_LOCAL,
      7,
    )
    const today = buckets[6]
    expect(today.completions).toBe(2)
    expect(today.xp).toBe(65)
    const twoAgo = buckets.find((b) => b.dayMs === startOfLocalDay(new Date(2026, 6, 14).getTime()))
    expect(twoAgo?.completions).toBe(1)
    expect(twoAgo?.xp).toBe(30)
    // Nothing leaked from the out-of-window or tombstoned rows.
    expect(buckets.reduce((n, b) => n + b.completions, 0)).toBe(3)
  })
})

describe('weekdayRhythm', () => {
  it('groups completions by day of week and ignores tombstones', () => {
    const rhythm = weekdayRhythm([
      completion({ completed_at: atLocal(2026, 7, 16, 10) }), // Thursday (getDay 4)
      completion({ completed_at: atLocal(2026, 7, 16, 14), xp_awarded: 40 }),
      completion({ completed_at: atLocal(2026, 7, 13, 10) }), // Monday (getDay 1)
      completion({ completed_at: atLocal(2026, 7, 13, 10), deleted_at: 'x' }),
    ])
    expect(rhythm).toHaveLength(7)
    const thursday = rhythm[new Date(2026, 6, 16).getDay()]
    expect(thursday.completions).toBe(2)
    const monday = rhythm[new Date(2026, 6, 13).getDay()]
    expect(monday.completions).toBe(1)
    expect(rhythm.reduce((n, b) => n + b.completions, 0)).toBe(3)
  })
})
