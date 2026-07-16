import { describe, expect, it } from 'vitest'
import type { Fact } from '../content/facts/facts'
import { collectFacts, collectionTotals } from './factCollection'

const FACTS: Fact[] = [
  { id: 'bio-1', category: 'biology', text: 'B1' },
  { id: 'bio-2', category: 'biology', text: 'B2' },
  { id: 'his-1', category: 'history', text: 'H1' },
  { id: 'mma-1', category: 'mma', text: 'M1' },
]

describe('collectFacts', () => {
  it('groups by category with seen counts, exposing only seen fact text', () => {
    const cols = collectFacts(new Set(['bio-1', 'mma-1']), FACTS)
    const bio = cols.find((c) => c.category === 'biology')!
    expect(bio).toMatchObject({ total: 2, seen: 1 })
    expect(bio.seenFacts.map((f) => f.id)).toEqual(['bio-1']) // unseen bio-2 withheld

    const history = cols.find((c) => c.category === 'history')!
    expect(history).toMatchObject({ total: 1, seen: 0 })
    expect(history.seenFacts).toEqual([])
  })

  it('withholds all text when nothing is seen (no spoilers)', () => {
    const cols = collectFacts(new Set(), FACTS)
    expect(cols.every((c) => c.seenFacts.length === 0)).toBe(true)
    expect(cols.every((c) => c.seen === 0)).toBe(true)
  })
})

describe('collectionTotals', () => {
  it('sums seen and total across categories', () => {
    const cols = collectFacts(new Set(['bio-1', 'bio-2', 'his-1']), FACTS)
    expect(collectionTotals(cols)).toEqual({ seen: 3, total: 4 })
  })
})
