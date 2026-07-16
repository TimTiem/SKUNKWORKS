import { useLiveQuery } from 'dexie-react-hooks'
import { CATEGORY_LABEL } from '../../content/facts/facts'
import { db } from '../../db/db'
import { collectFacts, collectionTotals } from '../../domain/factCollection'

/**
 * The facts you've unlocked, as a low-pressure collectible (FR-45). Additive
 * only — it never nags about what's missing; unseen facts are counted but
 * their text is withheld so a completion's surprise reveal stays a surprise.
 */
export function FactsCollection() {
  const seenRows = useLiveQuery(
    () => db.fact_unlocks.filter((f) => f.deleted_at === null).toArray(),
    [],
  )
  if (!seenRows) return null

  const seen = new Set(seenRows.map((f) => f.fact_id))
  const collections = collectFacts(seen)
  const totals = collectionTotals(collections)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">
        Your collection so far — {totals.seen} of {totals.total} facts unlocked. Each finished
        task can reveal a new one.
      </p>

      {collections.map((c) => (
        <section key={c.category} className="rounded-card bg-surface-raised p-4 shadow-card">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display tracking-wider text-ink-strong">
              {CATEGORY_LABEL[c.category]}
            </h2>
            <span className="text-sm text-ink-muted">
              {c.seen} / {c.total}
            </span>
          </div>

          {c.seenFacts.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {c.seenFacts.map((fact) => (
                <li key={fact.id} className="text-sm text-ink-base">
                  {fact.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">
              None unlocked yet — keep finishing tasks and they’ll show up here.
            </p>
          )}

          {c.seenFacts.length > 0 && c.seen < c.total && (
            <p className="mt-2 text-xs text-ink-muted">{c.total - c.seen} still to discover</p>
          )}
        </section>
      ))}
    </div>
  )
}
