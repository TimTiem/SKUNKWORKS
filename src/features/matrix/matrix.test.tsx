import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { newTask } from '../../domain/tasks'
import { MatrixScreen } from './MatrixScreen'
import { pointToPosition } from './matrixMath'

vi.mock('../../sync/sync', () => ({ requestSync: vi.fn() }))

const T0 = '2026-07-10T10:00:00.000Z'

const RECT = { left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0 }

/** jsdom has no layout — pin the surface rect so pointer math is real. */
function mockSurfaceRect() {
  const surface = screen.getByRole('application', { name: /eisenhower matrix/i })
  surface.getBoundingClientRect = () => ({ ...RECT, toJSON: () => RECT })
}

async function seedTask(text: string, patch: Partial<ReturnType<typeof newTask>> = {}) {
  const task = { ...newTask(text, crypto.randomUUID(), T0), ...patch }
  await db.tasks.add(task)
  return task
}

describe('pointToPosition', () => {
  it('maps the corners: left/bottom = 0, right/top = 100', () => {
    expect(pointToPosition(RECT, 0, 200)).toEqual({ urgency: 0, importance: 0 })
    expect(pointToPosition(RECT, 200, 0)).toEqual({ urgency: 100, importance: 100 })
    expect(pointToPosition(RECT, 100, 100)).toEqual({ urgency: 50, importance: 50 })
  })

  it('clamps points outside the surface', () => {
    expect(pointToPosition(RECT, -50, 400)).toEqual({ urgency: 0, importance: 0 })
    expect(pointToPosition(RECT, 999, -10)).toEqual({ urgency: 100, importance: 100 })
  })

  it('degrades to the centre on a zero-size rect', () => {
    expect(pointToPosition({ left: 0, top: 0, width: 0, height: 0 }, 10, 10)).toEqual({
      urgency: 50,
      importance: 50,
    })
  })
})

describe('matrix screen', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('places each open task chip at its importance/urgency', async () => {
    await seedTask('Centre task') // defaults 50/50
    await seedTask('Corner task', { importance: 100, urgency: 100 })
    render(<MatrixScreen />)

    const centre = await screen.findByRole('button', { name: /move "centre task"/i })
    expect(centre.style.left).toBe('50%')
    expect(centre.style.top).toBe('50%')

    const corner = screen.getByRole('button', { name: /move "corner task"/i })
    expect(corner.style.left).toBe('100%')
    expect(corner.style.top).toBe('0%')
  })

  it('a deadline pulls the rendered chip toward urgent on its own', async () => {
    await seedTask('Due now', { urgency: 0, due_at: new Date().toISOString() })
    render(<MatrixScreen />)

    const chip = await screen.findByRole('button', { name: /move "due now"/i })
    expect(chip.style.left).toBe('100%') // effective urgency, base still 0
    const [row] = await db.tasks.toArray()
    expect(row.urgency).toBe(0) // rendering never writes
  })

  it('dragging a chip stores its new position and shows live values', async () => {
    await seedTask('Drag me')
    render(<MatrixScreen />)
    const chip = await screen.findByRole('button', { name: /move "drag me"/i })
    mockSurfaceRect()

    fireEvent.pointerDown(chip, { clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(chip, { clientX: 180, clientY: 20, pointerId: 1 })
    // Live during the drag: chip follows, status line prices the spot.
    expect(chip.style.left).toBe('90%')
    expect(screen.getByRole('status').textContent).toContain('importance 90')
    fireEvent.pointerUp(chip, { pointerId: 1 })

    await waitFor(async () => {
      const [row] = await db.tasks.toArray()
      expect(row.importance).toBe(90)
      expect(row.urgency).toBe(90)
      expect(row.dirty).toBe(1)
    })
  })

  it('arrow keys nudge the selected task (keyboard path to the same values)', async () => {
    await seedTask('Nudge me')
    render(<MatrixScreen />)
    const chip = await screen.findByRole('button', { name: /move "nudge me"/i })

    fireEvent.keyDown(chip, { key: 'ArrowRight' })
    await waitFor(async () => expect((await db.tasks.toArray())[0].urgency).toBe(55))

    fireEvent.keyDown(chip, { key: 'ArrowDown' })
    await waitFor(async () => expect((await db.tasks.toArray())[0].importance).toBe(45))
  })

  it('shows the XP a position pays (P6 — the reward is visible before the work)', async () => {
    await seedTask('Priced task', { importance: 100, urgency: 100 })
    render(<MatrixScreen />)

    fireEvent.click(await screen.findByRole('button', { name: /move "priced task"/i }))
    expect(screen.getByRole('status').textContent).toContain('worth 16 XP')
  })
})
