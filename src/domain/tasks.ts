import type { TaskRow, TaskStatus } from '../types/rows'

/**
 * Pure task-row builders and transitions — no IO, no clocks, no id generation
 * (both injected), so this file is trivially unit-testable.
 *
 * Every transition sets `dirty: 1` and refreshes the local `updated_at` echo;
 * the server restamps `updated_at` authoritatively when the row syncs.
 */

export function newTask(
  text: string,
  id: string,
  nowIso: string,
  parentId: string | null = null,
): TaskRow {
  return {
    id,
    user_id: null, // claimed by the signed-in user when the outbox pushes it
    text: text.trim(),
    note: null,
    tag: null,
    estimate_ms: null,
    status: 'open',
    due_at: null,
    parent_id: parentId,
    importance: 50, // matrix centre until placed (never a required field, P2)
    urgency: 50,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
    dirty: 1,
  }
}

/** Patch planning fields (due date, matrix position) — LWW row update. */
export function withTaskPatch(
  task: TaskRow,
  patch: Partial<Pick<TaskRow, 'due_at' | 'importance' | 'urgency' | 'note' | 'tag'>>,
  nowIso: string,
): TaskRow {
  return { ...task, ...patch, updated_at: nowIso, dirty: 1 }
}

export function withStatus(task: TaskRow, status: TaskStatus, nowIso: string): TaskRow {
  return { ...task, status, updated_at: nowIso, dirty: 1 }
}

/** Soft delete only — the tombstone must sync; hard deletes never happen client-side. */
export function withSoftDelete(task: TaskRow, nowIso: string): TaskRow {
  return { ...task, deleted_at: nowIso, updated_at: nowIso, dirty: 1 }
}
