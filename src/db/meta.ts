import { db } from './db'

/** Well-known keys in the local `meta` store (PRD §6.6). */
export const META_KEYS = {
  schemaVersion: 'schema_version',
  appVersion: 'app_version',
  lastSynced: 'last_synced',
  endowedApplied: 'endowed_applied',
  /** Device-local in-progress focus session (survives reload/lock). */
  activeFocus: 'active_focus',
  /** Device-local: are completion/reward feedback sounds on? Default true. */
  soundEnabled: 'sound_enabled',
  /** Device-local: the app version whose "What's new" has been dismissed. */
  whatsNewSeen: 'whats_new_seen',
} as const

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key)
  return row?.value as T | undefined
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}
