import { describe, expect, it } from 'vitest'
import type { FocusSessionRow } from '../types/rows'
import { focusTimeSense, taskFocusActualMs, tendencyLabel } from './timeSense'

function session(over: Partial<FocusSessionRow> = {}): FocusSessionRow {
  return {
    id: over.id ?? 's1',
    user_id: null,
    task_id: over.task_id ?? 't1',
    started_at: '2026-07-16T09:00:00.000Z',
    ended_at: '2026-07-16T09:25:00.000Z',
    planned_ms: over.planned_ms ?? 25 * 60_000,
    actual_ms: over.actual_ms ?? 25 * 60_000,
    created_at: '2026-07-16T09:25:00.000Z',
    updated_at: '2026-07-16T09:25:00.000Z',
    deleted_at: over.deleted_at ?? null,
    dirty: 0,
    ...over,
  }
}

describe('taskFocusActualMs', () => {
  it('sums actual time across a task’s live sessions only', () => {
    const sessions = [
      session({ id: 'a', task_id: 't1', actual_ms: 10 * 60_000 }),
      session({ id: 'b', task_id: 't1', actual_ms: 15 * 60_000 }),
      session({ id: 'c', task_id: 't2', actual_ms: 99 * 60_000 }), // other task
      session({ id: 'd', task_id: 't1', actual_ms: 5 * 60_000, deleted_at: 'x' }), // tombstoned
    ]
    expect(taskFocusActualMs(sessions, 't1')).toBe(25 * 60_000)
  })

  it('is zero for a task with no sessions', () => {
    expect(taskFocusActualMs([session()], 'nope')).toBe(0)
  })
})

describe('focusTimeSense', () => {
  it('aggregates planned/actual and the ratio, ignoring unfinished/tombstoned', () => {
    const sessions = [
      session({ id: 'a', planned_ms: 20 * 60_000, actual_ms: 30 * 60_000 }),
      session({ id: 'b', planned_ms: 20 * 60_000, actual_ms: 10 * 60_000 }),
      session({ id: 'c', planned_ms: 20 * 60_000, actual_ms: null }), // no actual
      session({ id: 'd', planned_ms: 20 * 60_000, actual_ms: 99, deleted_at: 'x' }),
    ]
    const ts = focusTimeSense(sessions)
    expect(ts.count).toBe(2)
    expect(ts.totalPlannedMs).toBe(40 * 60_000)
    expect(ts.totalActualMs).toBe(40 * 60_000)
    expect(ts.ratio).toBe(1)
  })

  it('reports a null ratio with no data', () => {
    expect(focusTimeSense([]).ratio).toBeNull()
  })
})

describe('tendencyLabel', () => {
  it('is encouraging/neutral at every tendency (P8)', () => {
    expect(tendencyLabel(null)).toMatch(/time sense/i)
    expect(tendencyLabel(1)).toMatch(/right about where/i)
    expect(tendencyLabel(1.25)).toMatch(/25% longer/i)
    expect(tendencyLabel(0.8)).toMatch(/20% sooner/i)
    // No shame words anywhere.
    for (const r of [null, 0.5, 1, 1.5, 2]) {
      expect(tendencyLabel(r)).not.toMatch(/fail|bad|worse|behind/i)
    }
  })
})
