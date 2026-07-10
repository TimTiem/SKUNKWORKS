import { db } from '../../db/db'
import { buildCoinEarn, buildCompletion } from '../../domain/completions'
import { newTask, withSoftDelete, withStatus } from '../../domain/tasks'
import { nowISO } from '../../lib/time'
import { newId } from '../../lib/uuid'
import { requestSync } from '../../sync/sync'
import type { TaskRow } from '../../types/rows'

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

/**
 * Complete = one local transaction: the status flip plus the two append-only
 * reward events (Decision 1 — never `xp = xp + n`; the log IS the truth).
 * Everything renders from local state well under 100 ms (P1).
 */
export async function completeTask(task: TaskRow): Promise<void> {
  const now = nowISO()
  const completion = buildCompletion({ id: newId(), taskId: task.id, nowIso: now })
  const coinEarn = buildCoinEarn(completion, newId())
  await db.transaction('rw', [db.tasks, db.completions, db.coin_ledger], async () => {
    await db.tasks.put(withStatus(task, 'done', now))
    await db.completions.add(completion)
    await db.coin_ledger.add(coinEarn)
  })
  navigator.vibrate?.(15) // haptic where the platform has it (P1)
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
