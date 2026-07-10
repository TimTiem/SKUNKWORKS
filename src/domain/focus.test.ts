import { describe, expect, it } from 'vitest'
import {
  buildFocusSession,
  formatClock,
  fractionRemaining,
  inWindDown,
  isOvertime,
  remainingMs,
  type ActiveFocus,
} from './focus'

const START = '2026-07-10T10:00:00.000Z'
const START_MS = new Date(START).getTime()

const focus = (planned_ms = 25 * 60_000): ActiveFocus => ({
  sessionId: 'f-1',
  taskId: 't-1',
  started_at: START,
  planned_ms,
})

describe('remaining time (wall-clock — survives lock/backgrounding)', () => {
  it('counts down from the start timestamp, not from ticks', () => {
    expect(remainingMs(focus(), START_MS)).toBe(25 * 60_000)
    expect(remainingMs(focus(), START_MS + 10 * 60_000)).toBe(15 * 60_000)
  })

  it('goes negative in overtime and the fraction clamps to 0', () => {
    const late = START_MS + 30 * 60_000
    expect(remainingMs(focus(), late)).toBe(-5 * 60_000)
    expect(fractionRemaining(focus(), late)).toBe(0)
    expect(isOvertime(focus(), late)).toBe(true)
  })

  it('enters wind-down inside the final minute (FR-15)', () => {
    expect(inWindDown(focus(), START_MS + 23 * 60_000)).toBe(false)
    expect(inWindDown(focus(), START_MS + 24 * 60_000 + 1)).toBe(true)
  })
})

describe('formatClock', () => {
  it('formats mm:ss and never goes negative', () => {
    expect(formatClock(25 * 60_000)).toBe('25:00')
    expect(formatClock(61_000)).toBe('1:01')
    expect(formatClock(-5_000)).toBe('0:00')
  })
})

describe('buildFocusSession', () => {
  it('captures planned vs actual as one immutable dirty row', () => {
    const ended = new Date(START_MS + 20 * 60_000).toISOString()
    const row = buildFocusSession(focus(), ended)
    expect(row).toMatchObject({
      id: 'f-1',
      task_id: 't-1',
      started_at: START,
      ended_at: ended,
      planned_ms: 25 * 60_000,
      actual_ms: 20 * 60_000,
      dirty: 1,
      deleted_at: null,
    })
  })
})
