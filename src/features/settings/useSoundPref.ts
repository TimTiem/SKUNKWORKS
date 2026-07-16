import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from '../../db/db'
import { META_KEYS, setMeta } from '../../db/meta'
import { setSoundEnabled } from '../../ui/feedback'

/**
 * Device-local sound pref (like the theme choice — not synced; each device
 * decides its own vibe). Defaults ON. Keeps the feedback module's synchronous
 * mute flag in step, so a completion tap reads the right value with no await.
 */
export function useSoundPref(): { enabled: boolean; toggle: () => void } {
  // `?? null` distinguishes "loading" (undefined) from "absent" (null → default on).
  const row = useLiveQuery(async () => (await db.meta.get(META_KEYS.soundEnabled)) ?? null, [])
  const enabled = row == null ? true : (row.value as boolean)

  useEffect(() => {
    setSoundEnabled(enabled)
  }, [enabled])

  const toggle = () => void setMeta(META_KEYS.soundEnabled, !enabled)
  return { enabled, toggle }
}
