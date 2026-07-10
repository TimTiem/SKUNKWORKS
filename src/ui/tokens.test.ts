import { describe, expect, it } from 'vitest'
import { cssVariables, hexToRgbTriplet, palettes, tokens } from './tokens'

describe('design tokens', () => {
  it('converts hex to rgb triplets for Tailwind alpha support', () => {
    expect(hexToRgbTriplet('#FFFFFF')).toBe('255 255 255')
    expect(hexToRgbTriplet('#0F1117')).toBe('15 17 23')
  })

  it('light and dark palettes define exactly the same variables', () => {
    expect(Object.keys(cssVariables(palettes.light)).sort()).toEqual(
      Object.keys(cssVariables(palettes.dark)).sort(),
    )
  })

  it('every variable the color map references exists in both palettes', () => {
    const referenced = JSON.stringify(tokens.colors).match(/--[a-z-]+/g) ?? []
    const defined = Object.keys(cssVariables(palettes.dark))
    for (const name of new Set(referenced)) {
      expect(defined).toContain(name)
    }
  })

  it('shadow tokens resolve through theme variables', () => {
    expect(tokens.shadows.card).toBe('var(--shadow-card)')
    expect(tokens.shadows.pop).toBe('var(--shadow-pop)')
  })
})
