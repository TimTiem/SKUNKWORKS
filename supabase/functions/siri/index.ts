// SKUNKWORKS voice endpoint — iOS Shortcuts / Siri (headless).
//
// An iOS Shortcut POSTs here with a personal bearer token created in the app
// (Settings → Voice & Siri). This function runs server-side on Supabase with the
// service-role key: it hashes the incoming token, resolves it to a user via
// public.api_tokens, then adds or completes a task through the security-definer
// RPCs. The RAW token never leaves the request — only its SHA-256 hash is ever
// stored or compared, so a DB leak can't be replayed against the API.
//
// The service-role key lives ONLY here (a Supabase Function secret), never in
// the browser bundle — CLAUDE.md's "no service-role key in the client" holds.
//
// Deploy:
//   supabase functions deploy siri --no-verify-jwt
// (We authenticate with our OWN token, not a Supabase JWT, so gateway JWT
//  verification is off and the token check below is the security boundary.)
//
// Request body (JSON):  { "action": "add" | "complete", "text": "<task text>" }
// Response (JSON):       { "ok": boolean, "speak": "<a line for Siri to read>" }

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  })
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function bearer(req: Request): string | null {
  const m = (req.headers.get('authorization') ?? '').match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, speak: 'Method not allowed.' }, 405)

  const token = bearer(req)
  if (!token) return json({ ok: false, speak: 'Missing access token.' }, 401)

  // Resolve token -> user. Only the hash is ever stored.
  const hash = await sha256Hex(token)
  const { data: tokenRow, error: lookupErr } = await admin
    .from('api_tokens')
    .select('id, user_id')
    .eq('token_hash', hash)
    .is('revoked_at', null)
    .maybeSingle()

  if (lookupErr) return json({ ok: false, speak: 'Something went wrong. Try again.' }, 500)
  if (!tokenRow) return json({ ok: false, speak: 'That access token is not valid.' }, 401)

  // Best-effort last-used stamp; never blocks the action.
  void admin
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenRow.id)

  let body: { action?: string; text?: string }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, speak: 'I could not read that request.' }, 400)
  }

  const action = (body.action ?? '').toLowerCase()
  const text = (body.text ?? '').trim()
  if (!text) return json({ ok: false, speak: 'What was the task?' }, 400)

  if (action === 'add') {
    const { data, error } = await admin.rpc('siri_add_task', {
      p_user_id: tokenRow.user_id,
      p_text: text,
    })
    if (error || !data?.ok) return json({ ok: false, speak: 'I could not add that task.' }, 500)
    return json({ ok: true, speak: `Added: ${data.text}.` })
  }

  if (action === 'complete' || action === 'done') {
    const { data, error } = await admin.rpc('siri_complete_task', {
      p_user_id: tokenRow.user_id,
      p_text: text,
    })
    if (error) return json({ ok: false, speak: 'I could not complete that task.' }, 500)
    if (!data?.ok) {
      return json({ ok: false, speak: `I could not find an open task matching ${text}.` })
    }
    return json({ ok: true, speak: `Completed: ${data.text}. Plus ${data.xp} X P.` })
  }

  return json({ ok: false, speak: 'Say add, or complete, followed by the task.' }, 400)
})
