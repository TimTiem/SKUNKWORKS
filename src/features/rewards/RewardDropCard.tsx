import { useEffect } from 'react'
import type { RewardRow } from '../../types/rows'

/**
 * The surprise free-reward drop — the rarest, most celebratory completion
 * moment (~1 in 12). It sits ABOVE the fact card (which shows on every
 * completion) so the two never overlap. Dismissible and self-dismissing — a
 * delight, never a step to manage (P7). Framing is "you earned it", never a
 * transaction (P8).
 */
export function RewardDropCard({
  reward,
  onDismiss,
}: {
  reward: RewardRow
  onDismiss: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="fixed inset-x-0 bottom-40 z-30 mx-auto w-[min(28rem,90%)] px-2">
      <div
        role="status"
        className="celebrate-stamp rounded-card bg-accent-strong p-4 text-accent-ink shadow-pop"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-widest">Supply drop 🎁</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="grid size-8 place-items-center opacity-80 transition-opacity hover:opacity-100"
          >
            <svg
              viewBox="0 0 16 16"
              className="size-4 fill-none stroke-current stroke-[1.5]"
              aria-hidden="true"
            >
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="mt-1 break-words text-lg font-bold">{reward.name}</p>
        <p className="text-sm opacity-90">On the house — no coins spent. You earned it.</p>
      </div>
    </div>
  )
}
