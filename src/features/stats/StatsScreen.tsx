import { useLiveQuery } from 'dexie-react-hooks'
import type { ReactNode } from 'react'
import { CATEGORY_LABEL } from '../../content/facts/facts'
import { db } from '../../db/db'
import { collectFacts, collectionTotals } from '../../domain/factCollection'
import { titleForLevel } from '../../domain/levels'
import { computeAppStats, dailyActivity, weekdayRhythm } from '../../domain/stats'
import { focusTimeSense, tendencyLabel } from '../../domain/timeSense'
import { useNow } from '../../hooks/useNow'
import { formatDurationMs } from '../../lib/time'
import { useStats } from '../gamification/useStats'
import { ActivityBars, Heatmap, Meter, StatRing, WeekdayBars } from './charts'

const ACTIVITY_DAYS = 14
const HEATMAP_DAYS = 84 // 12 weeks

/**
 * The productivity dashboard (its own view since v1.6): a live, forgiving read
 * of how the work is actually going — momentum, rhythm, focus, and the long
 * arc — derived entirely from the append-only logs (Decision 1). Every number
 * only ever grows (P4); nothing is framed as a miss, a deadline, or a broken
 * streak (P8). The layout is a responsive dashboard grid: one column on a phone,
 * filling out to three on a wide desktop / ultrawide screen.
 */
export function StatsScreen() {
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

  const live = completions.filter((c) => c.deleted_at === null)
  const s = computeAppStats({ completions, ledger, redemptions, focusSessions, tasks, nowMs })
  const collections = collectFacts(new Set(factUnlocks.map((f) => f.fact_id)))
  const factTotals = collectionTotals(collections)
  const ts = focusTimeSense(focusSessions)

  const bars = dailyActivity(live, nowMs, ACTIVITY_DAYS)
  const heat = dailyActivity(live, nowMs, HEATMAP_DAYS)
  const rhythm = weekdayRhythm(live)

  const sum = (arr: typeof bars, key: 'completions' | 'xp') =>
    arr.reduce((n, b) => n + b[key], 0)
  const last7 = sum(bars.slice(7), 'completions')
  const prev7 = sum(bars.slice(0, 7), 'completions')
  const xpLast7 = sum(bars.slice(7), 'xp')
  const trendingUp = prev7 > 0 && last7 > prev7

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Level" value={String(stats.level)} sub={titleForLevel(stats.level)} accent />
        <Tile label="Total XP" value={stats.totalXp.toLocaleString()} />
        <Tile label="Completed" value={s.totalCompletions.toLocaleString()} />
        <Tile label="Open now" value={String(s.openTasks)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Momentum" className="lg:col-span-2">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-3xl leading-none text-ink-strong">
                {last7}
                <span className="ml-1.5 text-base text-ink-muted">done this week</span>
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                +{xpLast7.toLocaleString()} XP over the last 7 days
              </p>
            </div>
            {trendingUp && (
              <span className="shrink-0 rounded-pill bg-accent-strong px-2.5 py-1 text-xs font-semibold text-accent-ink">
                ▲ {last7 - prev7} vs last week
              </span>
            )}
          </div>
          <ActivityBars data={bars} />
          <p className="mt-2 text-[11px] uppercase tracking-wide text-ink-muted">
            Completions · last {ACTIVITY_DAYS} days
          </p>
        </Card>

        <Card title="Focus">
          <StatRing
            actualMs={s.focusMsTotal}
            plannedMs={s.focusMsPlanned}
            centerLabel={formatDurationMs(s.focusMsTotal)}
            caption={
              s.focusSessions > 0
                ? `${s.focusSessions} session${s.focusSessions === 1 ? '' : 's'} focused`
                : 'No focus sessions yet'
            }
          />
          <p className="mt-2 text-center text-xs text-ink-muted">{tendencyLabel(ts.ratio)}</p>
        </Card>

        <Card title="Weekly rhythm">
          <WeekdayBars data={rhythm} />
        </Card>

        <Card title="Activity · last 12 weeks" className="lg:col-span-2">
          <Heatmap data={heat} />
        </Card>

        <Card title="Lifetime" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Mini label="Coins earned" value={s.coinsEarned.toLocaleString()} />
            <Mini label="Coins spent" value={s.coinsSpent.toLocaleString()} />
            <Mini label="Rewards redeemed" value={String(s.rewardsRedeemed)} />
            <Mini label="Free drops" value={String(s.freeDrops)} />
            <Mini label="2× crits landed" value={String(s.critCount)} />
            <Mini label="Finished in focus" value={String(s.focusCompletions)} />
          </div>
        </Card>

        <Card title="Facts unlocked">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs text-ink-muted">across {collections.length} fields</span>
            <span className="text-sm text-ink-strong">
              {factTotals.seen} / {factTotals.total}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
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
        </Card>
      </div>
    </div>
  )
}

function Card({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`flex flex-col rounded-card bg-surface-raised p-4 shadow-card ${className}`}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h3>
      {children}
    </section>
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
    <div className={`rounded-card p-3 ${accent ? 'bg-accent-strong text-accent-ink' : 'bg-surface-raised shadow-card'}`}>
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
