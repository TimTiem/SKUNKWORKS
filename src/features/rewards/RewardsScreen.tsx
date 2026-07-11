import { useEffect, useState } from 'react'
import { TIER_DEFAULTS } from '../../domain/rewards'
import { Button } from '../../ui/primitives/Button'
import { celebrationClass } from '../../ui/motion/celebrate'
import type { RewardRow } from '../../types/rows'
import { useStats } from '../gamification/useStats'
import { RewardForm } from './RewardForm'
import { RewardItem } from './RewardItem'
import { addReward, redeemReward } from './rewardActions'
import { useRewards } from './useRewards'

/** The real-world rewards store (FR-33..38): full CRUD + redeem, all offline. */
export function RewardsScreen() {
  const { rewards, loading } = useRewards()
  const stats = useStats()
  const [adding, setAdding] = useState(false)
  const [celebrating, setCelebrating] = useState<string | null>(null)

  if (loading || !stats) return null

  async function onRedeem(reward: RewardRow) {
    if (await redeemReward(reward)) setCelebrating(reward.name)
  }

  return (
    <div className="relative flex flex-col gap-4">
      <p className="text-sm text-ink-muted">
        Spend what you&apos;ve earned on real things. Your XP and level are yours for good —
        redeeming never touches them.
      </p>

      {rewards.length === 0 && !adding ? (
        <div className="rounded-card border border-dashed border-surface-overlay p-6 text-center text-ink-muted">
          <p>Add something worth working toward.</p>
          <p className="mt-1 text-sm">
            {TIER_DEFAULTS.map((t) => `${t.label} ≈ ${t.suggestedCost} coins (${t.effortHint})`).join(' · ')}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rewards.map((reward) => (
            <RewardItem
              key={reward.id}
              reward={reward}
              balance={stats.coinBalance}
              onRedeem={(r) => void onRedeem(r)}
            />
          ))}
        </ul>
      )}

      {adding ? (
        <RewardForm
          onCancel={() => setAdding(false)}
          onSave={(input) => {
            void addReward(input)
            setAdding(false)
          }}
        />
      ) : (
        <Button className="self-start" onClick={() => setAdding(true)}>
          Add a reward
        </Button>
      )}

      {celebrating && (
        <RedeemCelebration name={celebrating} onDone={() => setCelebrating(null)} />
      )}
    </div>
  )
}

/** "You earned this" — the whole framing, celebratory and brief (P8).
 *  The variant rotates per redemption so it doesn't go stale. */
function RedeemCelebration({ name, onDone }: { name: string; onDone: () => void }) {
  const [variant] = useState(() => celebrationClass(Math.floor(Date.now() / 1000)))
  useEffect(() => {
    const timer = setTimeout(onDone, 3200)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div
      role="status"
      className={`${variant} fixed inset-x-0 bottom-8 z-10 mx-auto w-fit max-w-[90%] rounded-card bg-accent-strong px-6 py-4 text-center shadow-pop`}
    >
      <p className="font-semibold text-accent-ink">You earned this! 🎉</p>
      <p className="break-words text-accent-ink">{name}</p>
    </div>
  )
}
