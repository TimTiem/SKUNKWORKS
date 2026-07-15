import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { buildCompletion } from '../../domain/completions'
import { CaptureBar } from '../capture/CaptureBar'
import { TaskList } from '../tasks/TaskList'
import { XpBar } from './XpBar'

vi.mock('../../sync/sync', () => ({ requestSync: vi.fn() }))

function Screen() {
  return (
    <>
      <XpBar />
      <CaptureBar />
      <TaskList />
    </>
  )
}

async function seedCompletions(count: number) {
  for (let i = 0; i < count; i++) {
    await db.completions.add(
      buildCompletion({ id: `seed-${i}`, taskId: null, nowIso: '2026-07-10T09:00:00.000Z' }),
    )
  }
}

function captureAndComplete(text: string) {
  fireEvent.change(screen.getByLabelText(/capture a task/i), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: /add task/i }))
}

describe('XpBar', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('renders the endowed start — never an empty bar (P6)', async () => {
    render(<XpBar />)
    expect(await screen.findByText(/lv 1 · recruit/i)).toBeInTheDocument()
    expect(screen.getByText(/35 xp to lv 2/i)).toBeInTheDocument()
    expect(screen.getByText(/^25 XP$/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
  })

  it('completing a task pays out instantly from local state (P1)', async () => {
    render(<Screen />)
    captureAndComplete('Buy milk')
    fireEvent.click(await screen.findByRole('button', { name: /complete "buy milk"/i }))

    expect(await screen.findByText(/^50 XP$/)).toBeInTheDocument()
    expect(screen.getByText(/12 coins/i)).toBeInTheDocument()
    expect(await screen.findByText('+25 XP')).toBeInTheDocument() // the pop

    expect(await db.completions.count()).toBe(1)
    expect(await db.coin_ledger.count()).toBe(1)
    const [completion] = await db.completions.toArray()
    expect(completion).toMatchObject({ xp_awarded: 25, coins_awarded: 12, dirty: 1 })
  })

  it('crossing a threshold celebrates the level-up (FR-27)', async () => {
    await seedCompletions(1) // 25 + 25 = 50 XP — 10 short of level 2
    render(<Screen />)
    expect(await screen.findByText(/lv 1/i)).toBeInTheDocument()

    captureAndComplete('One more thing')
    fireEvent.click(await screen.findByRole('button', { name: /complete "one more thing"/i }))

    expect(await screen.findByText(/lv 2 · spark/i)).toBeInTheDocument()
    expect(await screen.findByText(/level 2 — spark!/i)).toBeInTheDocument()
  })
})
