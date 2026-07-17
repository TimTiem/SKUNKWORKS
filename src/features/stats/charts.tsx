import { useEffect, useState } from 'react'
import type { DayBucket, WeekdayBucket } from '../../domain/stats'

/**
 * Productivity chart primitives — hand-built SVG/flex marks, no chart library
 * (CLAUDE.md stack is locked). Every chart is SINGLE-HUE SEQUENTIAL: magnitude
 * is carried by the accent hue (theme-driven) and by size, never by a second
 * color (dataviz method). Text always wears ink tokens, never the series color.
 * All framing is neutral — a busy day is bright, a quiet day is just dim, never
 * a miss (P8). Entrance motion is sugar only; reduced motion skips it.
 */

const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const dayLabel = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

/** Animate a 0..1 value up from 0 on mount (skipped instantly under reduced motion). */
function useEntrance(target: number): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    // Flip to the target on the next frame so the arc/stroke transitions in.
    const id = requestAnimationFrame(() => setValue(target))
    return () => cancelAnimationFrame(id)
  }, [target])
  return value
}

/**
 * Hero timeline: completions per local day. Bars are anchored to the baseline
 * with rounded tops; a recessive dashed line marks the daily average; hovering
 * a day lifts a tooltip with its full tally. Quiet days keep a faint tick so
 * the timeline reads as continuous (never gappy, never a shame gap).
 */
export function ActivityBars({ data }: { data: DayBucket[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.completions))
  const total = data.reduce((n, d) => n + d.completions, 0)
  const avg = total / data.length
  const active = hover != null ? data[hover] : null

  return (
    <div>
      <div className="relative flex h-32 items-end gap-0.5 sm:h-40">
        {/* recessive average guide */}
        {total > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink-muted/25"
            style={{ bottom: `${(avg / max) * 100}%` }}
          />
        )}
        {data.map((d, i) => {
          const isToday = i === data.length - 1
          const h = d.completions === 0 ? 0 : Math.max(8, (d.completions / max) * 100)
          return (
            <div
              key={d.dayMs}
              className="group relative flex h-full flex-1 items-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((prev) => (prev === i ? null : prev))}
            >
              {d.completions === 0 ? (
                <div className="h-0.5 w-full rounded-pill bg-ink-muted/15" />
              ) : (
                <div
                  className={`chart-bar w-full rounded-t-[4px] bg-gradient-to-b from-accent-base to-accent-strong transition-opacity ${
                    hover != null && hover !== i ? 'opacity-45' : 'opacity-100'
                  } ${isToday ? 'ring-1 ring-inset ring-accent-soft' : ''}`}
                  style={{ height: `${h}%`, animationDelay: `${i * 22}ms` }}
                  title={`${dayLabel(d.dayMs)} — ${d.completions} done`}
                />
              )}
            </div>
          )
        })}

        {active && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-full z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-control bg-surface-overlay px-2 py-1 text-xs text-ink-strong shadow-pop"
            style={{ left: `${((hover! + 0.5) / data.length) * 100}%` }}
          >
            <span className="font-display tracking-wide text-accent-soft">{active.completions}</span>{' '}
            done · +{active.xp} XP
            <span className="mt-0.5 block text-[10px] text-ink-muted">{dayLabel(active.dayMs)}</span>
          </div>
        )}
      </div>
      <p className="sr-only">
        {data.length}-day timeline: {total} completions total, averaging {avg.toFixed(1)} per day.
      </p>
    </div>
  )
}

/**
 * Day-of-week rhythm — which days the work actually lands on. The strongest day
 * is outlined and named; it's an insight ("you ship most on Tuesdays"), never a
 * quota. Single accent hue, height carries the count.
 */
export function WeekdayBars({ data }: { data: WeekdayBucket[] }) {
  const max = Math.max(1, ...data.map((d) => d.completions))
  const total = data.reduce((n, d) => n + d.completions, 0)
  const strongest = total > 0 ? data.reduce((a, b) => (b.completions > a.completions ? b : a)) : null

  return (
    <div>
      <div className="flex h-24 items-end gap-1.5">
        {data.map((d) => {
          const isTop = strongest != null && d.weekday === strongest.weekday
          const h = d.completions === 0 ? 0 : Math.max(10, (d.completions / max) * 100)
          return (
            <div key={d.weekday} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-full w-full items-end">
                {d.completions === 0 ? (
                  <div className="h-0.5 w-full rounded-pill bg-ink-muted/15" />
                ) : (
                  <div
                    className={`chart-bar w-full rounded-t-[4px] bg-gradient-to-b from-accent-base to-accent-strong ${
                      isTop ? 'ring-1 ring-inset ring-accent-soft' : 'opacity-80'
                    }`}
                    style={{ height: `${h}%` }}
                    title={`${WEEKDAY_LONG[d.weekday]} — ${d.completions} done`}
                  />
                )}
              </div>
              <span className={`text-[10px] ${isTop ? 'text-ink-base' : 'text-ink-muted'}`}>
                {WEEKDAY_SHORT[d.weekday]}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        {strongest ? (
          <>
            Strongest day:{' '}
            <span className="text-ink-base">{WEEKDAY_LONG[strongest.weekday]}</span>
          </>
        ) : (
          'Finish a few tasks and your weekly rhythm shows up here.'
        )}
      </p>
    </div>
  )
}

/** Accent-opacity bucket for a heatmap cell (single-hue sequential ramp). */
function cellClass(count: number): string {
  if (count === 0) return 'bg-ink-muted/10'
  if (count === 1) return 'bg-accent-base/30'
  if (count <= 3) return 'bg-accent-base/55'
  if (count <= 5) return 'bg-accent-base/80'
  return 'bg-accent-base'
}

/**
 * Contribution heatmap — the long view of activity, one cell per day laid out
 * in weekly columns. Purely additive: cells only ever brighten with work, an
 * empty day is simply the dimmest step (no red, no "missed", P4/P8).
 */
export function Heatmap({ data }: { data: DayBucket[] }) {
  // Pad the front so the first column's rows line up with Sun…Sat.
  const lead = data.length > 0 ? new Date(data[0].dayMs).getDay() : 0

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto pb-1">
        <div className="grid grid-flow-col grid-rows-7 gap-0.5" style={{ width: 'max-content' }}>
          {Array.from({ length: lead }, (_, i) => (
            <div key={`pad-${i}`} className="size-3 rounded-[3px]" aria-hidden="true" />
          ))}
          {data.map((d) => (
            <div
              key={d.dayMs}
              className={`chart-cell size-3 rounded-[3px] ${cellClass(d.completions)}`}
              title={`${dayLabel(d.dayMs)} — ${d.completions} done`}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-ink-muted">
        <span>Quiet</span>
        <span className="size-2.5 rounded-[3px] bg-ink-muted/10" />
        <span className="size-2.5 rounded-[3px] bg-accent-base/30" />
        <span className="size-2.5 rounded-[3px] bg-accent-base/55" />
        <span className="size-2.5 rounded-[3px] bg-accent-base/80" />
        <span className="size-2.5 rounded-[3px] bg-accent-base" />
        <span>Busy</span>
      </div>
    </div>
  )
}

const RING_RADIUS = 52
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

/**
 * Focus dial — an ambient ring (the app's time-shape language, P3). The arc is
 * actual-focus ÷ planned-focus: a full ring means you focus about as long as
 * you plan. A lighter overflow arc shows the slice beyond plan. Center carries
 * the total time focused.
 */
export function StatRing({
  actualMs,
  plannedMs,
  centerLabel,
  caption,
}: {
  actualMs: number
  plannedMs: number
  centerLabel: string
  caption: string
}) {
  const ratio = plannedMs > 0 ? actualMs / plannedMs : 0
  const primary = useEntrance(Math.min(1, ratio))
  const overflow = useEntrance(Math.min(1, Math.max(0, ratio - 1)))

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
          <circle cx="60" cy="60" r={RING_RADIUS} strokeWidth="9" className="fill-none stroke-surface-overlay" />
          {overflow > 0 && (
            <circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - overflow)}
              className="fill-none stroke-accent-soft/60 transition-[stroke-dashoffset] duration-celebrate ease-standard motion-reduce:transition-none"
            />
          )}
          <circle
            cx="60"
            cy="60"
            r={RING_RADIUS}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - primary)}
            className="fill-none stroke-accent-base transition-[stroke-dashoffset] duration-celebrate ease-standard motion-reduce:transition-none"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-xl leading-none text-ink-strong">{centerLabel}</span>
        </div>
      </div>
      <p className="text-center text-xs text-ink-muted">{caption}</p>
    </div>
  )
}

/** Single-hue magnitude meter: accent fill on a surface track, rounded ends. */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div
      className="mt-1 h-1.5 overflow-hidden rounded-pill bg-surface-raised"
      role="progressbar"
      aria-label={`${label} facts unlocked`}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div
        className="h-full rounded-pill bg-accent-base transition-[width] duration-celebrate ease-standard motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
