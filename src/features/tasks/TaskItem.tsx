import { useState } from 'react'
import { useNow } from '../../hooks/useNow'
import { dueLabel } from '../../lib/time'
import type { TaskLinkRow, TaskRow } from '../../types/rows'
import { useFactReveal } from '../facts/factRevealContext'
import { startFocus } from '../focus/focusActions'
import { useRewardDrop } from '../rewards/rewardDropContext'
import { TaskDetail } from './TaskDetail'
import { completeTask, deferTask, softDeleteTask } from './taskActions'

export interface TaskTreeMaps {
  childrenByParent: Map<string, TaskRow[]>
  blockersByTask: Map<string, TaskRow[]>
  linksByBlocked: Map<string, TaskLinkRow[]>
  openAll: TaskRow[]
}

/**
 * One open task: complete in a single tap (FR-08), enter Focus Now in a
 * single tap (FR-13); defer and delete are quiet, neutral affordances — no
 * red, no alarm (P8). v1.1 adds quiet due/waits chips, an expandable
 * planning panel, and nested subtasks. Targets are ≥44px.
 */
export function TaskItem({ task, tree }: { task: TaskRow; tree: TaskTreeMaps }) {
  const revealFact = useFactReveal()
  const rollDrop = useRewardDrop()
  const [expanded, setExpanded] = useState(false)
  const nowMs = useNow()

  const children = tree.childrenByParent.get(task.id) ?? []
  const blockers = tree.blockersByTask.get(task.id) ?? []

  return (
    <li className="motion-enter">
      <div className="flex items-center gap-1 rounded-card bg-surface-raised py-1 pl-1 pr-2 shadow-card">
        <button
          type="button"
          aria-label={`Complete "${task.text}"`}
          onClick={() =>
            void completeTask(task).then(() => {
              revealFact()
              rollDrop()
            })
          }
          className="group grid size-11 shrink-0 place-items-center"
        >
          <span className="grid size-6 place-items-center rounded-pill border-2 border-ink-muted transition-colors duration-enter ease-standard group-hover:border-success">
            <svg
              viewBox="0 0 12 12"
              className="size-3 fill-none stroke-success stroke-2 opacity-0 transition-opacity duration-enter ease-standard group-hover:opacity-100"
              aria-hidden="true"
            >
              <path d="M2 6.5 5 9l5 -6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`Details for "${task.text}"`}
          className="min-w-0 flex-1 py-2 text-left"
        >
          <span className="break-words text-ink-strong">{task.text}</span>
          <span className="flex flex-wrap gap-x-3 text-xs text-ink-muted">
            {task.due_at && <span>{dueLabel(task.due_at, nowMs)}</span>}
            {blockers.length > 0 && <span>after: {blockers[0].text}</span>}
            {children.length > 0 && (
              <span>{children.length === 1 ? '1 step' : `${children.length} steps`}</span>
            )}
          </span>
        </button>

        <button
          type="button"
          aria-label={`Focus on "${task.text}"`}
          title="Focus Now"
          onClick={() => void startFocus(task)}
          className="grid size-11 shrink-0 place-items-center text-focus transition-colors duration-enter ease-standard hover:text-accent-soft"
        >
          <svg viewBox="0 0 16 16" className="size-4 fill-current" aria-hidden="true">
            <path d="M5 3.5v9l7.5-4.5z" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={`Defer "${task.text}"`}
          title="Defer for later"
          onClick={() => void deferTask(task)}
          className="grid size-11 shrink-0 place-items-center text-ink-muted transition-colors duration-enter ease-standard hover:text-ink-base"
        >
          <svg viewBox="0 0 16 16" className="size-4 fill-none stroke-current stroke-[1.5]" aria-hidden="true">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3l2 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={`Delete "${task.text}"`}
          title="Delete"
          onClick={() => void softDeleteTask(task)}
          className="grid size-11 shrink-0 place-items-center text-ink-muted transition-colors duration-enter ease-standard hover:text-ink-base"
        >
          <svg viewBox="0 0 16 16" className="size-4 fill-none stroke-current stroke-[1.5]" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {expanded && (
        <TaskDetail
          task={task}
          blockers={blockers}
          links={tree.linksByBlocked.get(task.id) ?? []}
          options={tree.openAll}
        />
      )}

      {children.length > 0 && (
        <ul className="ml-6 mt-1 flex flex-col gap-1 border-l border-surface-overlay pl-2">
          {children.map((child) => (
            <TaskItem key={child.id} task={child} tree={tree} />
          ))}
        </ul>
      )}
    </li>
  )
}
