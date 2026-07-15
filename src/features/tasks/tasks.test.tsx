import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { CaptureBar } from '../capture/CaptureBar'
import { TaskList } from './TaskList'

// Keep this test hermetic: sync is fire-and-forget noise here.
vi.mock('../../sync/sync', () => ({ requestSync: vi.fn() }))

/**
 * Integration: real Dexie against fake-indexeddb — capture → live list →
 * complete/defer/soft-delete, the whole slice-3 loop with no network.
 */

function TasksScreen() {
  return (
    <>
      <CaptureBar />
      <TaskList />
    </>
  )
}

function capture(text: string) {
  fireEvent.change(screen.getByLabelText(/capture a task/i), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: /add task/i }))
}

describe('tasks slice', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('captures a task and shows it instantly, clearing the input', async () => {
    render(<TasksScreen />)
    capture('Buy milk')

    expect(await screen.findByText('Buy milk')).toBeInTheDocument()
    expect(screen.getByLabelText(/capture a task/i)).toHaveValue('')

    const rows = await db.tasks.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ text: 'Buy milk', status: 'open', dirty: 1 })
    expect(rows[0].id).toMatch(/^[0-9a-f-]{36}$/) // client UUID before any server
  })

  it('ignores empty captures', async () => {
    render(<TasksScreen />)
    capture('   ')
    await waitFor(async () => expect(await db.tasks.count()).toBe(0))
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('completes a task in one tap — row leaves the list, status is done', async () => {
    render(<TasksScreen />)
    capture('Buy milk')

    fireEvent.click(await screen.findByRole('button', { name: /complete "buy milk"/i }))

    await waitFor(() => expect(screen.queryByText('Buy milk')).not.toBeInTheDocument())
    const [row] = await db.tasks.toArray()
    expect(row.status).toBe('done')
    expect(row.dirty).toBe(1)
  })

  it('defers a task into a quiet disclosure and can bring it back', async () => {
    render(<TasksScreen />)
    capture('Call dentist')

    fireEvent.click(await screen.findByRole('button', { name: /defer "call dentist"/i }))

    const disclosure = await screen.findByRole('button', { name: /deferred \(1\)/i })
    fireEvent.click(disclosure)
    expect(await screen.findByText('Call dentist')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /bring back/i }))
    expect(await screen.findByRole('button', { name: /complete "call dentist"/i })).toBeInTheDocument()
  })

  it('deletes softly — the row disappears but the tombstone remains', async () => {
    render(<TasksScreen />)
    capture('Old idea')

    fireEvent.click(await screen.findByRole('button', { name: /delete "old idea"/i }))

    await waitFor(() => expect(screen.queryByText('Old idea')).not.toBeInTheDocument())
    const [row] = await db.tasks.toArray() // still in the store — soft delete
    expect(row.deleted_at).not.toBeNull()
    expect(row.dirty).toBe(1)
  })

  it('shows an inviting empty state, never a shame state', async () => {
    render(<TasksScreen />)
    expect(await screen.findByText(/nothing on your plate/i)).toBeInTheDocument()
  })

  // ── v1.1 planning ──────────────────────────────────────────────────────────

  it('sets a deadline from the detail panel and shows a quiet due chip', async () => {
    render(<TasksScreen />)
    capture('File taxes')
    fireEvent.click(await screen.findByRole('button', { name: /details for "file taxes"/i }))

    const inFiveDays = new Date(Date.now() + 5 * 86_400_000)
    const pad = (n: number) => String(n).padStart(2, '0')
    const value = `${inFiveDays.getFullYear()}-${pad(inFiveDays.getMonth() + 1)}-${pad(inFiveDays.getDate())}`
    fireEvent.change(screen.getByLabelText(/deadline/i), { target: { value } })

    expect(await screen.findByText(/due in 5d/i)).toBeInTheDocument()
    const [row] = await db.tasks.toArray()
    expect(row.due_at).not.toBeNull()
    expect(row.dirty).toBe(1)
  })

  it('adds a subtask nested under its parent', async () => {
    render(<TasksScreen />)
    capture('Big project')
    fireEvent.click(await screen.findByRole('button', { name: /details for "big project"/i }))

    fireEvent.change(screen.getByLabelText(/add a subtask/i), { target: { value: 'First step' } })
    fireEvent.click(screen.getByRole('button', { name: /add subtask/i }))

    expect(await screen.findByRole('button', { name: /complete "first step"/i })).toBeInTheDocument()
    expect(await screen.findByText('1 step')).toBeInTheDocument()
    const rows = await db.tasks.toArray()
    const parent = rows.find((r) => r.text === 'Big project')!
    const child = rows.find((r) => r.text === 'First step')!
    expect(child.parent_id).toBe(parent.id)
    expect(child.status).toBe('open')
  })

  it('adds a dependency and quietly refuses the reverse link (cycle)', async () => {
    render(<TasksScreen />)
    capture('Paint wall')
    capture('Buy paint')
    await screen.findByText('Buy paint')
    const buyPaint = (await db.tasks.toArray()).find((t) => t.text === 'Buy paint')!
    const paintWall = (await db.tasks.toArray()).find((t) => t.text === 'Paint wall')!

    // "Paint wall" waits for "Buy paint".
    fireEvent.click(await screen.findByRole('button', { name: /details for "paint wall"/i }))
    fireEvent.change(screen.getByLabelText(/waits for/i), { target: { value: buyPaint.id } })
    expect(await screen.findByText(/after: buy paint/i)).toBeInTheDocument()
    await waitFor(async () => expect(await db.task_links.count()).toBe(1))

    // The reverse would be a loop — refused with a quiet note, nothing stored.
    fireEvent.click(screen.getByRole('button', { name: /details for "paint wall"/i })) // collapse
    fireEvent.click(await screen.findByRole('button', { name: /details for "buy paint"/i }))
    fireEvent.change(screen.getByLabelText(/waits for/i), { target: { value: paintWall.id } })
    expect(await screen.findByText(/wait on each other/i)).toBeInTheDocument()
    expect(await db.task_links.count()).toBe(1)
  })

  it('pays XP by matrix position at completion time', async () => {
    render(<TasksScreen />)
    capture('Critical thing')
    await screen.findByText('Critical thing')
    const [row] = await db.tasks.toArray()
    await db.tasks.put({ ...row, importance: 100, urgency: 100 })

    fireEvent.click(await screen.findByRole('button', { name: /complete "critical thing"/i }))

    await waitFor(async () => expect(await db.completions.count()).toBe(1))
    const [completion] = await db.completions.toArray()
    expect(completion.xp_awarded).toBe(40) // top-right corner of the matrix
    expect(completion.coins_awarded).toBe(12) // coins stay flat
  })
})
