import { db } from '../../db/db'
import type { Fact } from '../../content/facts/facts'
import { FACTS } from '../../content/facts/facts'
import { buildFactUnlock, chooseFactReveal } from '../../domain/facts'
import { nowISO } from '../../lib/time'
import { newId } from '../../lib/uuid'

/**
 * Rolls for a surprise fact after a completion and, if one is revealed,
 * records it in the append-only `fact_unlocks` set (de-dup by fact_id). The
 * insert is guarded so a fact seen on another device (pulled meanwhile)
 * isn't double-unlocked. Returns the fact to show, or null.
 *
 * Kept OUT of completeTask so a fact reveal never blocks or delays the XP
 * reward (P1) — the caller fires this after the completion has rendered.
 */
export async function rollForFact(rng: () => number = Math.random): Promise<Fact | null> {
  const seenRows = await db.fact_unlocks.filter((f) => f.deleted_at === null).toArray()
  const seen = new Set(seenRows.map((f) => f.fact_id))

  const fact = chooseFactReveal(seen, rng, FACTS)
  if (!fact) return null

  const inserted = await db.transaction('rw', db.fact_unlocks, async () => {
    const already = await db.fact_unlocks.where('fact_id').equals(fact.id).count()
    if (already > 0) return false
    await db.fact_unlocks.add(buildFactUnlock(fact, newId(), nowISO()))
    return true
  })

  // requestSync is driven by the completion that triggered this; no extra push.
  return inserted ? fact : null
}
