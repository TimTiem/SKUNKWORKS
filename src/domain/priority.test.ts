import { describe, expect, it } from 'vitest'
import {
  DAY_MS,
  buildPriorityContext,
  deadlineUrgency,
  effectiveUrgency,
  newTaskLink,
  openBlockers,
  withLinkDeleted,
  wouldCreateCycle,
} from './priority'
import { newTask, withStatus } from './tasks'

const T0 = '2026-07-10T10:00:00.000Z'
const NOW = new Date(T0).getTime()

/** Task at an explicit matrix position, optionally with a deadline/parent. */
function task(
  id: string,
  opts: { urgency?: number; dueInDays?: number; parentId?: string } = {},
) {
  const t = newTask(id, id, T0, opts.parentId ?? null)
  t.urgency = opts.urgency ?? 0
  if (opts.dueInDays !== undefined) t.due_at = new Date(NOW + opts.dueInDays * DAY_MS).toISOString()
  return t
}

const link = (blocked: string, blocker: string) =>
  newTaskLink(blocked, blocker, `${blocked}<${blocker}`, T0)

describe('deadlineUrgency', () => {
  it('is 0 without a deadline', () => {
    expect(deadlineUrgency(null, NOW)).toBe(0)
  })

  it('is 100 when overdue or due right now', () => {
    expect(deadlineUrgency(new Date(NOW - DAY_MS).toISOString(), NOW)).toBe(100)
    expect(deadlineUrgency(new Date(NOW).toISOString(), NOW)).toBe(100)
  })

  it('is 0 at or beyond the 14-day horizon', () => {
    expect(deadlineUrgency(new Date(NOW + 14 * DAY_MS).toISOString(), NOW)).toBe(0)
    expect(deadlineUrgency(new Date(NOW + 30 * DAY_MS).toISOString(), NOW)).toBe(0)
  })

  it('rises linearly as the deadline approaches', () => {
    expect(deadlineUrgency(new Date(NOW + 7 * DAY_MS).toISOString(), NOW)).toBe(50)
    expect(deadlineUrgency(new Date(NOW + 3.5 * DAY_MS).toISOString(), NOW)).toBe(75)
  })
})

describe('effectiveUrgency', () => {
  it('is the dragged base urgency when nothing else applies', () => {
    const ctx = buildPriorityContext([task('a', { urgency: 30 })], [])
    expect(effectiveUrgency('a', ctx, NOW)).toBe(30)
  })

  it('takes the deadline urgency when it exceeds the base', () => {
    const ctx = buildPriorityContext([task('a', { urgency: 10, dueInDays: 0.5 })], [])
    expect(effectiveUrgency('a', ctx, NOW)).toBeGreaterThan(90)
  })

  it('a parent inherits its most urgent subtask', () => {
    const ctx = buildPriorityContext(
      [task('parent', { urgency: 10 }), task('child', { urgency: 85, parentId: 'parent' })],
      [],
    )
    expect(effectiveUrgency('parent', ctx, NOW)).toBe(85)
  })

  it('a blocker inherits the urgency of what it blocks (transitively)', () => {
    // c waits for b, b waits for a; c is the urgent one → a feels it.
    const ctx = buildPriorityContext(
      [task('a', { urgency: 5 }), task('b', { urgency: 5 }), task('c', { urgency: 90 })],
      [link('b', 'a'), link('c', 'b')],
    )
    expect(effectiveUrgency('a', ctx, NOW)).toBe(90)
  })

  it('a blocked task does NOT inherit from its blocker', () => {
    const ctx = buildPriorityContext(
      [task('blocked', { urgency: 10 }), task('blocker', { urgency: 90 })],
      [link('blocked', 'blocker')],
    )
    expect(effectiveUrgency('blocked', ctx, NOW)).toBe(10)
  })

  it('deadline pull travels up the dependency chain', () => {
    const ctx = buildPriorityContext(
      [task('a', { urgency: 0 }), task('b', { urgency: 0, dueInDays: -1 })],
      [link('b', 'a')], // b (overdue) waits for a
    )
    expect(effectiveUrgency('a', ctx, NOW)).toBe(100)
  })

  it('done and deleted tasks exert no pull', () => {
    const done = withStatus(task('done-dep', { urgency: 99 }), 'done', T0)
    const ctx = buildPriorityContext([task('a', { urgency: 20 }), done], [link('done-dep', 'a')])
    expect(effectiveUrgency('a', ctx, NOW)).toBe(20)
  })

  it('survives a cycle in the link data without recursing forever', () => {
    const ctx = buildPriorityContext(
      [task('a', { urgency: 40 }), task('b', { urgency: 60 })],
      [link('a', 'b'), link('b', 'a')], // corrupt/looped data must not hang
    )
    expect(effectiveUrgency('a', ctx, NOW)).toBe(60)
    expect(effectiveUrgency('b', ctx, NOW)).toBe(60)
  })

  it('caps at 100', () => {
    const ctx = buildPriorityContext([task('a', { urgency: 100, dueInDays: -5 })], [])
    expect(effectiveUrgency('a', ctx, NOW)).toBe(100)
  })
})

describe('wouldCreateCycle', () => {
  it('rejects self-dependency', () => {
    expect(wouldCreateCycle([], 'a', 'a')).toBe(true)
  })

  it('allows a fresh link between unrelated tasks', () => {
    expect(wouldCreateCycle([], 'a', 'b')).toBe(false)
  })

  it('rejects the direct reverse of an existing link', () => {
    expect(wouldCreateCycle([link('a', 'b')], 'b', 'a')).toBe(true)
  })

  it('rejects transitive loops', () => {
    // a waits for b, b waits for c → c may not wait for a.
    expect(wouldCreateCycle([link('a', 'b'), link('b', 'c')], 'c', 'a')).toBe(true)
  })

  it('ignores soft-deleted links', () => {
    const dead = withLinkDeleted(link('a', 'b'), T0)
    expect(wouldCreateCycle([dead], 'b', 'a')).toBe(false)
  })
})

describe('openBlockers', () => {
  it('lists live blockers and skips deleted links and gone tasks', () => {
    const tasks = [task('a'), task('b'), task('c')]
    const links = [link('a', 'b'), withLinkDeleted(link('a', 'c'), T0), link('a', 'ghost')]
    const ctx = buildPriorityContext(tasks, links)
    expect(openBlockers('a', links, ctx).map((t) => t.id)).toEqual(['b'])
  })
})
