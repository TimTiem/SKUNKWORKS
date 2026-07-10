import type { CoinLedgerRow, CompletionRow } from '../types/rows'
import { COINS_FOCUS_BONUS, COINS_TASK, XP_FOCUS_BONUS, XP_TASK } from './xp'

/**
 * Pure builders for the completion event pair. A completion ALWAYS appends
 * two immutable log rows: the `completions` event (XP) and its matching
 * `coin_ledger` earn (Decision 1/2) — totals are derived, never stored.
 */

export function buildCompletion(args: {
  id: string
  taskId: string | null
  nowIso: string
  focusSessionId?: string | null
}): CompletionRow {
  const fromFocus = args.focusSessionId != null
  return {
    id: args.id,
    user_id: null,
    task_id: args.taskId,
    completed_at: args.nowIso,
    xp_awarded: fromFocus ? XP_TASK + XP_FOCUS_BONUS : XP_TASK,
    coins_awarded: fromFocus ? COINS_TASK + COINS_FOCUS_BONUS : COINS_TASK,
    multiplier: 1, // surprise crit is v1.1 — parked
    focus_session_id: args.focusSessionId ?? null,
    created_at: args.nowIso,
    updated_at: args.nowIso,
    deleted_at: null,
    dirty: 1,
  }
}

/** "You earned this" — the ledger entry mirrors the completion's coins (P8 framing). */
export function buildCoinEarn(completion: CompletionRow, id: string): CoinLedgerRow {
  return {
    id,
    user_id: null,
    delta: completion.coins_awarded,
    reason: 'completion',
    ref_id: completion.id,
    at: completion.completed_at,
    created_at: completion.created_at,
    updated_at: completion.updated_at,
    deleted_at: null,
    dirty: 1,
  }
}
