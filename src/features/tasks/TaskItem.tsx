import { startFocus } from '../focus/focusActions'
import { useFactReveal } from '../facts/factRevealContext'
import type { TaskRow } from '../../types/rows'
import { completeTask, deferTask, softDeleteTask } from './taskActions'

/**
 * One open task: complete in a single tap (FR-08), enter Focus Now in a
 * single tap (FR-13); defer and delete are quiet, neutral affordances — no
 * red, no alarm (P8). Targets are ≥44px.
 */
export function TaskItem({ task }: { task: TaskRow }) {
  const revealFact = useFactReveal()
  return (
    <li className="motion-enter flex items-center gap-1 rounded-card bg-surface-raised py-1 pl-1 pr-2 shadow-card">
      <button
        type="button"
        aria-label={`Complete "${task.text}"`}
        onClick={() => void completeTask(task).then(revealFact)}
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

      <span className="min-w-0 flex-1 break-words py-2 text-ink-strong">{task.text}</span>

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
    </li>
  )
}
