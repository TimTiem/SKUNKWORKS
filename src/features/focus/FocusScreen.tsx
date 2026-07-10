import { useEffect, useState } from 'react'
import {
  FOCUS_PRESETS_MS,
  formatClock,
  fractionRemaining,
  inWindDown,
  isOvertime,
  remainingMs,
  type ActiveFocus,
} from '../../domain/focus'
import type { TaskRow } from '../../types/rows'
import { FocusRing } from './FocusRing'
import { completeFocus, endFocus, setFocusDuration } from './focusActions'

/**
 * The single-task focus screen (PRD §3.4). Each tick recomputes from the
 * wall clock, so returning from lock/background snaps to the truth. The end
 * is a gentle wind-down, then a calm overtime state — never an alarm (FR-15).
 */
export function FocusScreen({ focus, task }: { focus: ActiveFocus; task: TaskRow | null }) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const tick = () => setNowMs(Date.now())
    const interval = setInterval(tick, 500)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  const remaining = remainingMs(focus, nowMs)
  const overtime = isOvertime(focus, nowMs)
  const windDown = inWindDown(focus, nowMs)
  const label = overtime ? `+${formatClock(-remaining)}` : formatClock(remaining)
  const completable = task?.status === 'open'

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-8 p-6">
      <p className="max-w-full break-words text-center text-xl text-ink-strong">
        {task?.text ?? 'Focus'}
      </p>

      <FocusRing fraction={fractionRemaining(focus, nowMs)} windDown={windDown} label={label} />

      <p
        role="status"
        className={`min-h-6 text-sm text-ink-muted ${windDown ? 'motion-safe:animate-pulse' : ''}`}
      >
        {overtime
          ? 'Time — wrap up when you’re ready.'
          : windDown
            ? 'Winding down — find a stopping point.'
            : ''}
      </p>

      <div className="flex gap-2" aria-label="Session length">
        {FOCUS_PRESETS_MS.map((ms) => (
          <button
            key={ms}
            type="button"
            onClick={() => void setFocusDuration(focus, ms)}
            className={`rounded-pill px-4 py-2 text-sm transition-colors duration-enter ease-standard ${
              focus.planned_ms === ms
                ? 'bg-surface-overlay text-ink-strong'
                : 'text-ink-muted hover:text-ink-base'
            }`}
          >
            {ms / 60_000} min
          </button>
        ))}
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {completable && task && (
          <button
            type="button"
            onClick={() => void completeFocus(focus, task)}
            className="rounded-control bg-accent-base px-4 py-3 font-medium text-ink-strong transition-colors duration-enter ease-standard hover:bg-accent-strong"
          >
            Done — complete task
          </button>
        )}
        <button
          type="button"
          onClick={() => void endFocus(focus)}
          className="rounded-control px-4 py-2 text-sm text-ink-muted underline-offset-2 hover:underline"
        >
          End focus
        </button>
      </div>
    </main>
  )
}
