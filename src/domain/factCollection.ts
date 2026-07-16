import { FACTS, type Fact, type FactCategory } from '../content/facts/facts'

/**
 * Fact-collection view model (FR-45): turn the append-only `fact_unlocks`
 * seen-set into a per-category collectible — a low-pressure, purely additive
 * gallery (P4/P7). Unseen facts are counted but their text is withheld so the
 * surprise reveal on completion isn't spoiled.
 */

export interface CategoryCollection {
  category: FactCategory
  total: number
  seen: number
  /** Only the facts already unlocked — unseen text is deliberately withheld. */
  seenFacts: Fact[]
}

export function collectFacts(
  seenIds: ReadonlySet<string>,
  facts: readonly Fact[] = FACTS,
): CategoryCollection[] {
  const byCat = new Map<FactCategory, CategoryCollection>()
  for (const fact of facts) {
    let entry = byCat.get(fact.category)
    if (!entry) {
      entry = { category: fact.category, total: 0, seen: 0, seenFacts: [] }
      byCat.set(fact.category, entry)
    }
    entry.total++
    if (seenIds.has(fact.id)) {
      entry.seen++
      entry.seenFacts.push(fact)
    }
  }
  return [...byCat.values()]
}

export function collectionTotals(collections: readonly CategoryCollection[]): {
  seen: number
  total: number
} {
  return collections.reduce(
    (acc, c) => ({ seen: acc.seen + c.seen, total: acc.total + c.total }),
    { seen: 0, total: 0 },
  )
}
