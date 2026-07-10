import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { META_KEYS, getMeta, setMeta } from '../../db/meta'
import type { ActiveFocus } from '../../domain/focus'
import { CaptureBar } from '../capture/CaptureBar'
import { TaskList } from '../tasks/TaskList'
import { FocusScreen } from './FocusScreen'
import { useActiveFocus } from './useActiveFocus'

vi.mock('../../sync/sync', () => ({ requestSync: vi.fn() }))

/** Mirrors the Shell's focus/list switching without auth. */
function Harness() {
  const { focus, task, loading } = useActiveFocus()
  if (loading) return null
  if (focus) return <FocusScreen focus={focus} task={task} />
  return (
    <>
      <CaptureBar />
      <TaskList />
    </>
  )
}

async function capture(text: string) {
  // First paint is null while the active-focus query resolves — wait it out.
  fireEvent.change(await screen.findByLabelText(/capture a task/i), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: /add task/i }))
}

describe('focus slice', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('starts focus in one tap and shows the ring with the task', async () => {
    render(<Harness />)
    await capture('Write report')
    fireEvent.click(await screen.findByRole('button', { name: /focus on "write report"/i }))

    expect(await screen.findByRole('timer')).toBeInTheDocument()
    expect(await screen.findByText('Write report')).toBeInTheDocument()
    expect(screen.getByText('25:00')).toBeInTheDocument() // default, zero config

    const active = await getMeta<ActiveFocus>(META_KEYS.activeFocus)
    expect(active?.planned_ms).toBe(25 * 60_000)
  })

  it('completing from focus logs the session and pays the bonus (+15/+7)', async () => {
    render(<Harness />)
    await capture('Write report')
    fireEvent.click(await screen.findByRole('button', { name: /focus on "write report"/i }))
    fireEvent.click(await screen.findByRole('button', { name: /done — complete task/i }))

    // Back on the list, task gone (completed).
    expect(await screen.findByLabelText(/capture a task/i)).toBeInTheDocument()
    expect(screen.queryByText('Write report')).not.toBeInTheDocument()

    const [completion] = await db.completions.toArray()
    const [session] = await db.focus_sessions.toArray()
    expect(completion).toMatchObject({ xp_awarded: 15, coins_awarded: 7, dirty: 1 })
    expect(completion.focus_session_id).toBe(session.id)
    expect(session).toMatchObject({ planned_ms: 25 * 60_000, dirty: 1 })
    expect(session.ended_at).not.toBeNull()
    expect(await getMeta(META_KEYS.activeFocus)).toBeUndefined()
    expect((await db.coin_ledger.toArray())[0].delta).toBe(7)
  })

  it('ending focus without completing logs the session, task stays open, no reward', async () => {
    render(<Harness />)
    await capture('Write report')
    fireEvent.click(await screen.findByRole('button', { name: /focus on "write report"/i }))
    fireEvent.click(await screen.findByRole('button', { name: /end focus/i }))

    // Wait for the list view to be back before asserting on its contents.
    expect(await screen.findByLabelText(/capture a task/i)).toBeInTheDocument()
    expect(await screen.findByText('Write report')).toBeInTheDocument() // still open
    expect(await db.focus_sessions.count()).toBe(1)
    expect(await db.completions.count()).toBe(0)
    const [task] = await db.tasks.toArray()
    expect(task.status).toBe('open')
  })

  it('adjusting the duration keeps the true start time', async () => {
    render(<Harness />)
    await capture('Write report')
    fireEvent.click(await screen.findByRole('button', { name: /focus on "write report"/i }))
    const before = await getMeta<ActiveFocus>(META_KEYS.activeFocus)

    fireEvent.click(await screen.findByRole('button', { name: /45 min/i }))

    await waitFor(async () => {
      const after = await getMeta<ActiveFocus>(META_KEYS.activeFocus)
      expect(after?.planned_ms).toBe(45 * 60_000)
      expect(after?.started_at).toBe(before?.started_at)
    })
  })

  it('an in-progress session survives a reload (state is in Dexie meta)', async () => {
    const active: ActiveFocus = {
      sessionId: 'f-1',
      taskId: null,
      started_at: new Date(Date.now() - 5 * 60_000).toISOString(),
      planned_ms: 25 * 60_000,
    }
    await setMeta(META_KEYS.activeFocus, active)

    render(<Harness />) // fresh mount = fresh app launch
    expect(await screen.findByRole('timer')).toBeInTheDocument()
    expect(screen.getByText(/^20:0[01]$/)).toBeInTheDocument() // recomputed from wall clock
  })

  it('overtime is a calm state, not an alarm (FR-15/P8)', async () => {
    const active: ActiveFocus = {
      sessionId: 'f-1',
      taskId: null,
      started_at: new Date(Date.now() - 26 * 60_000).toISOString(),
      planned_ms: 25 * 60_000,
    }
    await setMeta(META_KEYS.activeFocus, active)

    render(<Harness />)
    expect(await screen.findByText(/wrap up when you’re ready/i)).toBeInTheDocument()
    expect(screen.getByText(/^\+1:0[01]$/)).toBeInTheDocument()
  })
})
