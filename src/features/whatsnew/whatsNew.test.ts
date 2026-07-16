import { describe, expect, it } from 'vitest'
import { WHATS_NEW, whatsNewFor } from './whatsNew'

describe('whatsNewFor', () => {
  it('finds the entry for a known version, undefined otherwise', () => {
    expect(whatsNewFor('1.5.0')?.version).toBe('1.5.0')
    expect(whatsNewFor('0.0.0')).toBeUndefined()
  })

  it('every entry is well-formed (semver + at least one item)', () => {
    for (const entry of WHATS_NEW) {
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(entry.items.length).toBeGreaterThan(0)
    }
  })
})
