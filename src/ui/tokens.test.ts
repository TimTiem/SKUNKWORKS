import { describe, expect, it } from 'vitest'
import {
  cssVariables,
  DEFAULT_THEME,
  hexToRgbTriplet,
  THEMES,
  themeBaseStyles,
  themePalettes,
  tokens,
} from './tokens'

describe('design tokens', () => {
  it('converts hex to rgb triplets for Tailwind alpha support', () => {
    expect(hexToRgbTriplet('#FFFFFF')).toBe('255 255 255')
    expect(hexToRgbTriplet('#08090C')).toBe('8 9 12')
  })

  it('every theme defines exactly the same variables (swapping is safe)', () => {
    const reference = Object.keys(cssVariables(themePalettes[DEFAULT_THEME])).sort()
    for (const { id } of THEMES) {
      expect(Object.keys(cssVariables(themePalettes[id])).sort()).toEqual(reference)
    }
  })

  it('every variable the color map references exists in the palettes', () => {
    const referenced = JSON.stringify(tokens.colors).match(/--[a-z-]+/g) ?? []
    const defined = Object.keys(cssVariables(themePalettes[DEFAULT_THEME]))
    for (const name of new Set(referenced)) {
      expect(defined).toContain(name)
    }
  })

  it('emits a bare :root default plus one rule per theme — dark-only, no media queries', () => {
    const rules = themeBaseStyles()
    expect(rules[':root']).toEqual(cssVariables(themePalettes[DEFAULT_THEME]))
    for (const { id } of THEMES) {
      // Bare attribute selector: matches <html> AND nested theme swatches.
      expect(rules[`[data-theme="${id}"]`]).toBeDefined()
    }
    for (const key of Object.keys(rules)) {
      expect(key).not.toMatch(/@media/)
    }
  })

  it('the default theme is ember and it is unlocked from level 1', () => {
    expect(DEFAULT_THEME).toBe('ember')
    expect(THEMES.some((t) => t.id === DEFAULT_THEME && t.unlockLevel === 1)).toBe(true)
  })

  it('shadow tokens resolve through theme variables', () => {
    expect(tokens.shadows.card).toBe('var(--shadow-card)')
    expect(tokens.shadows.pop).toBe('var(--shadow-pop)')
  })
})
