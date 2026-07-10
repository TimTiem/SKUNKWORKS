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
})
