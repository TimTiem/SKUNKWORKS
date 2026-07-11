import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { buildPriorityContext, openBlockers } from '../../domain/priority'
import type { TaskLinkRow, TaskRow } from '../../types/rows'

const newestFirst = (a: TaskRow, b: TaskRow) => b.created_at.localeCompare(a.created_at)

export interface TaskTreeData {
  /** Open top-level tasks (or orphans whose parent is done/gone), newest first. */
  open: TaskRow[]
  /** Open subtasks per parent id. */
  childrenByParent: Map<string, TaskRow[]>
  /** Open blockers per task id (advisory "after: X"). */
  blockersByTask: Map<string, TaskRow[]>
  /** Live links per blocked task id (for removal UI). */
  linksByBlocked: Map<string, TaskLinkRow[]>
  /** Every open task (any level) — dependency picker options. */
  openAll: TaskRow[]
  deferred: TaskRow[]
  loading: boolean
}

/** Live view of the task tree — re-renders on every local Dexie write. */
export function useTasks(): TaskTreeData {
  const rows = useLiveQuery(
    () =>
      db.tasks
        .where('status')
        .anyOf('open', 'deferred')
        .filter((t) => t.deleted_at === null)
        .toArray(),
    [],
  )
  const links = useLiveQuery(
    () => db.task_links.filter((l) => l.deleted_at === null).toArray(),
    [],
  )

  const all = rows ?? []
  const liveLinks = links ?? []
  const openTasks = all.filter((t) => t.status === 'open')
  const openIds = new Set(openTasks.map((t) => t.id))

  const childrenByParent = new Map<string, TaskRow[]>()
  for (const t of openTasks) {
    if (!t.parent_id || !openIds.has(t.parent_id)) continue
    childrenByParent.set(t.parent_id, [...(childrenByParent.get(t.parent_id) ?? []), t])
  }
  childrenByParent.forEach((list) => list.sort(newestFirst))

  const ctx = buildPriorityContext(all, liveLinks)
  const blockersByTask = new Map<string, TaskRow[]>()
  const linksByBlocked = new Map<string, TaskLinkRow[]>()
  for (const t of openTasks) {
    const blockers = openBlockers(t.id, liveLinks, ctx).filter((b) => b.status === 'open')
    if (blockers.length > 0) blockersByTask.set(t.id, blockers)
    const own = liveLinks.filter((l) => l.blocked_id === t.id)
    if (own.length > 0) linksByBlocked.set(t.id, own)
  }

  return {
    open: openTasks
      .filter((t) => !t.parent_id || !openIds.has(t.parent_id))
      .sort(newestFirst),
    childrenByParent,
    blockersByTask,
    linksByBlocked,
    openAll: [...openTasks].sort(newestFirst),
    deferred: all.filter((t) => t.status === 'deferred').sort(newestFirst),
    loading: rows === undefined || links === undefined,
  }
}
