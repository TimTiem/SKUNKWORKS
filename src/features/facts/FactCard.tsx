import { useEffect } from 'react'
import type { Fact, FactCategory } from '../../content/facts/facts'

const CATEGORY_LABEL: Record<FactCategory, string> = {
  biology: 'Biology',
  history: 'History',
  mma: 'MMA',
  strategy: 'Strategy',
  mythology: 'Mythology',
}

/**
 * The surprise fact card, shown on the ~1-in-6 completions that reveal one.
 * Dismissible and self-dismissing — a delight, never a step to manage (P7).
 */
export function FactCard({ fact, onDismiss }: { fact: Fact; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 9000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="fixed inset-x-0 bottom-6 z-20 mx-auto w-[min(28rem,90%)] px-2">
      <div className="celebrate-pop rounded-card bg-surface-overlay p-4 shadow-pop">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent-soft">
            {CATEGORY_LABEL[fact.category]} · unlocked
          </span>
          <button
            type="button"
            aria-label="Dismiss fact"
            onClick={onDismiss}
            className="grid size-8 place-items-center text-ink-muted hover:text-ink-base"
          >
            <svg viewBox="0 0 16 16" className="size-4 fill-none stroke-current stroke-[1.5]" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="mt-1 text-ink-strong">{fact.text}</p>
      </div>
    </div>
  )
}
