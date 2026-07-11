/** Synced tables, mirroring supabase/migrations/0001_init.sql. */

/** Conflict resolution: last-write-wins on server `updated_at`. */
export const MUTABLE_TABLES = ['tasks', 'task_links', 'rewards'] as const

/** Append-only: insert-only pushes, duplicates ignored, never conflict. */
export const LOG_TABLES = [
  'completions',
  'focus_sessions',
  'coin_ledger',
  'redemptions',
  'fact_unlocks',
] as const

export const ALL_SYNCED_TABLES: readonly string[] = [...MUTABLE_TABLES, ...LOG_TABLES]
