import { useEffect, useState } from 'react'
import { buildExport, exportFilename } from '../../db/export'

/**
 * One quiet action: download everything as JSON (FR-56). Local-only — no
 * network involved; works fully offline. Confirmation is a brief inline
 * "Saved ✓" (instant local feedback, P1 — never a modal).
 */
export function ExportButton() {
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => setSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [saved])

  async function exportNow() {
    const bundle = await buildExport()
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFilename(bundle.exported_at)
    a.click()
    URL.revokeObjectURL(url)
    setSaved(true)
  }

  return (
    <button
      type="button"
      onClick={() => void exportNow()}
      className="underline-offset-2 hover:underline"
    >
      {saved ? 'Saved ✓' : 'Export data'}
    </button>
  )
}
