import { describe, expect, it } from 'vitest'
import { isThemeUnlocked, themeStates, themeUnlockedAtLevel } from './themes'

describe('theme unlocks (derived from level)', () => {
  it('only the level-1 themes (ember default, ops, nebula) are unlocked at level 1', () => {
    const states = themeStates(1)
    expect(states.find((t) => t.id === 'ember')?.unlocked).toBe(true)
    expect(states.find((t) => t.id === 'ops')?.unlocked).toBe(true)
    expect(states.find((t) => t.id === 'nebula')?.unlocked).toBe(true)
    expect(states.filter((t) => t.unlocked)).toHaveLength(3)
  })

  it('unlocks more themes as level climbs, and never re-locks', () => {
    const at1 = themeStates(1).filter((t) => t.unlocked).length
    const at5 = themeStates(5).filter((t) => t.unlocked).length
    const at12 = themeStates(12).filter((t) => t.unlocked).length
    expect(at1).toBeLessThan(at5)
    expect(at5).toBeLessThan(at12)
    expect(at12).toBe(themeStates(99).filter((t) => t.unlocked).length)
  })

  it('reports how many levels away a locked theme is (anticipation, P6)', () => {
    const tide = themeStates(3).find((t) => t.id === 'tide')
    expect(tide?.unlocked).toBe(false)
    expect(tide?.levelsAway).toBe(5) // Manta (tide) unlocks at 8
  })

  it('isThemeUnlocked gates correctly', () => {
    expect(isThemeUnlocked('meadow', 2)).toBe(false)
    expect(isThemeUnlocked('meadow', 3)).toBe(true)
    expect(isThemeUnlocked('does-not-exist', 99)).toBe(false)
  })

  it('names the theme a milestone level just unlocked', () => {
    expect(themeUnlockedAtLevel(3)?.id).toBe('meadow')
    expect(themeUnlockedAtLevel(4)).toBeUndefined() // nothing unlocks at 4 (or 5)
  })
})
