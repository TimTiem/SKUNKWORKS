import { describe, expect, it } from 'vitest'
import { celebrationClass } from './celebrate'

describe('celebrationClass', () => {
  it('always returns a defined celebrate-* variant', () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(celebrationClass(seed)).toMatch(/^celebrate-/)
    }
  })

  it('varies consecutive seeds (fights novelty decay)', () => {
    expect(celebrationClass(1)).not.toBe(celebrationClass(2))
    expect(celebrationClass(2)).not.toBe(celebrationClass(3))
  })

  it('is stable for a given seed and handles negatives', () => {
    expect(celebrationClass(7)).toBe(celebrationClass(7))
    expect(celebrationClass(-1)).toMatch(/^celebrate-/)
  })
})
