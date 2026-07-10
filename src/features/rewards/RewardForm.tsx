import { useState, type FormEvent } from 'react'
import { TIER_DEFAULTS, type RewardInput } from '../../domain/rewards'
import { Button } from '../../ui/primitives/Button'
import type { RewardRow } from '../../types/rows'

/**
 * Add/edit form. Picking a tier pre-fills the suggested cost; everything
 * stays editable — the defaults serve the user, never constrain them.
 */
export function RewardForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: RewardRow
  onSave: (input: RewardInput) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [tier, setTier] = useState(initial?.tier ?? 'small')
  const [cost, setCost] = useState(initial?.coin_cost ?? 50)

  function pickTier(nextTier: string, suggestedCost: number) {
    setTier(nextTier)
    // Only auto-fill when the user hasn't customized away from a preset.
    if (TIER_DEFAULTS.some((t) => t.suggestedCost === cost)) setCost(suggestedCost)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || cost <= 0) return
    onSave({ name, description: description || null, tier, coinCost: cost })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-card bg-surface-raised p-4 shadow-card">
      <label htmlFor="reward-name" className="sr-only">
        Reward name
      </label>
      <input
        id="reward-name"
        type="text"
        required
        autoFocus
        placeholder="Something worth working toward"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-control bg-surface-overlay px-4 py-3 text-ink-strong placeholder:text-ink-muted"
      />

      <div className="flex flex-wrap gap-2" aria-label="Tier">
        {TIER_DEFAULTS.map((t) => (
          <button
            key={t.tier}
            type="button"
            aria-pressed={tier === t.tier}
            onClick={() => pickTier(t.tier, t.suggestedCost)}
            className={`rounded-pill px-4 py-2 text-sm transition-colors duration-enter ease-standard ${
              tier === t.tier
                ? 'bg-surface-overlay text-ink-strong'
                : 'text-ink-muted hover:text-ink-base'
            }`}
          >
            {t.label} · {t.suggestedCost} <span className="text-ink-muted">({t.effortHint})</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="reward-cost" className="text-sm text-ink-muted">
          Coin cost
        </label>
        <input
          id="reward-cost"
          type="number"
          min={1}
          required
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
          className="w-28 rounded-control bg-surface-overlay px-3 py-2 text-ink-strong"
        />
      </div>

      <label htmlFor="reward-description" className="sr-only">
        Description (optional)
      </label>
      <input
        id="reward-description"
        type="text"
        placeholder="Description (optional)"
        value={description ?? ''}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-control bg-surface-overlay px-4 py-2 text-sm text-ink-strong placeholder:text-ink-muted"
      />

      <div className="flex gap-2">
        <Button type="submit">{initial ? 'Save' : 'Add reward'}</Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
