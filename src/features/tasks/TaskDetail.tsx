import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import {
  dateInputToDueIso,
  dueIsoToDateInput,
  formatDurationMs,
  minutesToMs,
  msToMinutesInput,
} from '../../lib/time'
import { taskFocusActualMs } from '../../domain/timeSense'
import type { TaskLinkRow, TaskRow } from '../../types/rows'
import {
  addDependency,
  addSubtask,
  removeDependency,
  setTaskDue,
  setTaskMeta,
} from './taskActions'

/**
 * Inline planning panel (v1.1): optional deadline, subtasks, dependencies.
 * Everything here is optional forever (FR-03) — capture stays one field.
 */
export function TaskDetail({
  task,
  blockers,
  links,
  options,
}: {
  task: TaskRow
  /** Open tasks this one waits for. */
  blockers: TaskRow[]
  /** Live links where this task is the blocked side. */
  links: TaskLinkRow[]
  /** Candidate blockers (other open tasks). */
  options: TaskRow[]
}) {
  const [subtaskText, setSubtaskText] = useState('')
  const [loopNote, setLoopNote] = useState(false)

  // Optional light metadata (FR-11): local drafts, written on blur so we don't
  // touch Dexie on every keystroke. Seeded once from the row.
  const [note, setNote] = useState(task.note ?? '')
  const [tag, setTag] = useState(task.tag ?? '')
  const [estimate, setEstimate] = useState(msToMinutesInput(task.estimate_ms))

  // This task's focus history, for the estimate-vs-actual reflection (FR-17).
  // focus_sessions isn't indexed by task_id — a filter is fine at single-user scale.
  const sessions = useLiveQuery(
    () => db.focus_sessions.filter((s) => s.task_id === task.id).toArray(),
    [task.id],
  )
  const focusedMs = taskFocusActualMs(sessions ?? [], task.id)

  function submitSubtask(event: FormEvent) {
    event.preventDefault()
    if (!subtaskText.trim()) return
    void addSubtask(task, subtaskText)
    setSubtaskText('')
  }

  function commitNote() {
    const next = note.trim() || null
    if (next !== (task.note ?? null)) void setTaskMeta(task, { note: next })
  }
  function commitTag() {
    const next = tag.trim() || null
    if (next !== (task.tag ?? null)) void setTaskMeta(task, { tag: next })
  }
  function commitEstimate() {
    const next = minutesToMs(estimate)
    if (next !== (task.estimate_ms ?? null)) void setTaskMeta(task, { estimate_ms: next })
  }

  async function pickBlocker(blockerId: string) {
    if (!blockerId) return
    setLoopNote(!(await addDependency(task, blockerId)))
  }

  const candidates = options.filter(
    (t) => t.id !== task.id && !blockers.some((b) => b.id === t.id),
  )

  return (
    <div className="mt-1 flex flex-col gap-3 rounded-card bg-surface-overlay/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`due-${task.id}`} className="text-sm text-ink-muted">
          Deadline
        </label>
        <input
          id={`due-${task.id}`}
          type="date"
          value={dueIsoToDateInput(task.due_at)}
          onChange={(e) => void setTaskDue(task, dateInputToDueIso(e.target.value))}
          className="rounded-control bg-surface-raised px-3 py-1.5 text-sm text-ink-strong"
        />
        {task.due_at && (
          <button
            type="button"
            onClick={() => void setTaskDue(task, null)}
            className="text-sm text-ink-muted underline-offset-2 hover:underline"
          >
            clear
          </button>
        )}
      </div>

      <form onSubmit={submitSubtask} className="flex gap-2">
        <label htmlFor={`subtask-${task.id}`} className="sr-only">
          Add a subtask
        </label>
        <input
          id={`subtask-${task.id}`}
          type="text"
          placeholder="Break off a smaller step…"
          value={subtaskText}
          onChange={(e) => setSubtaskText(e.target.value)}
          className="w-full rounded-control bg-surface-raised px-3 py-1.5 text-sm text-ink-strong placeholder:text-ink-muted"
        />
        <button
          type="submit"
          aria-label="Add subtask"
          className="rounded-control bg-surface-raised px-3 text-ink-base hover:text-ink-strong"
        >
          +
        </button>
      </form>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`depends-${task.id}`} className="text-sm text-ink-muted">
          Waits for
        </label>
        {blockers.map((blocker) => {
          const link = links.find((l) => l.blocker_id === blocker.id)
          return (
            <span
              key={blocker.id}
              className="flex w-fit max-w-full items-center gap-1 rounded-pill bg-surface-raised px-3 py-1 text-sm text-ink-base"
            >
              <span className="truncate">{blocker.text}</span>
              {link && (
                <button
                  type="button"
                  aria-label={`Remove dependency on "${blocker.text}"`}
                  onClick={() => void removeDependency(link)}
                  className="ml-1 text-ink-muted hover:text-ink-base"
                >
                  ×
                </button>
              )}
            </span>
          )
        })}
        {candidates.length > 0 && (
          <select
            id={`depends-${task.id}`}
            value=""
            onChange={(e) => void pickBlocker(e.target.value)}
            className="w-full rounded-control bg-surface-raised px-3 py-1.5 text-sm text-ink-base"
          >
            <option value="">Add a task this waits for…</option>
            {candidates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.text}
              </option>
            ))}
          </select>
        )}
        {loopNote && (
          <p className="text-sm text-ink-muted">
            That would make these tasks wait on each other — skipped it.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`note-${task.id}`} className="text-sm text-ink-muted">
          Note
        </label>
        <textarea
          id={`note-${task.id}`}
          rows={2}
          value={note}
          placeholder="Anything you want to remember…"
          onChange={(e) => setNote(e.target.value)}
          onBlur={commitNote}
          className="w-full resize-y rounded-control bg-surface-raised px-3 py-1.5 text-sm text-ink-strong placeholder:text-ink-muted"
        />

        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`tag-${task.id}`} className="text-sm text-ink-muted">
              Tag
            </label>
            <input
              id={`tag-${task.id}`}
              type="text"
              value={tag}
              placeholder="e.g. work"
              onChange={(e) => setTag(e.target.value)}
              onBlur={commitTag}
              className="w-32 rounded-control bg-surface-raised px-3 py-1.5 text-sm text-ink-strong placeholder:text-ink-muted"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`estimate-${task.id}`} className="text-sm text-ink-muted">
              Estimate (min)
            </label>
            <input
              id={`estimate-${task.id}`}
              type="number"
              min={1}
              inputMode="numeric"
              value={estimate}
              placeholder="—"
              onChange={(e) => setEstimate(e.target.value)}
              onBlur={commitEstimate}
              className="w-24 rounded-control bg-surface-raised px-3 py-1.5 text-sm text-ink-strong placeholder:text-ink-muted"
            />
          </div>
        </div>

        {task.estimate_ms != null && (
          <p className="text-xs text-ink-muted">
            Estimated {formatDurationMs(task.estimate_ms)}
            {focusedMs > 0 && <> · focused {formatDurationMs(focusedMs)} so far</>}
          </p>
        )}
      </div>

      <p className="text-xs text-ink-muted">
        Importance {task.importance} · urgency {task.urgency} — drag it in the Matrix. Higher
        placement pays more XP.
      </p>
    </div>
  )
}
