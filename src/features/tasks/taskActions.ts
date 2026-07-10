import { db } from '../../db/db'
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

export async function completeTask(task: TaskRow): Promise<void> {
  await db.tasks.put(withStatus(task, 'done', nowISO()))
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
