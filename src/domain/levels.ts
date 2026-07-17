/**
 * Level curve (CLAUDE.md → gamification numbers): cumulative XP to REACH each
 * level; front-loaded so early levels land in days, then a gentle late game.
 * Beyond level 10 each delta grows by +90 per level.
 */

/** Cumulative XP thresholds for levels 1..10. */
const BASE = [0, 60, 150, 280, 460, 700, 1000, 1370, 1820, 2360]
const LATE_GAME_DELTA_GROWTH = 90

/** Total XP required to reach `level`. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  if (level <= BASE.length) return BASE[level - 1]
  let total = BASE[BASE.length - 1]
  let delta = BASE[BASE.length - 1] - BASE[BASE.length - 2]
  for (let l = BASE.length + 1; l <= level; l++) {
    delta += LATE_GAME_DELTA_GROWTH
    total += delta
  }
  return total
}

export function levelFromXp(totalXp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= totalXp) level++
  return level
}

export interface LevelProgress {
  level: number
  /** XP earned inside the current level. */
  intoLevel: number
  /** XP span of the current level. */
  span: number
  /** "N to next level" (P6). */
  toNext: number
  /** 0..1 through the current level. */
  fraction: number
}

export function levelProgress(totalXp: number): LevelProgress {
  const level = levelFromXp(totalXp)
  const floor = xpForLevel(level)
  const ceil = xpForLevel(level + 1)
  return {
    level,
    intoLevel: totalXp - floor,
    span: ceil - floor,
    toNext: ceil - totalXp,
    fraction: (totalXp - floor) / (ceil - floor),
  }
}

/**
 * Level titles + epitaphs — a Souls-flavoured rank on an ascending arc of
 * *competence*: breaking inertia → sustaining focus → executing → following
 * through → mastering your own time. Each name is an earned epithet for a
 * productivity virtue; the app's whole job (starting and finishing) is the myth.
 * Titles are competence cues, cosmetic only (P7). The tone borrows Dark Souls'
 * *gravitas* — solemn, mythic, weathered — but never its cruelty: every line is
 * ascendant and earned, never a death, failure, or shame state (P4/P8).
 *
 * Each level carries a `title` (short, shown in the header/stats) and an
 * `epitaph` (a one-line inscription, revealed at the level-up moment).
 */
interface Rank {
  title: string
  epitaph: string
}

const RANKS: Rank[] = [
  { title: 'The Roused', epitaph: 'The long stillness breaks; you move.' },
  { title: 'Breaker of Inertia', epitaph: 'What would not budge now yields to you.' },
  { title: 'The Steadfast', epitaph: 'You return to the work, and return again.' },
  { title: 'Warden of the Hour', epitaph: 'Time answers to your keeping now.' },
  { title: 'The Unwavering', epitaph: 'Distraction finds no purchase here.' },
  { title: 'Hand of Execution', epitaph: 'Intent becomes deed in your grip.' },
  { title: 'Keeper of Vows', epitaph: 'What you swear to do is done.' },
  { title: 'The Relentless', epitaph: 'You do not tire; you do not stop.' },
  { title: 'Closer of Loops', epitaph: 'Nothing you begin is left to rot.' },
  { title: 'The Ironwilled', epitaph: 'Your resolve outlasts the resistance.' },
  { title: 'Bane of the Undone', epitaph: 'The unfinished fears your coming.' },
  { title: 'Sovereign of Focus', epitaph: 'Your attention is a throne none may storm.' },
  { title: 'The Unburdened', epitaph: 'You carry much, yet nothing weighs you down.' },
  { title: 'Architect of Days', epitaph: 'You do not spend your hours — you forge them.' },
  { title: 'The Accomplished', epitaph: 'A legend is only a task that someone finished.' },
]

/** Past the curated arc, mastery keeps climbing — grand, distinct, endless. */
const OVERFLOW_TITLE = 'Paragon'
const OVERFLOW_EPITAPH = 'Mastery keeps no final rank.'

function rankForLevel(level: number): Rank {
  return (
    RANKS[level - 1] ?? {
      title: `${OVERFLOW_TITLE} ${level - RANKS.length}`,
      epitaph: OVERFLOW_EPITAPH,
    }
  )
}

export function titleForLevel(level: number): string {
  return rankForLevel(level).title
}

/** The one-line inscription for a level — revealed at the level-up moment. */
export function epitaphForLevel(level: number): string {
  return rankForLevel(level).epitaph
}
