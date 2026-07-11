import type { FactUnlockRow } from '../types/rows'
import { FACTS, type Fact } from '../content/facts/facts'

/**
 * Fact-reveal logic (FR-40..44): a completion reveals a random UNSEEN fact.
 * Pure and injectable (rng) so selection is deterministically testable.
 *
 * v1.1 (Tim's ask): EVERY completion reveals a fact, not ~1-in-6 — a
 * knowledge reward on each finish. With a 500-fact pool the novelty holds
 * for a long time, and we still stop gracefully once everything is seen.
 */

/** Every completion yields a fact while unseen facts remain (v1.1). */
export const FACT_REVEAL_CHANCE = 1

/**
 * Pick a random unseen fact, or null once the pool is exhausted (never
 * re-show, never reuse an id — P4). `rng` returns [0,1) and is injectable.
 */
export function chooseFactReveal(
  seenIds: ReadonlySet<string>,
  rng: () => number,
  facts: readonly Fact[] = FACTS,
): Fact | null {
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
