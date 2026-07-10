import { THEMES, type ThemeMeta } from '../ui/tokens'

/**
 * Theme unlocks are derived purely from level (event-sourced, nothing to
 * store, P4/P7). A theme is unlocked once you've reached its milestone level;
 * unlocked themes never re-lock.
 */

export interface ThemeState extends ThemeMeta {
  unlocked: boolean
  /** For locked themes: how many levels until it opens (anticipation, P6). */
  levelsAway: number
}

export function themeStates(level: number): ThemeState[] {
  return THEMES.map((t) => ({
    ...t,
    unlocked: level >= t.unlockLevel,
    levelsAway: Math.max(0, t.unlockLevel - level),
  }))
}

export function isThemeUnlocked(themeId: string, level: number): boolean {
  const theme = THEMES.find((t) => t.id === themeId)
  return !!theme && level >= theme.unlockLevel
}

/** The theme a level just unlocked, if any — for a celebratory nudge. */
export function themeUnlockedAtLevel(level: number): ThemeMeta | undefined {
  return THEMES.find((t) => t.unlockLevel === level)
}
