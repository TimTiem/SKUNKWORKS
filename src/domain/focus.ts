import type { FocusSessionRow } from '../types/rows'

/**
 * Focus timer math — pure and wall-clock based (NFR-29): remaining time is
 * always `started_at + planned_ms − now`, so lock/backgrounding can't drift
 * it; every tick recomputes from the clock, nothing accumulates.
 */

export const DEFAULT_FOCUS_MS = 25 * 60_000
export const FOCUS_PRESETS_MS = [10 * 60_000, 25 * 60_000, 45 * 60_000]
/** The gentle wind-down window before the end (FR-15). */
export const WIND_DOWN_MS = 60_000

/** In-progress session state — lives in local `meta` (device-local, not synced).
 * The immutable `focus_sessions` row is appended only when the session ends,
 * keeping that log strictly append-only. */
export interface ActiveFocus {
  sessionId: string
  taskId: string | null
  started_at: string
  planned_ms: number
}

/** Milliseconds left; negative means overtime. */
export function remainingMs(focus: ActiveFocus, nowMs: number): number {
  return new Date(focus.started_at).getTime() + focus.planned_ms - nowMs
}

/** 0..1 of the ring still filled. */
export function fractionRemaining(focus: ActiveFocus, nowMs: number): number {
  return Math.min(1, Math.max(0, remainingMs(focus, nowMs) / focus.planned_ms))
}

export function inWindDown(focus: ActiveFocus, nowMs: number): boolean {
  return remainingMs(focus, nowMs) <= WIND_DOWN_MS
}

export function isOvertime(focus: ActiveFocus, nowMs: number): boolean {
  return remainingMs(focus, nowMs) <= 0
}

/** "24:59" — always non-negative; the caller decides how to present overtime. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** The one immutable log row per finished session (FR-18). */
export function buildFocusSession(focus: ActiveFocus, endedAtIso: string): FocusSessionRow {
  const actual = new Date(endedAtIso).getTime() - new Date(focus.started_at).getTime()
  return {
    id: focus.sessionId,
    user_id: null,
    task_id: focus.taskId,
    started_at: focus.started_at,
    ended_at: endedAtIso,
    planned_ms: focus.planned_ms,
    actual_ms: Math.max(0, actual),
    created_at: endedAtIso,
    updated_at: endedAtIso,
    deleted_at: null,
    dirty: 1,
  }
}
