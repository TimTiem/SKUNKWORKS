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

/**
 * v1.1: XP scales with the task's Eisenhower position at completion time —
 * importance weighted over urgency. Computed once, appended to the log
 * (history never recalibrates); the matrix centre (50/50) pays exactly the
 * classic +10, and the floor keeps every completion rewarding (P8):
 *   4 + round(12 · (0.6·importance + 0.4·urgency)/100)  →  4..16 XP.
 * Coins stay flat so reward pricing stays predictable.
 */
export function completionRewards(
  importance: number,
  urgency: number,
  fromFocus: boolean,
): { xp: number; coins: number } {
  const score = (0.6 * importance + 0.4 * urgency) / 100
  return {
    xp: 4 + Math.round(12 * score) + (fromFocus ? XP_FOCUS_BONUS : 0),
    coins: COINS_TASK + (fromFocus ? COINS_FOCUS_BONUS : 0),
  }
}
