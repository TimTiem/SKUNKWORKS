/** ISO timestamp for local echoes. Server-authoritative fields get restamped on push. */
export const nowISO = (): string => new Date().toISOString()

const DAY_MS = 86_400_000

const startOfDay = (ms: number) => {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Quiet relative deadline label — informational, never alarming (P8):
 * "due today" / "due tomorrow" / "due in 5d" / "was due Mon 3 Jul".
 */
export function dueLabel(dueAtIso: string, nowMs: number): string {
  const days = Math.round((startOfDay(new Date(dueAtIso).getTime()) - startOfDay(nowMs)) / DAY_MS)
  if (days === 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  if (days > 1) return `due in ${days}d`
  const when = new Date(dueAtIso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  return `was due ${when}`
}

/** ms → compact human duration: "0m" / "45m" / "1h" / "1h 5m". */
export function formatDurationMs(ms: number): string {
  const totalMin = Math.round(ms / 60_000)
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** A minutes <input> value → estimate_ms (null when blank / not a positive number). */
export function minutesToMs(value: string): number | null {
  const n = Number(value.trim())
  return Number.isFinite(n) && n > 0 ? Math.round(n) * 60_000 : null
}

/** estimate_ms → a minutes string for an <input type="number"> ('' when null). */
export function msToMinutesInput(ms: number | null): string {
  return ms == null ? '' : String(Math.round(ms / 60_000))
}

/** <input type="date"> value ("2026-07-14") → end-of-day ISO, local time. */
export function dateInputToDueIso(value: string): string | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59).toISOString()
}

/** ISO → <input type="date"> value in local time. */
export function dueIsoToDateInput(dueAtIso: string | null): string {
  if (!dueAtIso) return ''
  const d = new Date(dueAtIso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
