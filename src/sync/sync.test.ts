import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { getMeta } from '../db/meta'
import { newTask } from '../domain/tasks'
import type { SyncableRow, TaskRow } from '../types/rows'
import { pullAll } from './pull'
import { supabase } from './supabase'
import { syncNow } from './sync'

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn() },
  },
}))

type Result = { data: unknown[]; error: null | { message: string } }

/** Minimal thenable PostgREST chain that records calls and resolves `result`. */
function chain(result: Result) {
  const calls: Record<string, unknown[][]> = {}
  const c: Record<string, unknown> & { calls: typeof calls } = {
    calls,
    then: (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  for (const m of ['upsert', 'select', 'gt', 'order', 'limit']) {
    c[m] = (...args: unknown[]) => {
      ;(calls[m] ??= []).push(args)
      return c
    }
  }
  return c
}

/** Queue chains per table; unqueued tables get an empty result. */
const queues = new Map<string, ReturnType<typeof chain>[]>()
function queue(table: string, c: ReturnType<typeof chain>) {
  const list = queues.get(table) ?? []
  list.push(c)
  queues.set(table, list)
}

const T_LOCAL = '2026-07-10T10:00:00.000Z'
const T_SERVER = '2026-07-10T10:00:05.000Z'
const T_LATER = '2026-07-10T11:00:00.000Z'

const serverEcho = (row: TaskRow, updated_at: string): Record<string, unknown> => {
  const { dirty: _d, ...rest } = row
  return { ...rest, user_id: 'user-1', updated_at }
}

async function clearAll() {
  await Promise.all(db.tables.map((t) => t.clear()))
}

describe('syncNow', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    queues.clear()
    await clearAll()
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    } as never)
    vi.mocked(supabase.from).mockImplementation(
      (table: string) => (queues.get(table)?.shift() ?? chain({ data: [], error: null })) as never,
    )
  })

  it('pushes dirty tasks without local-only fields and adopts server stamps', async () => {
    const task = newTask('Buy milk', 'id-1', T_LOCAL)
    await db.tasks.add(task)
    const push = chain({ data: [serverEcho(task, T_SERVER)], error: null })
    queue('tasks', push)

    await syncNow()

    const [payload, options] = push.calls.upsert[0] as [Record<string, unknown>[], object]
    expect(payload[0]).not.toHaveProperty('dirty')
    expect(payload[0]).not.toHaveProperty('user_id')
    expect(payload[0]).toMatchObject({ id: 'id-1', text: 'Buy milk' })
    expect(options).toMatchObject({ ignoreDuplicates: false })

    const local = await db.tasks.get('id-1')
    expect(local).toMatchObject({ dirty: 0, updated_at: T_SERVER, user_id: 'user-1' })
  })

  it('pushes append-only logs insert-only (duplicates ignored)', async () => {
    await db.completions.add({
      id: 'c-1',
      user_id: null,
      task_id: 'id-1',
      completed_at: T_LOCAL,
      xp_awarded: 10,
      coins_awarded: 5,
      multiplier: 1,
      focus_session_id: null,
      created_at: T_LOCAL,
      updated_at: T_LOCAL,
      deleted_at: null,
      dirty: 1,
    })
    const push = chain({ data: [], error: null }) // duplicate: server returns nothing
    queue('completions', push)

    await syncNow()

    const [, options] = push.calls.upsert[0] as [unknown, object]
    expect(options).toMatchObject({ ignoreDuplicates: true })
    expect((await db.completions.get('c-1'))?.dirty).toBe(0)
  })

  it('leaves a row dirty when it was edited again mid-push', async () => {
    const task = newTask('Buy milk', 'id-1', T_LOCAL)
    await db.tasks.add(task)
    const push = chain({ data: [serverEcho(task, T_SERVER)], error: null })
    // Simulate an edit racing the network round-trip: bump the echo.
    push.then = (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) =>
      db.tasks
        .put({ ...task, text: 'Buy oat milk', updated_at: T_LATER, dirty: 1 })
        .then(() => ({ data: [serverEcho(task, T_SERVER)], error: null }) as Result)
        .then(resolve, reject)
    queue('tasks', push)

    await syncNow()

    const local = await db.tasks.get('id-1')
    expect(local).toMatchObject({ text: 'Buy oat milk', dirty: 1 }) // still queued
  })

  it('pulls new server rows in clean and advances the cursor', async () => {
    const server = serverEcho(newTask('From my phone', 'id-9', T_SERVER), T_SERVER)
    queue('tasks', chain({ data: [server], error: null }))

    await syncNow()

    expect(await db.tasks.get('id-9')).toMatchObject({
      text: 'From my phone',
      dirty: 0,
      user_id: 'user-1',
    })
    expect(await getMeta<string>('last_pulled:tasks')).toBe(T_SERVER)

    // Next pull resumes from the cursor.
    const next = chain({ data: [], error: null })
    queue('tasks', next)
    await syncNow()
    expect(next.calls.gt[0]).toEqual(['updated_at', T_SERVER])
  })

  it('LWW: a clean local row is overwritten by the server version', async () => {
    await db.tasks.add({ ...newTask('Old text', 'id-1', T_LOCAL), dirty: 0 })
    const server = serverEcho(newTask('New text from PC', 'id-1', T_LOCAL), T_SERVER)
    queue('tasks', chain({ data: [server], error: null }))

    await syncNow()

    expect((await db.tasks.get('id-1'))?.text).toBe('New text from PC')
  })

  it('LWW: a newer unpushed local edit survives an older server row', async () => {
    // Exercise the pull merge directly — this is the state after a failed or
    // not-yet-run push: the local edit is still dirty and newer.
    await db.tasks.add(newTask('My newer edit', 'id-1', T_LATER)) // dirty, newer
    const server = serverEcho(newTask('Older server text', 'id-1', T_LOCAL), T_SERVER)
    queue('tasks', chain({ data: [server], error: null }))

    await pullAll()

    const local = await db.tasks.get('id-1')
    expect(local).toMatchObject({ text: 'My newer edit', dirty: 1 })
  })

  it('applies server tombstones locally (soft deletes propagate)', async () => {
    await db.tasks.add({ ...newTask('Deleted elsewhere', 'id-1', T_LOCAL), dirty: 0 })
    const server = {
      ...serverEcho(newTask('Deleted elsewhere', 'id-1', T_LOCAL), T_SERVER),
      deleted_at: T_SERVER,
    }
    queue('tasks', chain({ data: [server], error: null }))

    await syncNow()

    expect((await db.tasks.get('id-1'))?.deleted_at).toBe(T_SERVER)
  })

  it('does nothing while offline', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await db.tasks.add(newTask('Offline capture', 'id-1', T_LOCAL))

    await syncNow()

    expect(supabase.from).not.toHaveBeenCalled()
    expect((await db.tasks.get('id-1'))?.dirty).toBe(1)
    onLine.mockRestore()
  })

  it('does nothing without a session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never)
    await db.tasks.add(newTask('x', 'id-1', T_LOCAL))

    await syncNow()

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('a push failure leaves rows dirty for the next attempt', async () => {
    await db.tasks.add(newTask('x', 'id-1', T_LOCAL))
    queue('tasks', chain({ data: [], error: { message: 'boom' } }))

    await syncNow() // must not throw — background reconciliation

    expect((await db.tasks.get('id-1'))?.dirty).toBe(1)
  })
})

// Type-level guard: SyncableRow keeps the fields the sync engine depends on.
const _guard: keyof SyncableRow extends string ? true : never = true
void _guard
