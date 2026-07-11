import type { TaskLinkRow, TaskRow } from '../types/rows'

/**
 * Eisenhower priority (v1.1) — pure, computed at read time, never stored
 * (event-sourced spirit: stored values are the user's dragged base position;
 * everything derived is recomputable).
 *
 * EFFECTIVE urgency of a task = max of:
 *  - its own dragged base `urgency`
 *  - urgency implied by its own deadline
 *  - the effective urgency of its subtasks (a parent is as urgent as its
 *    most urgent child)
 *  - the effective urgency of tasks that DEPEND on it (a blocker inherits
 *    the urgency of what it's blocking)
 */

export const DAY_MS = 86_400_000
/** Deadlines further out than this contribute no urgency. */
export const URGENCY_HORIZON_DAYS = 14

/** 0..100 from deadline proximity; overdue or due today = 100; no deadline = 0. */
export function deadlineUrgency(dueAtIso: string | null, nowMs: number): number {
  if (!dueAtIso) return 0
  const days = (new Date(dueAtIso).getTime() - nowMs) / DAY_MS
  if (days <= 0) return 100
  if (days >= URGENCY_HORIZON_DAYS) return 0
  return Math.round(100 * (1 - days / URGENCY_HORIZON_DAYS))
}

export interface PriorityContext {
  tasksById: Map<string, TaskRow>
  /** parent_id -> open child tasks */
  childrenByParent: Map<string, TaskRow[]>
  /** blocker_id -> open tasks blocked by it */
  dependentsByBlocker: Map<string, TaskRow[]>
}

const isLive = (t: TaskRow) => t.deleted_at === null && t.status !== 'done'

/** Build the lookup context from live task/link rows. */
export function buildPriorityContext(
  tasks: readonly TaskRow[],
  links: readonly TaskLinkRow[],
): PriorityContext {
  const live = tasks.filter(isLive)
  const tasksById = new Map(live.map((t) => [t.id, t]))

  const childrenByParent = new Map<string, TaskRow[]>()
  for (const t of live) {
    if (!t.parent_id) continue
    childrenByParent.set(t.parent_id, [...(childrenByParent.get(t.parent_id) ?? []), t])
  }

  const dependentsByBlocker = new Map<string, TaskRow[]>()
  for (const link of links) {
    if (link.deleted_at !== null) continue
    const blocked = tasksById.get(link.blocked_id)
    if (!blocked) continue
    dependentsByBlocker.set(link.blocker_id, [
      ...(dependentsByBlocker.get(link.blocker_id) ?? []),
      blocked,
    ])
  }

  return { tasksById, childrenByParent, dependentsByBlocker }
}

export function effectiveUrgency(
  taskId: string,
  ctx: PriorityContext,
  nowMs: number,
  visiting: Set<string> = new Set(),
): number {
  const task = ctx.tasksById.get(taskId)
  if (!task || visiting.has(taskId)) return 0
  visiting.add(taskId)

  let urgency = Math.max(task.urgency, deadlineUrgency(task.due_at, nowMs))
  for (const child of ctx.childrenByParent.get(taskId) ?? []) {
    urgency = Math.max(urgency, effectiveUrgency(child.id, ctx, nowMs, visiting))
  }
  for (const dependent of ctx.dependentsByBlocker.get(taskId) ?? []) {
    urgency = Math.max(urgency, effectiveUrgency(dependent.id, ctx, nowMs, visiting))
  }

  visiting.delete(taskId)
  return Math.min(100, urgency)
}

/**
 * Would adding "blocked waits for blocker" create a cycle? True when the
 * proposed blocker already (transitively) waits on the blocked task.
 */
export function wouldCreateCycle(
  links: readonly TaskLinkRow[],
  blockedId: string,
  blockerId: string,
): boolean {
  if (blockedId === blockerId) return true
  const blockersOf = new Map<string, string[]>()
  for (const link of links) {
    if (link.deleted_at !== null) continue
    blockersOf.set(link.blocked_id, [...(blockersOf.get(link.blocked_id) ?? []), link.blocker_id])
  }
  const stack = [blockerId]
  const seen = new Set<string>()
  while (stack.length > 0) {
    const current = stack.pop()!
    if (current === blockedId) return true
    if (seen.has(current)) continue
    seen.add(current)
    stack.push(...(blockersOf.get(current) ?? []))
  }
  return false
}

export function newTaskLink(
  blockedId: string,
  blockerId: string,
  id: string,
  nowIso: string,
): TaskLinkRow {
  return {
    id,
    user_id: null,
    blocked_id: blockedId,
    blocker_id: blockerId,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
    dirty: 1,
  }
}

export function withLinkDeleted(link: TaskLinkRow, nowIso: string): TaskLinkRow {
  return { ...link, deleted_at: nowIso, updated_at: nowIso, dirty: 1 }
}

/** Open blockers of a task — advisory "after: X" info, never a hard block (P8). */
export function openBlockers(
  taskId: string,
  links: readonly TaskLinkRow[],
  ctx: PriorityContext,
): TaskRow[] {
  return links
    .filter((l) => l.deleted_at === null && l.blocked_id === taskId)
    .map((l) => ctx.tasksById.get(l.blocker_id))
    .filter((t): t is TaskRow => !!t)
}
