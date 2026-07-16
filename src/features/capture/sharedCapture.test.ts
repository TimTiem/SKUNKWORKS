import { describe, expect, it } from 'vitest'
import { sharedCaptureText } from './sharedCapture'

describe('sharedCaptureText', () => {
  it('returns null with no shareable params', () => {
    expect(sharedCaptureText('')).toBeNull()
    expect(sharedCaptureText('?capture=1')).toBeNull()
  })

  it('reads shared text and appends a url', () => {
    expect(sharedCaptureText('?text=Buy%20milk')).toBe('Buy milk')
    expect(sharedCaptureText('?title=Read%20this&url=https%3A%2F%2Fx.dev')).toBe(
      'Read this https://x.dev',
    )
  })

  it('de-dups a repeated title/text and skips blanks', () => {
    expect(sharedCaptureText('?title=Call%20mum&text=Call%20mum')).toBe('Call mum')
    expect(sharedCaptureText('?title=%20%20&text=Ship%20it')).toBe('Ship it')
  })
})
