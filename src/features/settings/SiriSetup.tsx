import { useEffect, useState } from 'react'
import { supabase } from '../../sync/supabase'
import { Button } from '../../ui/primitives/Button'
import { generateToken, sha256Hex, siriEndpoint } from './siriToken'

/**
 * Settings → Voice & Siri (FR-06, voice slice): create a personal access token
 * to paste into an iOS Shortcut, so "Hey Siri" can add or complete a task
 * hands-free. The token is shown ONCE and never stored — only its hash reaches
 * the server. Token management is online-only (it must reach Supabase), and the
 * Shortcut it powers naturally needs a connection too, so there's no offline
 * story to preserve here.
 */

interface TokenRow {
  id: string
  label: string | null
  created_at: string
  last_used_at: string | null
}

const ENDPOINT = siriEndpoint((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '')

function copy(text: string): void {
  void navigator.clipboard?.writeText(text)
}

function whenLabel(iso: string | null): string {
  if (!iso) return 'never used yet'
  return `last used ${new Date(iso).toLocaleDateString()}`
}

export function SiriSetup() {
  const [tokens, setTokens] = useState<TokenRow[] | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const online = typeof navigator === 'undefined' ? true : navigator.onLine

  async function refresh() {
    const { data, error } = await supabase
      .from('api_tokens')
      .select('id, label, created_at, last_used_at')
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
    if (error) {
      setError('Could not load your voice tokens.')
      return
    }
    setError(null)
    setTokens((data ?? []) as TokenRow[])
  }

  // Load (and re-load when connectivity returns). Offline: leave tokens null so
  // render shows the "connect to manage" note — no synchronous setState here.
  useEffect(() => {
    if (!online) return
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('api_tokens')
        .select('id, label, created_at, last_used_at')
        .is('revoked_at', null)
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) setError('Could not load your voice tokens.')
      else {
        setError(null)
        setTokens((data ?? []) as TokenRow[])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [online])

  async function create() {
    setBusy(true)
    setError(null)
    try {
      const raw = generateToken()
      const token_hash = await sha256Hex(raw)
      const { error } = await supabase.from('api_tokens').insert({ token_hash, label: 'Siri' })
      if (error) {
        setError('Could not create a token — are you online?')
        return
      }
      setFresh(raw) // reveal once
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id: string) {
    const { error } = await supabase
      .from('api_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      setError('Could not revoke that token.')
      return
    }
    await refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-muted">
        Add and complete tasks by voice: “Hey Siri, SKUNKWORKS add buy milk.” Create a token, paste
        it into the shortcut once, and it works hands-free — the app never has to be open.
      </p>

      {!online && (
        <p className="text-sm text-ink-muted">Connect to the internet to manage voice tokens.</p>
      )}

      {error && <p className="text-sm text-accent-soft">{error}</p>}

      {fresh && (
        <div className="flex flex-col gap-2 rounded-control bg-surface-overlay p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-strong">
            Your new token — copy it now, it won’t be shown again
          </p>
          <code className="break-all rounded bg-surface-base px-2 py-1.5 text-xs text-ink-base">
            {fresh}
          </code>
          <div className="flex gap-2">
            <Button className="px-3 py-1.5 text-xs" onClick={() => copy(fresh)}>
              Copy token
            </Button>
            <Button variant="quiet" onClick={() => setFresh(null)}>
              Done
            </Button>
          </div>
        </div>
      )}

      <Button
        className="self-start px-4 py-2 text-sm"
        disabled={busy || !online}
        onClick={() => void create()}
      >
        {busy ? 'Creating…' : 'Create Siri token'}
      </Button>

      {tokens && tokens.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-control bg-surface-overlay px-3 py-2 text-sm"
            >
              <span className="text-ink-base">
                {t.label ?? 'Token'}{' '}
                <span className="text-ink-muted">· {whenLabel(t.last_used_at)}</span>
              </span>
              <button
                type="button"
                onClick={() => void revoke(t.id)}
                className="text-xs text-ink-muted underline-offset-2 hover:text-ink-base hover:underline"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      <details className="rounded-control bg-surface-overlay/60 px-3 py-2 text-sm text-ink-muted">
        <summary className="cursor-pointer text-ink-base">How to set up the Siri shortcut</summary>
        <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-4">
          <li>Open the iOS Shortcuts app → + → add a “Get Contents of URL” action.</li>
          <li>
            URL: <code className="break-all text-ink-base">{ENDPOINT}</code>
          </li>
          <li>Method: POST. Request Body: JSON.</li>
          <li>
            Add a header <code className="text-ink-base">Authorization</code> ={' '}
            <code className="text-ink-base">Bearer YOUR_TOKEN</code>.
          </li>
          <li>
            JSON body: <code className="text-ink-base">action</code> ={' '}
            <code className="text-ink-base">add</code> (or <code className="text-ink-base">complete</code>),{' '}
            <code className="text-ink-base">text</code> = a “Dictated Text” / “Ask Each Time” value.
          </li>
          <li>
            End with “Show Result” of the response’s <code className="text-ink-base">speak</code>{' '}
            field so Siri reads the confirmation back.
          </li>
          <li>
            Name the shortcut “SKUNKWORKS add” — that name is the phrase Siri listens for. Make a
            second one with <code className="text-ink-base">action = complete</code> for marking tasks
            off.
          </li>
        </ol>
        <p className="mt-2">
          Full walkthrough (with the completion shortcut and troubleshooting) is in{' '}
          <code className="text-ink-base">docs/SIRI-SETUP.md</code>.
        </p>
      </details>
    </div>
  )
}
