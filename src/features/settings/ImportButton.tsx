import { useRef, useState, type ChangeEvent } from 'react'
import type { ExportBundle } from '../../db/export'
import { countImportable, importBundle, parseImport } from '../../db/import'
import { Button } from '../../ui/primitives/Button'

/**
 * Restore from a JSON export (FR-57). Two-step so a restore is never a
 * one-tap accident: pick a file → confirm the merge count → merge. All local,
 * fully offline; syncs afterward.
 */
export function ImportButton() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ bundle: ExportBundle; count: number } | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // let the same file be re-picked later
    if (!file) return
    setStatus(null)
    try {
      const bundle = parseImport(await file.text())
      setPending({ bundle, count: countImportable(bundle) })
    } catch (err) {
      setPending(null)
      setStatus(err instanceof Error ? err.message : 'Could not read that file.')
    }
  }

  async function confirm() {
    if (!pending) return
    const { imported } = await importBundle(pending.bundle)
    setPending(null)
    setStatus(`Imported ${imported} records ✓`)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={(e) => void onFile(e)}
        className="hidden"
      />
      {pending ? (
        <div className="flex flex-col gap-2 rounded-card bg-surface-overlay p-3">
          <p className="text-sm text-ink-base">
            Merge {pending.count} records from this backup into this device? Existing items with
            the same id are overwritten; nothing is deleted.
          </p>
          <div className="flex gap-2">
            <Button className="px-4 py-2 text-sm" onClick={() => void confirm()}>
              Merge
            </Button>
            <Button variant="quiet" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="self-start underline-offset-2 hover:underline"
        >
          Import backup
        </button>
      )}
      {status && <p className="text-sm text-ink-muted">{status}</p>}
    </div>
  )
}
