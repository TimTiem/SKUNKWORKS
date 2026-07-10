import { describe, expect, it } from 'vitest'
import { buildCoinEarn, buildCompletion } from './completions'
import { totalXp } from './xp'

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
