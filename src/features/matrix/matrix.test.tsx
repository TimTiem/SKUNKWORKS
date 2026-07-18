import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { newTaskLink } from '../../domain/priority'
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
    expect(screen.getByRole('status').textContent).toContain('worth 40 XP')
  })

  it('reveals the full task text in a tooltip on focus (readable on a crowded board)', async () => {
    await seedTask('Polish the changelog')
    render(<MatrixScreen />)
    const chip = await screen.findByRole('button', { name: /move "polish the changelog"/i })

    // Just the chip label before focus…
    expect(screen.getAllByText('Polish the changelog')).toHaveLength(1)
    fireEvent.focus(chip)
    // …plus the tooltip copy once focused.
    expect(screen.getAllByText('Polish the changelog')).toHaveLength(2)
  })

  it('draws a quiet dependency line between a task and what it waits on', async () => {
    const blocker = await seedTask('Design mockups')
    const blocked = await seedTask('Build the screen')
    await db.task_links.add(newTaskLink(blocked.id, blocker.id, crypto.randomUUID(), T0))
    render(<MatrixScreen />)

    const surface = await screen.findByRole('application', { name: /eisenhower matrix/i })
    // A <line> is drawn inside the matrix surface (the reticle/grid use divs).
    await waitFor(() => expect(surface.querySelectorAll('line').length).toBeGreaterThanOrEqual(1))
  })

  it('drifts a directional arrow from the blocker toward the dependent', async () => {
    // Blocker urgency ≥ dependent's, so effective urgency isn't pulled and the
    // rendered path is the raw positions — keeps the assertion deterministic.
    const blocker = await seedTask('Design mockups', { urgency: 70, importance: 80 })
    const blocked = await seedTask('Build the screen', { urgency: 40, importance: 30 })
    await db.task_links.add(newTaskLink(blocked.id, blocker.id, crypto.randomUUID(), T0))
    render(<MatrixScreen />)

    const surface = await screen.findByRole('application', { name: /eisenhower matrix/i })
    // A travelling arrowhead (polygon) animated along the dependency path.
    await waitFor(() =>
      expect(surface.querySelectorAll('polygon animateMotion').length).toBeGreaterThanOrEqual(1),
    )
    const motion = surface.querySelector('polygon animateMotion')!
    // Path starts at the blocker (must happen first) and ends at the dependent.
    expect(motion.getAttribute('path')).toBe('M 70 20 L 40 70')
    expect(motion.getAttribute('rotate')).toBe('auto')
  })

  it('draws just one arrow when a dependency pair is duplicated', async () => {
    const blocker = await seedTask('Design mockups')
    const blocked = await seedTask('Build the screen')
    // Two link rows for the SAME pair — must NOT stack two arrows on the line.
    await db.task_links.add(newTaskLink(blocked.id, blocker.id, crypto.randomUUID(), T0))
    await db.task_links.add(newTaskLink(blocked.id, blocker.id, crypto.randomUUID(), T0))
    render(<MatrixScreen />)

    const surface = await screen.findByRole('application', { name: /eisenhower matrix/i })
    await waitFor(() => expect(surface.querySelectorAll('line').length).toBeGreaterThanOrEqual(1))
    expect(surface.querySelectorAll('polygon animateMotion').length).toBe(1)
  })

  it('drops the arrow drift under reduced motion, keeping the static line', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )
    try {
      const blocker = await seedTask('Design mockups')
      const blocked = await seedTask('Build the screen')
      await db.task_links.add(newTaskLink(blocked.id, blocker.id, crypto.randomUUID(), T0))
      render(<MatrixScreen />)

      const surface = await screen.findByRole('application', { name: /eisenhower matrix/i })
      await waitFor(() => expect(surface.querySelectorAll('line').length).toBeGreaterThanOrEqual(1))
      expect(surface.querySelectorAll('animateMotion').length).toBe(0)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('names what the selected task is waiting on in the details rail', async () => {
    const blocker = await seedTask('Design mockups')
    const blocked = await seedTask('Build the screen')
    await db.task_links.add(newTaskLink(blocked.id, blocker.id, crypto.randomUUID(), T0))
    render(<MatrixScreen />)

    fireEvent.click(await screen.findByRole('button', { name: /move "build the screen"/i }))
    expect(await screen.findByText(/^waiting on:/i)).toBeInTheDocument()
    // The blocker's name shows in the rail, in addition to its own chip.
    await waitFor(() =>
      expect(screen.getAllByText('Design mockups').length).toBeGreaterThanOrEqual(2),
    )
  })
})
