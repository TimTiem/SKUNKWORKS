import { describe, expect, it } from 'vitest'
import { generateToken, sha256Hex, siriEndpoint } from './siriToken'

describe('generateToken', () => {
  it('is URL-safe base64url with no padding', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateToken()).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })

  it('is effectively unique across calls', () => {
    const set = new Set(Array.from({ length: 200 }, () => generateToken()))
    expect(set.size).toBe(200)
  })
})

describe('sha256Hex', () => {
  it('matches the known vector for the empty string', async () => {
    expect(await sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  it('matches the known vector for "abc"', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})

describe('siriEndpoint', () => {
  it('appends the function path', () => {
    expect(siriEndpoint('https://abc.supabase.co')).toBe(
      'https://abc.supabase.co/functions/v1/siri',
    )
  })

  it('tolerates a trailing slash on the project url', () => {
    expect(siriEndpoint('https://abc.supabase.co/')).toBe(
      'https://abc.supabase.co/functions/v1/siri',
    )
  })
})
