import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from '../../db/db'
import { setMeta } from '../../db/meta'
import { isThemeUnlocked } from '../../domain/themes'
import { DEFAULT_THEME } from '../../ui/tokens'

const THEME_KEY = 'selected_theme'

/**
 * Applies the selected theme by flipping `data-theme` on <html> (the CSS
 * for every theme is already in the bundle). Device-local preference in
 * `meta` — a cosmetic choice, not synced app data. Falls back to the default
 * if the stored theme isn't unlocked at the current level (safety).
 */
export function useTheme(level: number): {
  themeId: string
  setTheme: (id: string) => void
} {
  const row = useLiveQuery(() => db.meta.get(THEME_KEY), [])
  const stored = (row?.value as string | undefined) ?? DEFAULT_THEME
  const themeId = isThemeUnlocked(stored, level) ? stored : DEFAULT_THEME

  useEffect(() => {
    document.documentElement.dataset.theme = themeId
  }, [themeId])

  return {
    themeId,
    setTheme: (id: string) => void setMeta(THEME_KEY, id),
  }
}
