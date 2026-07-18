import { describe, expect, it, vi } from 'vitest'
import { aiParse } from './ai'

/** Build a fake fetch returning one Claude Messages response with `text` as the
 * single content block, or a non-ok/refusal response. */
function fakeFetch(opts: { ok?: boolean; text?: string; stop_reason?: string }) {
  return vi.fn(async () =>
    ({
      ok: opts.ok ?? true,
      json: async () => ({
        stop_reason: opts.stop_reason ?? 'end_turn',
        content: opts.text === undefined ? [] : [{ type: 'text', text: opts.text }],
      }),
    }) as unknown as Response,
  )
}

const base = { apiKey: 'k', model: 'claude-haiku-4-5', todayIso: '2026-07-18' }

describe('aiParse', () => {
  it('coerces a well-formed add intent', async () => {
    const text = JSON.stringify({
      action: 'add',
      text: 'call the dentist',
      note: '',
      name: '',
      due_at: '2026-07-21',
      importance: 80,
      urgency: 0,
      cost: 0,
    })
    const out = await aiParse('call the dentist next tuesday, important', {
      ...base,
      fetchImpl: fakeFetch({ text }),
    })
    expect(out).toEqual({
      action: 'add',
      text: 'call the dentist',
      note: '',
      name: '',
      due_at: '2026-07-21',
      importance: 80,
      urgency: 0,
      cost: 0,
    })
  })

  it('tolerates a code fence around the JSON', async () => {
    const text = '```json\n' + JSON.stringify({
      action: 'redeem', text: '', note: '', name: 'massage', due_at: '', importance: 0, urgency: 0, cost: 0,
    }) + '\n```'
    const out = await aiParse('treat myself to a massage', { ...base, fetchImpl: fakeFetch({ text }) })
    expect(out?.action).toBe('redeem')
    expect(out?.name).toBe('massage')
  })

  it('clamps out-of-range axes and drops a malformed due date', async () => {
    const text = JSON.stringify({
      action: 'prioritize', text: 'taxes', note: '', name: '', due_at: 'soon', importance: 250, urgency: -5, cost: 0,
    })
    const out = await aiParse('taxes are critical', { ...base, fetchImpl: fakeFetch({ text }) })
    expect(out).toMatchObject({ action: 'prioritize', importance: 100, urgency: 0, due_at: '' })
  })

  it('returns null for an unknown action', async () => {
    const text = JSON.stringify({
      action: 'unknown', text: '', note: '', name: '', due_at: '', importance: 0, urgency: 0, cost: 0,
    })
    expect(await aiParse('what is the weather', { ...base, fetchImpl: fakeFetch({ text }) })).toBeNull()
  })

  it('returns null on a non-ok HTTP response', async () => {
    expect(await aiParse('add milk', { ...base, fetchImpl: fakeFetch({ ok: false }) })).toBeNull()
  })

  it('returns null on a refusal', async () => {
    expect(
      await aiParse('do something bad', { ...base, fetchImpl: fakeFetch({ stop_reason: 'refusal', text: '{}' }) }),
    ).toBeNull()
  })

  it('returns null for empty input without calling fetch', async () => {
    const f = fakeFetch({ text: '{}' })
    expect(await aiParse('   ', { ...base, fetchImpl: f })).toBeNull()
    expect(f).not.toHaveBeenCalled()
  })
})
