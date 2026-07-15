import { useEffect, useState } from 'react'
import { db } from '../../db/db'
import { titleForLevel } from '../../domain/levels'
import { celebrationClass } from '../../ui/motion/celebrate'
import { useStats } from './useStats'
import { getLastSeenXp, setLastSeenXp } from './xpMemory'

/**
 * Always-visible progress header: level + title (competence cue), the XP bar
 * (endowed — never rendered empty, P6), "N to next level", and the quiet
 * coin count. Rewards pop instantly from local state (P1); a level-up gets
 * the bigger, milestone-tier moment (FR-27).
 */
export function XpBar() {
  const stats = useStats()
  const [pop, setPop] = useState<{
    text: string
    level: boolean
    crit: boolean
    seq: number
  } | null>(null)

  const xp = stats?.totalXp
  const level = stats?.level
  useEffect(() => {
    if (xp === undefined || level === undefined) return
    const before = getLastSeenXp()
    setLastSeenXp({ xp, level })
    if (!before) return
    // Reacting to the Dexie live-query store (an external system) is exactly
    // what an effect is for; the transient pop is derived from that change.
    const push = (next: { text: string; level: boolean; crit: boolean }) =>
      setPop((p) => ({ ...next, seq: (p?.seq ?? 0) + 1 }))
    if (level > before.level) {
      push({ text: `Level ${level} — ${titleForLevel(level)}!`, level: true, crit: false })
    } else if (xp > before.xp) {
      const gained = xp - before.xp
      // A crit deserves its own moment (variable reward, P6) — check whether
      // the freshest completion in the log rolled one.
      void db.completions
        .orderBy('completed_at')
        .last()
        .then((latest) => {
          const crit = (latest?.multiplier ?? 1) > 1
          push({ text: crit ? `CRIT ×2 — +${gained} XP` : `+${gained} XP`, level: false, crit })
        })
    }
  }, [xp, level])

  useEffect(() => {
    if (!pop) return
    const timer = setTimeout(() => setPop(null), pop.level ? 2600 : pop.crit ? 2200 : 1400)
    return () => clearTimeout(timer)
  }, [pop])

  if (!stats) return null

  return (
    <section aria-label="Progress" className="relative rounded-card bg-surface-raised p-3 shadow-card">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-display tracking-wider text-ink-strong">
          Lv {stats.level} · {titleForLevel(stats.level)}
        </span>
        <span className="text-ink-muted">
          {stats.toNext} XP to Lv {stats.level + 1}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Level progress"
        aria-valuemin={0}
        aria-valuemax={stats.span}
        aria-valuenow={stats.intoLevel}
        className="mt-2 h-2.5 overflow-hidden rounded-pill bg-surface-overlay"
      >
        <div
          className="xp-sheen h-full rounded-pill bg-xp transition-[width] duration-celebrate ease-standard motion-reduce:transition-none"
          // Endowed progress (P6): even a fresh level shows a living sliver.
          style={{ width: `${Math.max(4, stats.fraction * 100)}%` }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-xs text-ink-muted">
        <span>{stats.totalXp} XP</span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-2 rounded-pill bg-coin" />
          {stats.coinBalance} coins
        </span>
      </div>

      {pop && (
        <p
          key={pop.seq}
          role="status"
          className={`absolute -top-3 right-3 rounded-pill px-3 py-1 text-sm font-semibold shadow-pop ${
            // Level-ups rotate the celebration set by level; a crit slams in
            // like a stamp; everyday +XP pops stay the quick, consistent pop.
            pop.level ? celebrationClass(stats.level) : pop.crit ? 'celebrate-stamp' : 'celebrate-pop'
          } ${
            pop.level || pop.crit
              ? 'bg-accent-strong text-accent-ink'
              : 'bg-surface-overlay text-accent-soft'
          }`}
        >
          {pop.text}
        </p>
      )}
    </section>
  )
}
