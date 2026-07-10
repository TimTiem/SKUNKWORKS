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
 * Level titles — competence cues ("you're getting better at running your
 * life"), cosmetic only (P7). One per level, Wave 1 scope.
 */
const TITLES = [
  'Recruit',
  'Spark',
  'Mover',
  'Doer',
  'Momentum',
  'Operator',
  'Tactician',
  'Finisher',
  'Strategist',
  'Veteran',
  'Pathfinder',
  'Vanguard',
]

export function titleForLevel(level: number): string {
  return TITLES[level - 1] ?? `Legend ${level - TITLES.length}`
}
