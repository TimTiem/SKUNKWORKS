import { db } from '../../db/db'
import { META_KEYS, setMeta } from '../../db/meta'
import { buildCoinEarn, buildCompletion } from '../../domain/completions'
import { buildFocusSession, DEFAULT_FOCUS_MS, type ActiveFocus } from '../../domain/focus'
import { withStatus } from '../../domain/tasks'
import { rollCritMultiplier } from '../../domain/xp'
import { nowISO } from '../../lib/time'
import { newId } from '../../lib/uuid'
import { requestSync } from '../../sync/sync'
import { feedbackComplete, feedbackCrit } from '../../ui/feedback'
import { matrixRewards } from '../tasks/taskActions'
import type { TaskRow } from '../../types/rows'

/** One tap in (FR-13): default duration, zero required config (P2). */
export async function startFocus(task: TaskRow, plannedMs = DEFAULT_FOCUS_MS): Promise<void> {
  const focus: ActiveFocus = {
    sessionId: newId(),
    taskId: task.id,
    started_at: nowISO(),
    planned_ms: plannedMs,
  }
  await setMeta(META_KEYS.activeFocus, focus)
}

/** Adjust the planned duration mid-session — the start time stays truthful. */
export async function setFocusDuration(focus: ActiveFocus, plannedMs: number): Promise<void> {
  await setMeta(META_KEYS.activeFocus, { ...focus, planned_ms: plannedMs })
}

/**
 * Complete the task from focus: ONE local transaction appends the session
 * row, the completion event (with the focus bonus via focus_session_id) and
 * its coin earn, flips the task, and clears the in-progress state (P1).
 */
export async function completeFocus(focus: ActiveFocus, task: TaskRow): Promise<void> {
  const now = nowISO()
  const session = buildFocusSession(focus, now)
  const rewards = await matrixRewards(task, true) // matrix XP + focus bonus (v1.1)
  const completion = buildCompletion({
    id: newId(),
    taskId: task.id,
    nowIso: now,
    focusSessionId: session.id,
    xpAwarded: rewards.xp,
    coinsAwarded: rewards.coins,
    multiplier: rollCritMultiplier(), // ~10% surprise double XP
  })
  const coinEarn = buildCoinEarn(completion, newId())
  await db.transaction(
    'rw',
    [db.tasks, db.completions, db.coin_ledger, db.focus_sessions, db.meta],
    async () => {
      await db.tasks.put(withStatus(task, 'done', now))
      await db.completions.add(completion)
      await db.coin_ledger.add(coinEarn)
      await db.focus_sessions.add(session)
      await db.meta.delete(META_KEYS.activeFocus)
    },
  )
  if (completion.multiplier > 1) feedbackCrit()
  else feedbackComplete()
  requestSync()
}

/**
 * End without completing — still logged (the time was real), still quiet:
 * no completion event, no judgement, back to the list (P8).
 */
export async function endFocus(focus: ActiveFocus): Promise<void> {
  const now = nowISO()
  await db.transaction('rw', [db.focus_sessions, db.meta], async () => {
    await db.focus_sessions.add(buildFocusSession(focus, now))
    await db.meta.delete(META_KEYS.activeFocus)
  })
  requestSync()
}
