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
    // Pin the crit roll to a miss so XP assertions stay deterministic.
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })

  it('renders the endowed start — never an empty bar (P6)', async () => {
    render(<XpBar />)
    expect(await screen.findByText(/lv 1 · ashborn/i)).toBeInTheDocument()
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

  it('a crit completion doubles XP and gets its own celebration', async () => {
    // Start mid-level-2 (25 + 2×25 = 75) so the crit itself doesn't cross a
    // level boundary — a level-up pop would (rightly) outrank the crit pop.
    await seedCompletions(2)
    vi.spyOn(Math, 'random').mockReturnValue(0.05) // force the ~10% roll to hit
    render(<Screen />)
    captureAndComplete('Lucky one')
    fireEvent.click(await screen.findByRole('button', { name: /complete "lucky one"/i }))

    expect(await screen.findByText('CRIT ×2 — +50 XP')).toBeInTheDocument()
    expect(await screen.findByText(/^125 XP$/)).toBeInTheDocument() // 75 + 50
    const crit = (await db.completions.toArray()).find((c) => c.multiplier === 2)
    expect(crit).toMatchObject({ xp_awarded: 50, coins_awarded: 12, multiplier: 2 })
  })

  it('crossing a threshold celebrates the level-up (FR-27)', async () => {
    await seedCompletions(1) // 25 + 25 = 50 XP — 10 short of level 2
    render(<Screen />)
    expect(await screen.findByText(/lv 1/i)).toBeInTheDocument()

    captureAndComplete('One more thing')
    fireEvent.click(await screen.findByRole('button', { name: /complete "one more thing"/i }))

    expect(await screen.findByText(/lv 2 · ember-touched/i)).toBeInTheDocument()
    // The level-up plate names the new rank and reveals its epitaph (the Souls beat).
    expect(await screen.findByText(/level 2 · ember-touched/i)).toBeInTheDocument()
    expect(await screen.findByText(/a faint warmth answers the dark/i)).toBeInTheDocument()
  })
})
