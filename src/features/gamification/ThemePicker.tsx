import { themeStates } from '../../domain/themes'
import { useStats } from './useStats'
import { useTheme } from './useTheme'

/**
 * Appearance picker: unlocked themes are selectable; locked ones show the
 * level they open at — anticipation, never a shame state (P6/P8).
 */
export function ThemePicker() {
  const stats = useStats()
  const { themeId, setTheme } = useTheme(stats?.level ?? 1)
  if (!stats) return null

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-muted">
        Themes unlock as you level up. Your look, your call — pick any you&apos;ve earned.
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {themeStates(stats.level).map((theme) => {
          const active = theme.id === themeId
          return (
            <li key={theme.id}>
              <button
                type="button"
                disabled={!theme.unlocked}
                aria-pressed={active}
                onClick={() => setTheme(theme.id)}
                data-theme={theme.id}
                className={`flex w-full items-center gap-2 rounded-card border px-3 py-3 text-left transition-colors duration-enter ease-standard disabled:opacity-50 ${
                  active ? 'border-accent-base bg-surface-overlay' : 'border-transparent bg-surface-raised'
                }`}
              >
                <span aria-hidden="true" className="inline-block size-5 shrink-0 rounded-pill bg-accent-base" />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink-strong">{theme.name}</span>
                  {!theme.unlocked && (
                    <span className="block text-xs text-ink-muted">Lv {theme.unlockLevel}</span>
                  )}
                  {active && <span className="block text-xs text-accent-soft">Active</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
