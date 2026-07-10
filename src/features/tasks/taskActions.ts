import { db } from '../../db/db'
import { newTask, withSoftDelete, withStatus } from '../../domain/tasks'
import { nowISO } from '../../lib/time'
import { newId } from '../../lib/uuid'
import type { TaskRow } from '../../types/rows'

/**
 * Task mutations — every write goes to Dexie first (local state is the source
 * of truth, P1); the outbox picks up `dirty` rows when sync lands (slice 4).
 */

export async function addTask(text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  await db.tasks.add(newTask(trimmed, newId(), nowISO()))
}

export async function completeTask(task: TaskRow): Promise<void> {
  await db.tasks.put(withStatus(task, 'done', nowISO()))
}

export async function deferTask(task: TaskRow): Promise<void> {
  await db.tasks.put(withStatus(task, 'deferred', nowISO()))
}

export async function reopenTask(task: TaskRow): Promise<void> {
  await db.tasks.put(withStatus(task, 'open', nowISO()))
}

export async function softDeleteTask(task: TaskRow): Promise<void> {
  await db.tasks.put(withSoftDelete(task, nowISO()))
}
