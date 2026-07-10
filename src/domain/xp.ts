import type { CompletionRow } from '../types/rows'

/**
 * XP derivation (Decision 1): total XP is ALWAYS a sum over the append-only
 * `completions` log plus the endowed start — never a stored counter. P4 (XP
 * only goes up) is structurally true: there is nothing to decrement.
 */

/** Endowed start (P6): every account begins ~42% toward Level 2 — bars never render empty. */
export const ENDOWED_XP = 25

// Earning defaults (CLAUDE.md → gamification numbers; tune in Phase 5, don't invent).
export const XP_TASK = 10
export const XP_FOCUS_BONUS = 5
export const COINS_TASK = 5
export const COINS_FOCUS_BONUS = 2

export function totalXp(completions: readonly Pick<CompletionRow, 'xp_awarded'>[]): number {
  return ENDOWED_XP + completions.reduce((sum, c) => sum + c.xp_awarded, 0)
}
