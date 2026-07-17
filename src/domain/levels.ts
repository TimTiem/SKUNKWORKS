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
 * Level titles + epitaphs — a Souls-flavoured rank on an ascending "rekindling"
 * arc: a cold ember coaxed, level by level, into an unfading flame (the fire is
 * momentum — the thing this app manufactures). Titles are competence cues,
 * cosmetic only (P7). The tone borrows Dark Souls' *gravitas* — solemn, mythic,
 * weathered — but never its cruelty: every line is ascendant and earned, never
 * a death, failure, or shame state (P8). The flame only ever grows (P4).
 *
 * Each level carries a `title` (short, shown in the header/stats) and an
 * `epitaph` (a one-line inscription, revealed at the level-up moment).
 */
interface Rank {
  title: string
  epitaph: string
}

const RANKS: Rank[] = [
  { title: 'Ashborn', epitaph: 'From cold ash, the first spark stirs.' },
  { title: 'Ember-Touched', epitaph: 'A faint warmth answers the dark.' },
  { title: 'Kindler', epitaph: 'You have learned to coax the flame.' },
  { title: 'Flamebearer', epitaph: 'The fire walks where you walk.' },
  { title: 'Emberwright', epitaph: 'You forge warmth from will alone.' },
  { title: 'Ward of Cinders', epitaph: 'The dark keeps its distance now.' },
  { title: 'Ashen Knight', epitaph: 'Tempered, unhurried, certain.' },
  { title: 'Pyrekeeper', epitaph: 'Others warm themselves at your fire.' },
  { title: 'Flamewright', epitaph: 'You bend the blaze to purpose.' },
  { title: 'Cinderlord', epitaph: 'The long dark remembers your name.' },
  { title: 'Ashen Sovereign', epitaph: 'Dominion, earned ember by ember.' },
  { title: 'The Everburning', epitaph: 'A fire that has forgotten how to fade.' },
  { title: 'Firstflame', epitaph: 'You are the warmth the world was named for.' },
  { title: 'Undying Beacon', epitaph: 'Seen from every distant dark.' },
  { title: 'Age of Fire', epitaph: 'History turns to your rekindling.' },
]

/** Past the curated arc the flame is already eternal — grand, distinct, endless. */
const OVERFLOW_TITLE = 'Everburning'
const OVERFLOW_EPITAPH = 'The flame outlasts the counting of ages.'

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
