import { describe, expect, it } from 'vitest'
import { epitaphForLevel, levelFromXp, levelProgress, titleForLevel, xpForLevel } from './levels'
import { ENDOWED_XP, totalXp } from './xp'

describe('xpForLevel', () => {
  it('matches the locked curve for levels 1..10', () => {
    const expected = [0, 60, 150, 280, 460, 700, 1000, 1370, 1820, 2360]
    expected.forEach((xp, i) => expect(xpForLevel(i + 1)).toBe(xp))
  })

  it('extends 11+ with deltas growing by 90 per level', () => {
    expect(xpForLevel(11)).toBe(2360 + 630) // Δ10 was 540 → Δ11 = 630
    expect(xpForLevel(12)).toBe(2990 + 720)
  })
})

describe('levelFromXp', () => {
  it('handles the exact thresholds', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(59)).toBe(1)
    expect(levelFromXp(60)).toBe(2)
    expect(levelFromXp(2359)).toBe(9)
    expect(levelFromXp(2360)).toBe(10)
    expect(levelFromXp(2990)).toBe(11)
  })

  it('never decreases as XP grows (P4 sanity)', () => {
    let last = 0
    for (let xp = 0; xp <= 5000; xp += 37) {
      const level = levelFromXp(xp)
      expect(level).toBeGreaterThanOrEqual(last)
      last = level
    }
  })
})

describe('levelProgress', () => {
  it('endowed start lands ~42% toward level 2 (P6)', () => {
    const p = levelProgress(totalXp([]))
    expect(p.level).toBe(1)
    expect(p.intoLevel).toBe(ENDOWED_XP)
    expect(p.toNext).toBe(35)
    expect(p.fraction).toBeCloseTo(0.4167, 3)
  })

  it('reports N-to-next across a level boundary', () => {
    const p = levelProgress(65)
    expect(p.level).toBe(2)
    expect(p.intoLevel).toBe(5)
    expect(p.toNext).toBe(85) // level 3 at 150
  })
})

describe('titleForLevel', () => {
  it('gives every early level a distinct title', () => {
    const titles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(titleForLevel)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('starts on the ember arc, not a generic rank', () => {
    expect(titleForLevel(1)).toBe('Ashborn')
  })

  it('falls back gracefully past the curated arc, still distinct', () => {
    expect(titleForLevel(30)).toMatch(/^Everburning \d+$/)
    expect(titleForLevel(30)).not.toBe(titleForLevel(31))
  })
})

describe('epitaphForLevel', () => {
  it('gives every curated level a non-empty inscription', () => {
    for (let level = 1; level <= 15; level++) {
      expect(epitaphForLevel(level).length).toBeGreaterThan(0)
    }
  })

  it('has an inscription past the curated arc', () => {
    expect(epitaphForLevel(99).length).toBeGreaterThan(0)
  })
})
