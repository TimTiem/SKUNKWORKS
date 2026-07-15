import { describe, expect, it } from 'vitest'
import { buildCoinEarn, buildCompletion } from './completions'
import { completionRewards, totalXp } from './xp'

const T0 = '2026-07-10T10:00:00.000Z'

describe('buildCompletion', () => {
  it('awards the plain-completion numbers (+25 XP, +12 coins)', () => {
    const c = buildCompletion({ id: 'c-1', taskId: 't-1', nowIso: T0 })
    expect(c).toMatchObject({
      xp_awarded: 25,
      coins_awarded: 12,
      multiplier: 1,
      focus_session_id: null,
      task_id: 't-1',
      dirty: 1,
    })
  })

  it('awards the focus bonus (+40 XP, +17 coins) when tied to a session', () => {
    const c = buildCompletion({ id: 'c-1', taskId: 't-1', nowIso: T0, focusSessionId: 'f-1' })
    expect(c.xp_awarded).toBe(40)
    expect(c.coins_awarded).toBe(17)
    expect(c.focus_session_id).toBe('f-1')
  })
})

describe('buildCoinEarn', () => {
  it('mirrors the completion coins as a positive ledger delta', () => {
    const c = buildCompletion({ id: 'c-1', taskId: 't-1', nowIso: T0 })
    const earn = buildCoinEarn(c, 'l-1')
    expect(earn).toMatchObject({
      delta: 12,
      reason: 'completion',
      ref_id: 'c-1',
      at: T0,
      dirty: 1,
    })
  })
})

describe('totalXp', () => {
  it('starts at the endowed 25 and only ever sums upward (P4/P6)', () => {
    expect(totalXp([])).toBe(25)
    expect(totalXp([{ xp_awarded: 10 }, { xp_awarded: 15 }])).toBe(50)
  })
})

describe('completionRewards (v1.1 — XP from matrix position)', () => {
  it('pays exactly the flat +25/+12 at the matrix centre', () => {
    expect(completionRewards(50, 50, false)).toEqual({ xp: 25, coins: 12 })
  })

  it('keeps the focus bonus at the centre (+40/+17)', () => {
    expect(completionRewards(50, 50, true)).toEqual({ xp: 40, coins: 17 })
  })

  it('spans 10..40 XP across the matrix, never zero (P8 floor)', () => {
    expect(completionRewards(0, 0, false).xp).toBe(10)
    expect(completionRewards(100, 100, false).xp).toBe(40)
  })

  it('weights importance over urgency (0.6 vs 0.4)', () => {
    expect(completionRewards(100, 0, false).xp).toBe(28) // 10 + round(18)
    expect(completionRewards(0, 100, false).xp).toBe(22) // 10 + round(12)
  })

  it('coins stay flat regardless of position (pricing stays predictable)', () => {
    expect(completionRewards(0, 0, false).coins).toBe(12)
    expect(completionRewards(100, 100, false).coins).toBe(12)
  })
})
