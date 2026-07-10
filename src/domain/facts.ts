import type { FactUnlockRow } from '../types/rows'
import { FACTS, type Fact } from '../content/facts/facts'

/**
 * Fact-reveal logic (FR-40..44): a completion occasionally reveals an UNSEEN
 * fact (variable/surprise reward). Pure and injectable (rng + clock) so the
 * probabilistic behaviour is deterministically testable.
 */

/** ~17% (≈1-in-6) completions yield a fact (CLAUDE.md → gamification numbers). */
export const FACT_REVEAL_CHANCE = 1 / 6

/**
 * Pick an unseen fact, or null. Two gates: the surprise roll, then the pool.
 * When every fact is seen we stop gracefully (never re-show, never reuse).
 * `rng` returns [0,1); `pick` chooses within the unseen set (both injectable).
 */
export function chooseFactReveal(
  seenIds: ReadonlySet<string>,
  rng: () => number,
  facts: readonly Fact[] = FACTS,
): Fact | null {
  if (rng() >= FACT_REVEAL_CHANCE) return null
  const unseen = facts.filter((f) => !seenIds.has(f.id))
  if (unseen.length === 0) return null
  const index = Math.min(unseen.length - 1, Math.floor(rng() * unseen.length))
  return unseen[index]
}

export function buildFactUnlock(fact: Fact, id: string, nowIso: string): FactUnlockRow {
  return {
    id,
    user_id: null,
    fact_id: fact.id,
    unlocked_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
    dirty: 1,
  }
}
