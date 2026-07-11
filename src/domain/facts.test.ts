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

  it('ships 100 verified facts in each of the five categories (500 total)', () => {
    expect(FACTS.length).toBe(500)
    for (const category of CATEGORIES) {
      expect(FACTS.filter((f) => f.category === category).length).toBe(100)
    }
  })
})

const fact = (id: string): Fact => ({ id, category: 'biology', text: `x`.repeat(30) })
const POOL = [fact('a'), fact('b'), fact('c')]

describe('chooseFactReveal', () => {
  it('reveals a random unseen fact on every completion (v1.1)', () => {
    expect(chooseFactReveal(new Set(), () => 0, POOL)?.id).toBe('a')
    expect(chooseFactReveal(new Set(), () => 0.999, POOL)?.id).toBe('c')
  })

  it('never reveals a fact already seen', () => {
    const seen = new Set(['a'])
    expect(chooseFactReveal(seen, () => 0, POOL)?.id).toBe('b')
  })

  it('stops gracefully when the pool is exhausted (never re-shows)', () => {
    const seen = new Set(['a', 'b', 'c'])
    expect(chooseFactReveal(seen, () => 0, POOL)).toBeNull()
  })

  it('reveals on every completion now, not a fraction of them', () => {
    expect(FACT_REVEAL_CHANCE).toBe(1)
  })
})

describe('buildFactUnlock', () => {
  it('records an append-only, dirty unlock referencing the fact id', () => {
    const row = buildFactUnlock(fact('a'), 'u-1', '2026-07-10T10:00:00.000Z')
    expect(row).toMatchObject({ fact_id: 'a', dirty: 1, deleted_at: null })
  })
})
