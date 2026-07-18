import { describe, expect, it } from 'vitest'
import { isSoundscapeRunning, startSoundscape, stopSoundscape } from './soundscape'

// jsdom has no Web Audio API, so the soundscape must degrade silently: start
// reports it couldn't run, nothing is "running", and stop is a safe no-op.
// (This guards the graceful-absence contract that keeps audio a bonus, never a
// requirement — the same contract feedback.ts relies on.)
describe('soundscape without Web Audio', () => {
  it('startSoundscape returns false and does not mark itself running', () => {
    expect(startSoundscape()).toBe(false)
    expect(isSoundscapeRunning()).toBe(false)
  })

  it('stopSoundscape is a safe no-op', () => {
    expect(() => stopSoundscape()).not.toThrow()
    expect(isSoundscapeRunning()).toBe(false)
  })
})
