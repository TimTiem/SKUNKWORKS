import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type ReactNode } from 'react'
import { db } from '../../db/db'
import { META_KEYS } from '../../db/meta'
import { APP_VERSION } from '../../lib/version'
import { supabase } from '../../sync/supabase'
import { syncNow } from '../../sync/sync'
import { Button } from '../../ui/primitives/Button'
import { ExportButton } from '../export/ExportButton'
import { ImportButton } from './ImportButton'
import { SiriSetup } from './SiriSetup'
import { SoundToggle } from './SoundToggle'

/** One consistent settings surface (FR-58): sync, feedback, data, time sense,
 *  version, and account — all the quiet controls in one calm place. */
export function SettingsScreen({ email }: { email: string }) {
  const schemaVersion = useLiveQuery(
    async () => (await db.meta.get(META_KEYS.schemaVersion))?.value ?? null,
    [],
  )

  const [sync, setSync] = useState<'idle' | 'syncing' | 'done'>('idle')
  async function doSync() {
    setSync('syncing')
    await syncNow()
    setSync('done')
  }
  useEffect(() => {
    if (sync !== 'done') return
    const t = setTimeout(() => setSync('idle'), 2000)
    return () => clearTimeout(t)
  }, [sync])

  const online = typeof navigator === 'undefined' ? true : navigator.onLine

  return (
    <div className="flex flex-col gap-4">
      <Section title="Sync">
        <p className="text-sm text-ink-muted">
          {online ? 'Online — changes sync in the background.' : 'Offline — changes are saved here and sync when you reconnect.'}
        </p>
        <Button
          className="self-start px-4 py-2 text-sm"
          disabled={sync === 'syncing' || !online}
          onClick={() => void doSync()}
        >
          {sync === 'syncing' ? 'Syncing…' : sync === 'done' ? 'Synced ✓' : 'Sync now'}
        </Button>
      </Section>

      <Section title="Feedback">
        <div className="text-sm text-ink-base">
          <SoundToggle />
        </div>
        <p className="text-sm text-ink-muted">Sound + haptics on task and reward wins.</p>
      </Section>

      <Section title="Voice & Siri">
        <SiriSetup />
      </Section>

      <Section title="Your data">
        <div className="flex flex-col gap-2 text-sm text-ink-base">
          <ExportButton />
          <ImportButton />
        </div>
        <p className="text-xs text-ink-muted">
          Export is your backup; import merges one back in. Both are fully offline.
        </p>
      </Section>

      <Section title="About">
        <p className="text-sm text-ink-muted">
          SKUNKWORKS v{APP_VERSION}
          {schemaVersion != null && <> · data schema v{String(schemaVersion)}</>}
        </p>
      </Section>

      <Section title="Account">
        <p className="text-sm text-ink-muted">Signed in as {email}</p>
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="self-start text-sm text-ink-base underline-offset-2 hover:underline"
        >
          Sign out
        </button>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-card bg-surface-raised p-4 shadow-card">
      <h2 className="font-display text-sm tracking-wider text-ink-strong">{title}</h2>
      {children}
    </section>
  )
}
