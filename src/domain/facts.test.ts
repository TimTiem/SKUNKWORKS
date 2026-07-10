import { describe, expect, it } from 'vitest'
import { FACTS, type Fact } from '../content/facts/facts'
import { buildFactUnlock, chooseFactReveal, FACT_REVEAL_CHANCE } from './facts'

const CATEGORIES = ['biology', 'history', 'mma', 'strategy', 'mythology'] as const

describe('facts content integrity', () => {
  it('has stable, unique, never-empty IDs', () => {
    const ids = FACTS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.length > 0)).toBe(true)
  })

  it('every fact has non-trivial text and a valid category', () => {
    for (const fact of FACTS) {
      expect(fact.text.length).toBeGreaterThan(20)
      expect(CATEGORIES).toContain(fact.category)
    }
  })

  it('ships a healthy pool across all five categories', () => {
    expect(FACTS.length).toBeGreaterThanOrEqual(60)
    for (const category of CATEGORIES) {
      expect(FACTS.filter((f) => f.category === category).length).toBeGreaterThanOrEqual(10)
    }
  })
})

const fact = (id: string): Fact => ({ id, category: 'biology', text: `x`.repeat(30) })
const POOL = [fact('a'), fact('b'), fact('c')]

describe('chooseFactReveal', () => {
  it('reveals nothing when the surprise roll misses', () => {
    // First rng() is the reveal gate; a value ≥ chance means "no fact".
    expect(chooseFactReveal(new Set(), () => 0.99, POOL)).toBeNull()
  })

  it('reveals an unseen fact when the roll hits', () => {
    const rolls = [0, 0] // hit, then pick index 0
    const rng = () => rolls.shift() ?? 0
    expect(chooseFactReveal(new Set(), rng, POOL)?.id).toBe('a')
  })

  it('never reveals a fact already seen', () => {
    const rolls = [0, 0]
    const rng = () => rolls.shift() ?? 0
    const seen = new Set(['a'])
    expect(chooseFactReveal(seen, rng, POOL)?.id).toBe('b')
  })

  it('stops gracefully when the pool is exhausted (never re-shows)', () => {
    const seen = new Set(['a', 'b', 'c'])
    expect(chooseFactReveal(seen, () => 0, POOL)).toBeNull()
  })

  it('reveal chance is the documented ~1-in-6', () => {
    expect(FACT_REVEAL_CHANCE).toBeCloseTo(1 / 6, 5)
  })
})

describe('buildFactUnlock', () => {
  it('records an append-only, dirty unlock referencing the fact id', () => {
    const row = buildFactUnlock(fact('a'), 'u-1', '2026-07-10T10:00:00.000Z')
    expect(row).toMatchObject({ fact_id: 'a', dirty: 1, deleted_at: null })
  })
})
