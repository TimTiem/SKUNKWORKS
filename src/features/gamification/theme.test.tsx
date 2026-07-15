import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { buildCompletion } from '../../domain/completions'
import { ThemePicker } from './ThemePicker'

vi.mock('../../sync/sync', () => ({ requestSync: vi.fn() }))

/** Seed XP by appending completions (25 endowed + 25 each). */
async function seedXp(completions: number) {
  for (let i = 0; i < completions; i++) {
    await db.completions.add(
      buildCompletion({ id: `c-${i}`, taskId: null, nowIso: '2026-07-10T09:00:00.000Z' }),
    )
  }
}

describe('ThemePicker', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    document.documentElement.removeAttribute('data-theme')
  })
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  it('shows locked themes with their unlock level at low level (P8, no shame)', async () => {
    render(<ThemePicker />)
    // Level 1: Nebula unlocked; Meadow (Lv 3) locked and labelled.
    const meadow = await screen.findByRole('button', { name: /meadow/i })
    expect(meadow).toBeDisabled()
    expect(meadow).toHaveTextContent(/lv 3/i)
  })

  it('lets you select an unlocked theme and applies it to <html>', async () => {
    await seedXp(20) // ~525 XP → well past level 3
    render(<ThemePicker />)

    const meadow = await screen.findByRole('button', { name: /meadow/i })
    await waitFor(() => expect(meadow).toBeEnabled())
    fireEvent.click(meadow)

    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).toBe('meadow'),
    )
    expect(await db.meta.get('selected_theme')).toMatchObject({ value: 'meadow' })
  })

  it('falls back to the default when the stored theme is not yet unlocked', async () => {
    await db.meta.put({ key: 'selected_theme', value: 'slate' }) // needs level 12
    render(<ThemePicker />) // level 1

    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).toBe('nebula'),
    )
  })
})
