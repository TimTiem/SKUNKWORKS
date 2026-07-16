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
