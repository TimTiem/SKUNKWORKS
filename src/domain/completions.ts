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
  /** v1.1: matrix-computed values (domain/xp completionRewards). Defaults
   * keep the classic flat numbers for callers without a matrix position. */
  xpAwarded?: number
  coinsAwarded?: number
  /** Surprise crit (domain/xp rollCritMultiplier). Doubles XP only; the
   * stored xp_awarded is the FINAL amount so totals stay a plain sum. */
  multiplier?: number
}): CompletionRow {
  const fromFocus = args.focusSessionId != null
  const multiplier = args.multiplier ?? 1
  const baseXp = args.xpAwarded ?? (fromFocus ? XP_TASK + XP_FOCUS_BONUS : XP_TASK)
  return {
    id: args.id,
    user_id: null,
    task_id: args.taskId,
    completed_at: args.nowIso,
    xp_awarded: baseXp * multiplier,
    coins_awarded: args.coinsAwarded ?? (fromFocus ? COINS_TASK + COINS_FOCUS_BONUS : COINS_TASK),
    multiplier,
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
