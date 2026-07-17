import type {
  CoinLedgerRow,
  CompletionRow,
  FocusSessionRow,
  RedemptionRow,
  TaskRow,
} from '../types/rows'

/**
 * Aggregate stats for the Settings statistics panel — all derived live from
 * the append-only logs (Decision 1). Every number here only ever GROWS with
 * use (P4) and is framed neutrally: this is a trophy cabinet, never a report
 * card (P8 — no shame, no "you're behind"). Pure + unit-tested.
 */

const DAY_MS = 86_400_000

export interface AppStats {
  totalCompletions: number
  /** Completions finished from a focus session. */
  focusCompletions: number
  /** Completions that rolled the 2× XP crit. */
  critCount: number
  /** XP earned through play (excludes the endowed start). */
  xpEarned: number
  coinsEarned: number
  coinsSpent: number
  /** Paid redemptions (coins_spent > 0). */
  rewardsRedeemed: number
  /** Free-reward drops (coins_spent === 0). */
  freeDrops: number
  focusSessions: number
  focusMsTotal: number
  focusMsPlanned: number
  avgFocusMs: number
  openTasks: number
  completions7d: number
  completions30d: number
  xp7d: number
}

function within(iso: string, nowMs: number, days: number): boolean {
  return new Date(iso).getTime() >= nowMs - days * DAY_MS
}

/** Local calendar midnight (ms) for a timestamp — the app is single-user, so
 * "today" means the user's device day, not UTC. */
export function startOfLocalDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export interface DayBucket {
  /** Local start-of-day (ms) — a stable key across DST (both sides normalize). */
  dayMs: number
  completions: number
  xp: number
}

/**
 * Completions + XP bucketed into the last `days` local calendar days, oldest
 * first, INCLUDING empty days (so a chart renders a continuous timeline, never
 * a gappy one). Days are walked by calendar date, so a DST shift never drops or
 * doubles a day. Pure — the productivity charts read straight from this.
 */
export function dailyActivity(
  completions: readonly CompletionRow[],
  nowMs: number,
  days: number,
): DayBucket[] {
  const buckets: DayBucket[] = []
  const byDay = new Map<number, DayBucket>()
  const cursor = new Date(startOfLocalDay(nowMs))
  cursor.setDate(cursor.getDate() - (days - 1))
  for (let i = 0; i < days; i++) {
    const bucket: DayBucket = { dayMs: startOfLocalDay(cursor.getTime()), completions: 0, xp: 0 }
    buckets.push(bucket)
    byDay.set(bucket.dayMs, bucket)
    cursor.setDate(cursor.getDate() + 1)
  }
  for (const c of completions) {
    if (c.deleted_at !== null) continue
    const bucket = byDay.get(startOfLocalDay(new Date(c.completed_at).getTime()))
    if (!bucket) continue
    bucket.completions++
    bucket.xp += c.xp_awarded
  }
  return buckets
}

export interface WeekdayBucket {
  /** 0 = Sunday … 6 = Saturday (JS getDay). */
  weekday: number
  completions: number
  xp: number
}

/** Lifetime completions grouped by day-of-week — surfaces the user's natural
 * rhythm ("your strongest day"), a productivity insight, never a target. */
export function weekdayRhythm(completions: readonly CompletionRow[]): WeekdayBucket[] {
  const buckets: WeekdayBucket[] = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    completions: 0,
    xp: 0,
  }))
  for (const c of completions) {
    if (c.deleted_at !== null) continue
    const bucket = buckets[new Date(c.completed_at).getDay()]
    bucket.completions++
    bucket.xp += c.xp_awarded
  }
  return buckets
}

export function computeAppStats(args: {
  completions: readonly CompletionRow[]
  ledger: readonly CoinLedgerRow[]
  redemptions: readonly RedemptionRow[]
  focusSessions: readonly FocusSessionRow[]
  tasks: readonly TaskRow[]
  nowMs: number
}): AppStats {
  const { nowMs } = args
  const completions = args.completions.filter((c) => c.deleted_at === null)
  const focusSessions = args.focusSessions.filter((f) => f.deleted_at === null)
  const redemptions = args.redemptions.filter((r) => r.deleted_at === null)

  let xpEarned = 0
  let critCount = 0
  let focusCompletions = 0
  let completions7d = 0
  let completions30d = 0
  let xp7d = 0
  for (const c of completions) {
    xpEarned += c.xp_awarded
    if (c.multiplier > 1) critCount++
    if (c.focus_session_id != null) focusCompletions++
    if (within(c.completed_at, nowMs, 7)) {
      completions7d++
      xp7d += c.xp_awarded
    }
    if (within(c.completed_at, nowMs, 30)) completions30d++
  }

  let coinsEarned = 0
  let coinsSpent = 0
  for (const e of args.ledger.filter((x) => x.deleted_at === null)) {
    if (e.delta > 0) coinsEarned += e.delta
    else coinsSpent += -e.delta
  }

  const focusMsTotal = focusSessions.reduce((s, f) => s + (f.actual_ms ?? 0), 0)
  const focusMsPlanned = focusSessions.reduce((s, f) => s + f.planned_ms, 0)

  return {
    totalCompletions: completions.length,
    focusCompletions,
    critCount,
    xpEarned,
    coinsEarned,
    coinsSpent,
    rewardsRedeemed: redemptions.filter((r) => r.coins_spent > 0).length,
    freeDrops: redemptions.filter((r) => r.coins_spent === 0).length,
    focusSessions: focusSessions.length,
    focusMsTotal,
    focusMsPlanned,
    avgFocusMs: focusSessions.length ? Math.round(focusMsTotal / focusSessions.length) : 0,
    openTasks: args.tasks.filter((t) => t.deleted_at === null && t.status === 'open').length,
    completions7d,
    completions30d,
    xp7d,
  }
}
