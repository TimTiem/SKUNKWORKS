import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FACTS } from '../../content/facts/facts'
import { db } from '../../db/db'
import { buildFactUnlock } from '../../domain/facts'
import { nowISO } from '../../lib/time'
import { newId } from '../../lib/uuid'
import { rollForFact } from './factReveal'

vi.mock('../../sync/sync', () => ({ requestSync: vi.fn() }))

/** Mark the whole library seen — the only way to exhaust the pool now. */
async function unlockEverything() {
  await db.fact_unlocks.bulkAdd(FACTS.map((f) => buildFactUnlock(f, newId(), nowISO())))
}

describe('rollForFact', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  afterEach(() => vi.restoreAllMocks())

  it('records an unlock and returns the fact on every completion (v1.1)', async () => {
    const fact = await rollForFact(makeRng([0]))
    expect(fact).not.toBeNull()
    expect(await db.fact_unlocks.count()).toBe(1)
    expect((await db.fact_unlocks.toArray())[0].fact_id).toBe(fact!.id)
  })

  it('records nothing once every fact has been seen (graceful stop)', async () => {
    await unlockEverything()
    expect(await rollForFact(makeRng([0]))).toBeNull()
    expect(await db.fact_unlocks.count()).toBe(FACTS.length) // no new row
  })

  it('never re-unlocks the same fact (de-dup across the seen set)', async () => {
    const first = await rollForFact(makeRng([0]))
    // Re-rolling with pick index 0 lands on the first *remaining* unseen fact,
    // so stored unlocks stay unique.
    await rollForFact(makeRng([0]))
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

  it('shows a fact card on completion', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // pick index 0
    render(
      <FactRevealProvider>
        <Trigger />
      </FactRevealProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /complete/i }))
    expect(await screen.findByText(/unlocked/i)).toBeInTheDocument()
  })

  it('shows nothing once the pool is exhausted', async () => {
    await unlockEverything()
    render(
      <FactRevealProvider>
        <Trigger />
      </FactRevealProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /complete/i }))
    await waitFor(() =>
      expect(db.fact_unlocks.count()).resolves.toBe(FACTS.length),
    )
    expect(screen.queryByText(/unlocked/i)).not.toBeInTheDocument()
  })
})

/** Deterministic rng that yields the given sequence, then 0. */
function makeRng(values: number[]): () => number {
  const queue = [...values]
  return () => queue.shift() ?? 0
}
