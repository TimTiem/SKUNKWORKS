import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { META_KEYS, setMeta } from '../../db/meta'
import { APP_VERSION } from '../../lib/version'
import { whatsNewFor } from './whatsNew'

/**
 * Shows the current version's changelog once, after an update. Dismissing
 * records the version so it never reappears. Rendered only in the Shell's
 * non-focus branch, so it can never interrupt a focus session (FR-59).
 */
export function WhatsNewCard() {
  // `?? null` distinguishes "loading" (undefined) from "never dismissed" (null),
  // so an already-seen update doesn't flash the card before the query resolves.
  const seen = useLiveQuery(
    async () => (await db.meta.get(META_KEYS.whatsNewSeen))?.value ?? null,
    [],
  )
  const entry = whatsNewFor(APP_VERSION)
  if (!entry || seen === undefined || seen === APP_VERSION) return null

  return (
    <div className="motion-enter rounded-card border border-accent-base/40 bg-surface-raised p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm tracking-wider text-accent-soft">
          What’s new · v{APP_VERSION}
        </h2>
        <button
          type="button"
          onClick={() => void setMeta(META_KEYS.whatsNewSeen, APP_VERSION)}
          className="text-sm text-ink-muted underline-offset-2 hover:text-ink-base hover:underline"
        >
          Dismiss
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {entry.items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-ink-base">
            <span aria-hidden="true" className="text-accent-base">
              ›
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
