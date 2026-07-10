import { useState } from 'react'
import { coinsShort } from '../../domain/rewards'
import { Button } from '../../ui/primitives/Button'
import type { RewardRow } from '../../types/rows'
import { RewardForm } from './RewardForm'
import { removeReward, updateReward } from './rewardActions'

/**
 * One reward: redeem when covered; otherwise show how close it is —
 * anticipation, never a locked-out shame state (P6/P8).
 */
export function RewardItem({
  reward,
  balance,
  onRedeem,
}: {
  reward: RewardRow
  balance: number
  onRedeem: (reward: RewardRow) => void
}) {
  const [editing, setEditing] = useState(false)
  const short = coinsShort(balance, reward)

  if (editing) {
    return (
      <li className="motion-enter">
        <RewardForm
          initial={reward}
          onCancel={() => setEditing(false)}
          onSave={(input) => {
            void updateReward(reward, {
              name: input.name,
              description: input.description ?? null,
              tier: input.tier,
              coin_cost: input.coinCost,
            })
            setEditing(false)
          }}
        />
      </li>
    )
  }

  return (
    <li className="motion-enter flex items-center gap-3 rounded-card bg-surface-raised px-4 py-3 shadow-card">
      <div className="min-w-0 flex-1">
        <p className="break-words text-ink-strong">{reward.name}</p>
        {reward.description && (
          <p className="break-words text-sm text-ink-muted">{reward.description}</p>
        )}
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
          <span aria-hidden="true" className="inline-block size-2 rounded-pill bg-coin" />
          {reward.coin_cost} coins
        </p>
      </div>

      {short === 0 ? (
        <Button className="shrink-0 px-4 py-2 text-sm" onClick={() => onRedeem(reward)}>
          Redeem
        </Button>
      ) : (
        <span className="shrink-0 text-sm text-ink-muted">{short} more to go</span>
      )}

      <Button variant="quiet" className="shrink-0 px-2" onClick={() => setEditing(true)}>
        Edit
      </Button>
      <button
        type="button"
        aria-label={`Delete "${reward.name}"`}
        onClick={() => void removeReward(reward)}
        className="grid size-11 shrink-0 place-items-center text-ink-muted hover:text-ink-base"
      >
        <svg viewBox="0 0 16 16" className="size-4 fill-none stroke-current stroke-[1.5]" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  )
}
