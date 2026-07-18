import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { META_KEYS, setMeta } from '../../db/meta'

/**
 * Device-local preference for the ambient focus soundscape (like the sound
 * mute — not synced; each device sets its own vibe). Defaults OFF so audio is
 * never a surprise; the user opts in from the focus screen.
 */
export function useSoundscapePref(): { enabled: boolean; toggle: () => void } {
  const row = useLiveQuery(async () => (await db.meta.get(META_KEYS.soundscapeEnabled)) ?? null, [])
  const enabled = row == null ? false : (row.value as boolean)
  const toggle = () => void setMeta(META_KEYS.soundscapeEnabled, !enabled)
  return { enabled, toggle }
}
