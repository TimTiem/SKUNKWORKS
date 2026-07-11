import { describe, expect, it } from 'vitest'
import { buildCoinEarn, buildCompletion } from './completions'
import { completionRewards, totalXp } from './xp'

const T0 = '2026-07-10T10:00:00.000Z'

describe('buildCompletion', () => {
  it('awards the plain-completion numbers (+10 XP, +5 coins)', () => {
    const c = buildCompletion({ id: 'c-1', taskId: 't-1', nowIso: T0 })
    expect(c).toMatchObject({
      xp_awarded: 10,
      coins_awarded: 5,
      multiplier: 1,
      focus_session_id: null,
      task_id: 't-1',
      dirty: 1,
    })
  })

  it('awards the focus bonus (+15 XP, +7 coins) when tied to a session', () => {
    const c = buildCompletion({ id: 'c-1', taskId: 't-1', nowIso: T0, focusSessionId: 'f-1' })
    expect(c.xp_awarded).toBe(15)
    expect(c.coins_awarded).toBe(7)
    expect(c.focus_session_id).toBe('f-1')
  })
})

describe('buildCoinEarn', () => {
  it('mirrors the completion coins as a positive ledger delta', () => {
    const c = buildCompletion({ id: 'c-1', taskId: 't-1', nowIso: T0 })
    const earn = buildCoinEarn(c, 'l-1')
    expect(earn).toMatchObject({
      delta: 5,
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
  it('pays exactly the classic +10/+5 at the matrix centre', () => {
    expect(completionRewards(50, 50, false)).toEqual({ xp: 10, coins: 5 })
  })

  it('keeps the focus bonus at the centre (+15/+7)', () => {
    expect(completionRewards(50, 50, true)).toEqual({ xp: 15, coins: 7 })
  })

  it('spans 4..16 XP across the matrix, never zero (P8 floor)', () => {
    expect(completionRewards(0, 0, false).xp).toBe(4)
    expect(completionRewards(100, 100, false).xp).toBe(16)
  })

  it('weights importance over urgency (0.6 vs 0.4)', () => {
    expect(completionRewards(100, 0, false).xp).toBe(11) // 4 + round(7.2)
    expect(completionRewards(0, 100, false).xp).toBe(9) // 4 + round(4.8)
  })

  it('coins stay flat regardless of position (pricing stays predictable)', () => {
    expect(completionRewards(0, 0, false).coins).toBe(5)
    expect(completionRewards(100, 100, false).coins).toBe(5)
  })
})
