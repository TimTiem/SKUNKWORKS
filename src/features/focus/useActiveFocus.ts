import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { META_KEYS } from '../../db/meta'
import type { ActiveFocus } from '../../domain/focus'
import type { TaskRow } from '../../types/rows'

/** Live view of the in-progress focus session (if any) and its task. */
export function useActiveFocus(): {
  focus: ActiveFocus | null
  task: TaskRow | null
  loading: boolean
} {
  // `?? null` distinguishes "no active focus" (null) from "still loading"
  // (undefined) — a bare get() returns undefined for both.
  const row = useLiveQuery(async () => (await db.meta.get(META_KEYS.activeFocus)) ?? null, [])
  const focus = row ? (row.value as ActiveFocus) : null

  const task = useLiveQuery(
    async () => (focus?.taskId ? await db.tasks.get(focus.taskId) : undefined),
    [focus?.taskId],
  )

  return { focus, task: task ?? null, loading: row === undefined }
}
