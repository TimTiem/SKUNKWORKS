import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { rollForFact } from './factReveal'

vi.mock('../../sync/sync', () => ({ requestSync: vi.fn() }))

describe('rollForFact', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  afterEach(() => vi.restoreAllMocks())

  it('records an unlock on a hit and returns the fact', async () => {
    const fact = await rollForFact(makeRng([0, 0]))
    expect(fact).not.toBeNull()
    expect(await db.fact_unlocks.count()).toBe(1)
    expect((await db.fact_unlocks.toArray())[0].fact_id).toBe(fact!.id)
  })

  it('records nothing on a miss', async () => {
    expect(await rollForFact(makeRng([0.99]))).toBeNull()
    expect(await db.fact_unlocks.count()).toBe(0)
  })

  it('never re-unlocks the same fact (de-dup across the seen set)', async () => {
    // Reveal one fact, then force the pool to try that same fact again.
    const first = await rollForFact(makeRng([0, 0]))
    // Re-rolling with pick index 0 would land on the first unseen fact, which
    // is now a *different* fact, so we should still only ever store uniques.
    await rollForFact(makeRng([0, 0]))
    const stored = await db.fact_unlocks.toArray()
    expect(new Set(stored.map((f) => f.fact_id)).size).toBe(stored.length)
    expect(stored.some((f) => f.fact_id === first!.id)).toBe(true)
  })
})

// FactCard surfaces via the provider only when a completion hits the roll.
import { FactRevealProvider } from './useFactReveal'
import { useFactReveal } from './factRevealContext'

function Trigger() {
  const reveal = useFactReveal()
  return (
    <button type="button" onClick={reveal}>
      complete
    </button>
  )
}

describe('fact reveal surface', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows a fact card on a hit', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // always hit, pick index 0
    render(
      <FactRevealProvider>
        <Trigger />
      </FactRevealProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /complete/i }))
    expect(await screen.findByText(/unlocked/i)).toBeInTheDocument()
  })

  it('shows nothing on a miss', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // always miss
    render(
      <FactRevealProvider>
        <Trigger />
      </FactRevealProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /complete/i }))
    await waitFor(() => expect(db.fact_unlocks.count()).resolves.toBe(0))
    expect(screen.queryByText(/unlocked/i)).not.toBeInTheDocument()
  })
})

/** Deterministic rng that yields the given sequence, then 0. */
function makeRng(values: number[]): () => number {
  const queue = [...values]
  return () => queue.shift() ?? 0
}
