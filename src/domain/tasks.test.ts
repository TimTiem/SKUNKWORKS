import { describe, expect, it } from 'vitest'
import { newTask, withSoftDelete, withStatus } from './tasks'

const T0 = '2026-07-10T10:00:00.000Z'
const T1 = '2026-07-10T11:00:00.000Z'

describe('newTask', () => {
  it('builds an open, dirty row with only text set', () => {
    const task = newTask('Buy milk', 'id-1', T0)
    expect(task).toEqual({
      id: 'id-1',
      user_id: null,
      text: 'Buy milk',
      note: null,
      tag: null,
      estimate_ms: null,
      status: 'open',
      created_at: T0,
      updated_at: T0,
      deleted_at: null,
      dirty: 1,
    })
  })

  it('trims the text', () => {
    expect(newTask('  Buy milk  ', 'id-1', T0).text).toBe('Buy milk')
  })
})

describe('withStatus', () => {
  it('changes status, marks dirty, refreshes updated_at, keeps created_at', () => {
    const task = { ...newTask('x', 'id-1', T0), dirty: 0 as const }
    const done = withStatus(task, 'done', T1)
    expect(done.status).toBe('done')
    expect(done.dirty).toBe(1)
    expect(done.updated_at).toBe(T1)
    expect(done.created_at).toBe(T0)
  })
})

describe('withSoftDelete', () => {
  it('sets the tombstone instead of removing anything', () => {
    const deleted = withSoftDelete(newTask('x', 'id-1', T0), T1)
    expect(deleted.deleted_at).toBe(T1)
    expect(deleted.dirty).toBe(1)
    expect(deleted.text).toBe('x') // row content survives — it is a tombstone
  })
})
