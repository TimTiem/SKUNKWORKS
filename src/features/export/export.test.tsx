import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { newTask } from '../../domain/tasks'
import { ExportButton } from './ExportButton'

describe('ExportButton', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    // jsdom has no blob-URL or download plumbing — stub the seam.
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('downloads a dated JSON snapshot and confirms inline (P1)', async () => {
    await db.tasks.add(newTask('Backup me', 't-1', '2026-07-15T10:00:00.000Z'))
    render(<ExportButton />)

    fireEvent.click(screen.getByRole('button', { name: /export data/i }))

    expect(await screen.findByText(/saved ✓/i)).toBeInTheDocument()
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce()
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
    const parsed = JSON.parse(await blob.text()) as {
      app: string
      tables: { tasks: unknown[] }
    }
    expect(parsed.app).toBe('skunkworks')
    expect(parsed.tables.tasks).toHaveLength(1)
  })
})
