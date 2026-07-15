import { db } from '../../db/db'
import { buildCoinEarn, buildCompletion } from '../../domain/completions'
import {
  buildPriorityContext,
  effectiveUrgency,
  newTaskLink,
  withLinkDeleted,
  wouldCreateCycle,
} from '../../domain/priority'
import { newTask, withSoftDelete, withStatus, withTaskPatch } from '../../domain/tasks'
import { completionRewards, rollCritMultiplier } from '../../domain/xp'
import { nowISO } from '../../lib/time'
import { newId } from '../../lib/uuid'
import { requestSync } from '../../sync/sync'
import type { TaskLinkRow, TaskRow } from '../../types/rows'

/**
 * Task mutations — every write goes to Dexie first (local state is the source
 * of truth, P1); `requestSync` then flushes the outbox in the background.
 */

export async function addTask(text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  await db.tasks.add(newTask(trimmed, newId(), nowISO()))
  requestSync()
}

/** v1.1: XP reflects the task's matrix position (incl. deadline/graph pull)
 * at the moment of completion. Computed once, appended forever. */
export async function matrixRewards(task: TaskRow, fromFocus: boolean) {
  const [tasks, links] = await Promise.all([db.tasks.toArray(), db.task_links.toArray()])
  // Re-read the row: the caller's object may be a stale render snapshot.
  const fresh = tasks.find((t) => t.id === task.id) ?? task
  const ctx = buildPriorityContext(tasks, links)
  const urgency = Math.max(fresh.urgency, effectiveUrgency(fresh.id, ctx, Date.now()))
  return completionRewards(fresh.importance, urgency, fromFocus)
}

/**
 * Complete = one local transaction: the status flip plus the two append-only
 * reward events (Decision 1 — never `xp = xp + n`; the log IS the truth).
 * Everything renders from local state well under 100 ms (P1).
 */
export async function completeTask(task: TaskRow): Promise<void> {
  const now = nowISO()
  const rewards = await matrixRewards(task, false)
  const completion = buildCompletion({
    id: newId(),
    taskId: task.id,
    nowIso: now,
    xpAwarded: rewards.xp,
    coinsAwarded: rewards.coins,
    multiplier: rollCritMultiplier(), // ~10% surprise double XP
  })
  const coinEarn = buildCoinEarn(completion, newId())
  await db.transaction('rw', [db.tasks, db.completions, db.coin_ledger], async () => {
    await db.tasks.put(withStatus(task, 'done', now))
    await db.completions.add(completion)
    await db.coin_ledger.add(coinEarn)
  })
  navigator.vibrate?.(15) // haptic where the platform has it (P1)
  requestSync()
}

// ── v1.1 planning ────────────────────────────────────────────────────────────

export async function setTaskDue(task: TaskRow, dueAtIso: string | null): Promise<void> {
  await db.tasks.put(withTaskPatch(task, { due_at: dueAtIso }, nowISO()))
  requestSync()
}

/** Matrix drag drop: store the dragged base position (0..100 each). */
export async function setTaskPriority(
  task: TaskRow,
  position: { importance: number; urgency: number },
): Promise<void> {
  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)))
  await db.tasks.put(
    withTaskPatch(
      task,
      { importance: clamp(position.importance), urgency: clamp(position.urgency) },
      nowISO(),
    ),
  )
  requestSync()
}

export async function addSubtask(parent: TaskRow, text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  await db.tasks.add(newTask(trimmed, newId(), nowISO(), parent.id))
  requestSync()
}

/** Add "task waits for blocker". Refuses cycles; returns false if refused. */
export async function addDependency(blocked: TaskRow, blockerId: string): Promise<boolean> {
  const links = await db.task_links.toArray()
  const live = links.filter((l) => l.deleted_at === null)
  const exists = live.some((l) => l.blocked_id === blocked.id && l.blocker_id === blockerId)
  if (exists || wouldCreateCycle(live, blocked.id, blockerId)) return false
  await db.task_links.add(newTaskLink(blocked.id, blockerId, newId(), nowISO()))
  requestSync()
  return true
}

export async function removeDependency(link: TaskLinkRow): Promise<void> {
  await db.task_links.put(withLinkDeleted(link, nowISO()))
  requestSync()
}

export async function deferTask(task: TaskRow): Promise<void> {
  await db.tasks.put(withStatus(task, 'deferred', nowISO()))
  requestSync()
}

export async function reopenTask(task: TaskRow): Promise<void> {
  await db.tasks.put(withStatus(task, 'open', nowISO()))
  requestSync()
}

export async function softDeleteTask(task: TaskRow): Promise<void> {
  await db.tasks.put(withSoftDelete(task, nowISO()))
  requestSync()
}
