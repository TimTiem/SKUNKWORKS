import type { FocusSessionRow } from '../types/rows'

/**
 * Estimate-vs-actual "time sense" (FR-17): focus sessions already log
 * `planned_ms` and `actual_ms`, so we can reflect elapsed time back to help
 * recalibrate a notoriously unreliable ADHD time sense. Pure + unit-tested.
 * Framing is always neutral/curious, never a judgement (P8).
 */

/** Total actual focused time (ms) logged against one task. */
export function taskFocusActualMs(
  sessions: readonly FocusSessionRow[],
  taskId: string,
): number {
  return sessions
    .filter((s) => s.task_id === taskId && s.deleted_at === null)
    .reduce((sum, s) => sum + (s.actual_ms ?? 0), 0)
}

export interface TimeSense {
  /** Sessions with a recorded actual time. */
  count: number
  totalPlannedMs: number
  totalActualMs: number
  /** actual / planned across all sessions; 1 = on the money. null when no data. */
  ratio: number | null
}

export function focusTimeSense(sessions: readonly FocusSessionRow[]): TimeSense {
  const live = sessions.filter((s) => s.deleted_at === null && s.actual_ms != null)
  const totalPlannedMs = live.reduce((s, x) => s + x.planned_ms, 0)
  const totalActualMs = live.reduce((s, x) => s + (x.actual_ms ?? 0), 0)
  return {
    count: live.length,
    totalPlannedMs,
    totalActualMs,
    ratio: totalPlannedMs > 0 ? totalActualMs / totalPlannedMs : null,
  }
}

/** Calm, non-judgemental phrasing of the tendency (P8). */
export function tendencyLabel(ratio: number | null): string {
  if (ratio == null) return 'Focus a few sessions and your time sense shows up here.'
  const pct = Math.round((ratio - 1) * 100)
  if (Math.abs(pct) <= 5) return 'Your focus time lands right about where you plan it.'
  if (pct > 0) return `You tend to run about ${pct}% longer than planned — handy to know.`
  return `You tend to wrap about ${Math.abs(pct)}% sooner than planned.`
}
