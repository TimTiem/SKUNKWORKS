import { useLiveQuery } from 'dexie-react-hooks'
import type { ReactNode } from 'react'
import { CATEGORY_LABEL } from '../../content/facts/facts'
import { db } from '../../db/db'
import { collectFacts, collectionTotals } from '../../domain/factCollection'
import { titleForLevel } from '../../domain/levels'
import { computeAppStats } from '../../domain/stats'
import { focusTimeSense, tendencyLabel } from '../../domain/timeSense'
import { useNow } from '../../hooks/useNow'
import { formatDurationMs } from '../../lib/time'
import { useStats } from '../gamification/useStats'

/**
 * The statistics panel (Settings): a trophy cabinet derived live from the
 * append-only logs — headline tiles, lifetime tallies, focus + time-sense,
 * recent activity, and a facts-by-category breakdown. Everything only grows
 * (P4); nothing is framed as a miss or a deadline (P8). No streak surface —
 * Tim vetoed those. Charts here are the right "form": mostly stat tiles, plus
 * single-hue magnitude meters for the fact categories (dataviz method).
 */
export function StatsPanel() {
  const completions = useLiveQuery(() => db.completions.toArray(), [])
  const ledger = useLiveQuery(() => db.coin_ledger.toArray(), [])
  const redemptions = useLiveQuery(() => db.redemptions.toArray(), [])
  const focusSessions = useLiveQuery(() => db.focus_sessions.toArray(), [])
  const factUnlocks = useLiveQuery(
    () => db.fact_unlocks.filter((f) => f.deleted_at === null).toArray(),
    [],
  )
  const tasks = useLiveQuery(() => db.tasks.toArray(), [])
  const stats = useStats()
  const nowMs = useNow() // render-pure wall clock (react-hooks v7 purity rule)

  if (
    !completions ||
    !ledger ||
    !redemptions ||
    !focusSessions ||
    !factUnlocks ||
    !tasks ||
    !stats
  ) {
    return null
  }

  const s = computeAppStats({
    completions,
    ledger,
    redemptions,
    focusSessions,
    tasks,
    nowMs,
  })
  const collections = collectFacts(new Set(factUnlocks.map((f) => f.fact_id)))
  const factTotals = collectionTotals(collections)
  const ts = focusTimeSense(focusSessions)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Level" value={String(stats.level)} sub={titleForLevel(stats.level)} accent />
        <Tile label="Total XP" value={stats.totalXp.toLocaleString()} />
        <Tile label="Completed" value={s.totalCompletions.toLocaleString()} />
        <Tile label="Coins now" value={stats.coinBalance.toLocaleString()} />
      </div>

      <Group title="Lifetime">
        <Mini label="Coins earned" value={s.coinsEarned.toLocaleString()} />
        <Mini label="Coins spent" value={s.coinsSpent.toLocaleString()} />
        <Mini label="Rewards redeemed" value={String(s.rewardsRedeemed)} />
        <Mini label="Free drops" value={String(s.freeDrops)} />
        <Mini label="2× crits landed" value={String(s.critCount)} />
        <Mini label="Finished in focus" value={String(s.focusCompletions)} />
      </Group>

      <Group title="Focus">
        <Mini label="Sessions" value={String(s.focusSessions)} />
        <Mini label="Time focused" value={formatDurationMs(s.focusMsTotal)} />
        <Mini label="Avg session" value={s.focusSessions ? formatDurationMs(s.avgFocusMs) : '—'} />
      </Group>
      <p className="text-sm text-ink-base">{tendencyLabel(ts.ratio)}</p>

      <Group title="Recent activity">
        <Mini label="Done · last 7 days" value={String(s.completions7d)} />
        <Mini label="XP · last 7 days" value={`+${s.xp7d}`} />
        <Mini label="Done · last 30 days" value={String(s.completions30d)} />
      </Group>

      <div className="rounded-card bg-surface-overlay/50 p-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Facts unlocked
          </h3>
          <span className="text-sm text-ink-strong">
            {factTotals.seen} / {factTotals.total}
          </span>
        </div>
        <ul className="mt-2 flex flex-col gap-2">
          {collections.map((c) => (
            <li key={c.category}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-ink-base">{CATEGORY_LABEL[c.category]}</span>
                <span className="text-ink-muted">
                  {c.seen}/{c.total}
                </span>
              </div>
              <Meter value={c.seen} max={c.total} label={CATEGORY_LABEL[c.category]} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-card p-3 ${accent ? 'bg-accent-strong text-accent-ink' : 'bg-surface-overlay/60'}`}>
      <p className={`text-xs uppercase tracking-wide ${accent ? 'opacity-80' : 'text-ink-muted'}`}>
        {label}
      </p>
      <p className={`font-display text-2xl leading-tight ${accent ? '' : 'text-ink-strong'}`}>
        {value}
      </p>
      {sub && <p className={`text-xs ${accent ? 'opacity-80' : 'text-ink-muted'}`}>{sub}</p>}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-control bg-surface-overlay/50 px-3 py-2">
      <span className="font-display text-lg leading-tight text-ink-strong">{value}</span>
      <span className="text-xs text-ink-muted">{label}</span>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{children}</div>
    </div>
  )
}

/** Single-hue magnitude meter: accent fill on a surface track, rounded ends. */
function Meter({ value, max, label }: { value: number; max: number; label: string }) {
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
