import { useLiveQuery } from 'dexie-react-hooks'
import { useSyncExternalStore } from 'react'
import { db } from '../../db/db'
import { setMeta } from '../../db/meta'
import {
  consumeInstallPromptEvent,
  getInstallPromptEvent,
  onInstallPromptChange,
} from './installPrompt'
import { installHintState, type InstallEnv } from './installState'

const DISMISSED_KEY = 'install_hint_dismissed'

function detectEnv(): Pick<InstallEnv, 'standalone' | 'ios'> {
  const nav = navigator as Navigator & { standalone?: boolean }
  return {
    standalone:
      nav.standalone === true || !!window.matchMedia?.('(display-mode: standalone)').matches,
    ios: /iPad|iPhone|iPod/.test(navigator.userAgent),
  }
}

/**
 * A quiet, dismiss-once card: install = works offline for good (iOS can
 * evict browser-tab storage) + opens full-screen. Never a modal, never
 * repeated after dismissal (P8).
 */
export function InstallHint({ envOverride }: { envOverride?: Partial<InstallEnv> }) {
  // `?? null` distinguishes "no row" (null) from "still loading" (undefined).
  const dismissedRow = useLiveQuery(async () => (await db.meta.get(DISMISSED_KEY)) ?? null, [])
  const promptEvent = useSyncExternalStore(onInstallPromptChange, getInstallPromptEvent)

  // Still loading the flag — render nothing rather than flash.
  if (dismissedRow === undefined) return null

  const state = installHintState({
    ...detectEnv(),
    hasPromptEvent: promptEvent !== null,
    dismissed: dismissedRow?.value === true,
    ...envOverride,
  })
  if (!state.show) return null

  const dismiss = () => void setMeta(DISMISSED_KEY, true)

  async function install() {
    const event = getInstallPromptEvent()
    if (!event) return
    await event.prompt()
    const choice = await event.userChoice
    consumeInstallPromptEvent()
    // Accepted or not, the moment was offered — don't ask again either way;
    // declining IS an answer (P8).
    if (choice.outcome === 'dismissed') dismiss()
  }

  return (
    <section
      aria-label="Install the app"
      className="motion-enter flex flex-wrap items-center justify-between gap-2 rounded-card bg-surface-raised p-3 text-sm shadow-card"
    >
      <p className="min-w-0 flex-1 text-ink-muted">
        <span className="font-semibold text-ink-base">Install SKUNKWORKS</span> — keeps your data
        safe on this device and opens full-screen.
        {state.mode === 'ios-instructions' && (
          <span className="block">
            Share <span aria-hidden="true">(⬆)</span> → “Add to Home Screen”.
          </span>
        )}
      </p>
      <span className="flex items-center gap-1">
        {state.mode === 'prompt' && (
          <button
            type="button"
            onClick={() => void install()}
            className="rounded-control bg-accent-strong px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-ink transition-colors duration-enter ease-standard hover:bg-accent-base"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="rounded-control px-2 py-1.5 text-xs text-ink-muted underline-offset-2 hover:underline"
        >
          Dismiss
        </button>
      </span>
    </section>
  )
}
