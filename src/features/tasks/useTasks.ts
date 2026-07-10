import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { TaskRow } from '../../types/rows'

const newestFirst = (a: TaskRow, b: TaskRow) => b.created_at.localeCompare(a.created_at)

/** Live view of the task list — re-renders on every local Dexie write. */
export function useTasks(): { open: TaskRow[]; deferred: TaskRow[]; loading: boolean } {
  const rows = useLiveQuery(
    () =>
      db.tasks
        .where('status')
        .anyOf('open', 'deferred')
        .filter((t) => t.deleted_at === null)
        .toArray(),
    [],
  )

  return {
    open: (rows ?? []).filter((t) => t.status === 'open').sort(newestFirst),
    deferred: (rows ?? []).filter((t) => t.status === 'deferred').sort(newestFirst),
    loading: rows === undefined,
  }
}
