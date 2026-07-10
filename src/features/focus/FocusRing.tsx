const RADIUS = 88
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Time as an ambient shape (P3): a ring that visibly shrinks as the session
 * runs down, always on screen. The clock label rides inside it — the shape
 * is the primary signal, never a number behind a tap.
 */
export function FocusRing({
  fraction,
  windDown,
  label,
}: {
  fraction: number
  windDown: boolean
  label: string
}) {
  return (
    <div className="relative" role="timer" aria-label={`Focus timer, ${label} remaining`}>
      <svg viewBox="0 0 200 200" className="size-64 -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          strokeWidth="10"
          className="fill-none stroke-surface-overlay"
        />
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          className={`fill-none transition-[stroke-dashoffset,stroke] duration-celebrate ease-standard motion-reduce:transition-none ${
            windDown ? 'stroke-accent-soft' : 'stroke-focus'
          }`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-5xl font-semibold tabular-nums text-ink-strong">{label}</span>
      </div>
    </div>
  )
}
