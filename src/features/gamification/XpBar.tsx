import { useEffect, useRef, useState } from 'react'
import { titleForLevel } from '../../domain/levels'
import { useStats } from './useStats'

/**
 * Always-visible progress header: level + title (competence cue), the XP bar
 * (endowed — never rendered empty, P6), "N to next level", and the quiet
 * coin count. Rewards pop instantly from local state (P1); a level-up gets
 * the bigger, milestone-tier moment (FR-27).
 */
export function XpBar() {
  const stats = useStats()
  const [pop, setPop] = useState<{ text: string; level: boolean; seq: number } | null>(null)
  const prev = useRef<{ xp: number; level: number } | null>(null)

  const xp = stats?.totalXp
  const level = stats?.level
  useEffect(() => {
    if (xp === undefined || level === undefined) return
    const before = prev.current
    prev.current = { xp, level }
    if (!before) return
    if (level > before.level) {
      setPop((p) => ({
        text: `Level ${level} — ${titleForLevel(level)}!`,
        level: true,
        seq: (p?.seq ?? 0) + 1,
      }))
    } else if (xp > before.xp) {
      setPop((p) => ({ text: `+${xp - before.xp} XP`, level: false, seq: (p?.seq ?? 0) + 1 }))
    }
  }, [xp, level])

  useEffect(() => {
    if (!pop) return
    const timer = setTimeout(() => setPop(null), pop.level ? 2600 : 1400)
    return () => clearTimeout(timer)
  }, [pop])

  if (!stats) return null

  return (
    <section aria-label="Progress" className="relative rounded-card bg-surface-raised p-3 shadow-card">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-ink-strong">
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
          className="h-full rounded-pill bg-xp transition-[width] duration-celebrate ease-standard motion-reduce:transition-none"
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
          className={`celebrate-pop absolute -top-3 right-3 rounded-pill px-3 py-1 text-sm font-semibold shadow-pop ${
            pop.level ? 'bg-accent-base text-ink-strong' : 'bg-surface-overlay text-accent-soft'
          }`}
        >
          {pop.text}
        </p>
      )}
    </section>
  )
}
