import { useState } from 'react'
import type { TaskRow } from '../../types/rows'
import { TaskItem } from './TaskItem'
import { reopenTask, softDeleteTask } from './taskActions'
import { useTasks } from './useTasks'

/**
 * The single simple list (FR-07): open tasks newest-first, an inviting empty
 * state (never a shame state, P8), and deferred tasks tucked away behind a
 * quiet disclosure — present, reachable, never nagging.
 */
export function TaskList() {
  const { open, deferred, loading } = useTasks()
  const [showDeferred, setShowDeferred] = useState(false)

  if (loading) return null

  return (
    <div className="flex flex-col gap-4">
      {open.length === 0 ? (
        <p className="rounded-card border border-dashed border-surface-overlay p-6 text-center text-ink-muted">
          Nothing on your plate. What&apos;s one small thing? Capture it above.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {open.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </ul>
      )}

      {deferred.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowDeferred((v) => !v)}
            aria-expanded={showDeferred}
            className="text-sm text-ink-muted underline-offset-2 hover:underline"
          >
            {showDeferred ? '▾' : '▸'} Deferred ({deferred.length})
          </button>
          {showDeferred && (
            <ul className="mt-2 flex flex-col gap-2">
              {deferred.map((task) => (
                <DeferredItem key={task.id} task={task} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function DeferredItem({ task }: { task: TaskRow }) {
  return (
    <li className="flex items-center gap-2 rounded-card bg-surface-raised/60 px-3 py-1 shadow-card">
      <span className="min-w-0 flex-1 break-words py-2 text-ink-muted">{task.text}</span>
      <button
        type="button"
        onClick={() => void reopenTask(task)}
        className="shrink-0 rounded-control px-3 py-2 text-sm text-accent-soft hover:text-accent-base"
      >
        Bring back
      </button>
      <button
        type="button"
        aria-label={`Delete "${task.text}"`}
        onClick={() => void softDeleteTask(task)}
        className="grid size-11 shrink-0 place-items-center text-ink-muted hover:text-ink-base"
      >
        <svg viewBox="0 0 16 16" className="size-4 fill-none stroke-current stroke-[1.5]" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  )
}
