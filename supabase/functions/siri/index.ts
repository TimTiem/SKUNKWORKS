// SKUNKWORKS voice endpoint — iOS Shortcuts / Siri (headless). v2.
//
// An iOS Shortcut POSTs here with a personal token created in the app
// (Settings → Voice & Siri). This function runs server-side with the
// service-role key: it hashes the token, resolves it to a user via
// public.api_tokens, then ADDS or EDITS a task/reward, or reads back status,
// through the security-definer siri_* RPCs. The RAW token never leaves the
// request — only its SHA-256 hash is ever stored or compared.
//
// Two ways to drive it:
//  1. Universal shortcut — send just { "text": "<the whole spoken phrase>" }.
//     The verb is parsed here (add/complete/snooze/delete/important/note/
//     redeem/add reward/status/what's next). If ANTHROPIC_API_KEY is set,
//     natural phrases ("remind me to call the dentist tomorrow, it's
//     important") are parsed by Claude into a task + due date + priority.
//  2. Dedicated shortcut — send { "action": "add"|"complete"|…, "text": … }
//     to skip parsing entirely (a fixed, fast phrase per shortcut).
//
// Token transport (any of, in this order): the `x-siri-token` header, a
// `token` field in the JSON body, or `Authorization: Bearer <token>`. Prefer
// x-siri-token — it sidesteps the Supabase gateway trying to read a personal
// token as a login JWT (the classic pre-deploy 401).
//
// The service-role key + ANTHROPIC_API_KEY live ONLY here (Supabase Function
// secrets), never in the browser bundle — CLAUDE.md's "no service-role key in
// the client" holds.
//
// Deploy:  supabase functions deploy siri --no-verify-jwt
// Requires migrations 0003_siri_api.sql AND 0004_siri_voice_v2.sql.
//
// Response (JSON):  { "ok": boolean, "speak": "<a line for Siri to read>" }

import { createClient } from 'npm:@supabase/supabase-js@2'
import { parseCommand, type Command } from './parse.ts'
import { aiParse, type AiIntent } from './ai.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const SIRI_MODEL = Deno.env.get('SIRI_MODEL') ?? 'claude-haiku-4-5'
const AI_ENABLED = ANTHROPIC_API_KEY.length > 0

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-siri-token',
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

interface Body {
  action?: string
  text?: string
  token?: string
  note?: string
  name?: string
  tier?: string
  cost?: number
  importance?: number
  urgency?: number
  due_at?: string
}

function resolveToken(req: Request, body: Body): string | null {
  const header = req.headers.get('x-siri-token')
  if (header?.trim()) return header.trim()
  if (typeof body.token === 'string' && body.token.trim()) return body.token.trim()
  const m = (req.headers.get('authorization') ?? '').match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}

// ── Resolving a phrase / explicit action into a concrete command ─────────────

type Resolved =
  | { action: 'add'; text: string; due_at?: string | null; importance?: number | null; urgency?: number | null }
  | { action: 'complete'; text: string }
  | { action: 'defer'; text: string }
  | { action: 'delete'; text: string }
  | { action: 'prioritize'; text: string; importance?: number | null; urgency?: number | null }
  | { action: 'note'; text: string; note: string }
  | { action: 'add_reward'; name: string; cost: number; tier?: string }
  | { action: 'set_reward_cost'; name: string; cost: number }
  | { action: 'redeem'; name: string }
  | { action: 'status' }
  | { action: 'next' }

/** Dedicated-shortcut path: trust the body's explicit action + fields. */
function fromExplicit(action: string, body: Body): Resolved | null {
  const text = (body.text ?? '').trim()
  switch (action) {
    case 'add':
      return text ? { action: 'add', text, due_at: body.due_at ?? null, importance: body.importance ?? null, urgency: body.urgency ?? null } : null
    case 'complete':
    case 'done':
      return text ? { action: 'complete', text } : null
    case 'defer':
    case 'snooze':
      return text ? { action: 'defer', text } : null
    case 'delete':
      return text ? { action: 'delete', text } : null
    case 'prioritize':
    case 'important':
      return text ? { action: 'prioritize', text, importance: body.importance ?? 80, urgency: body.urgency ?? null } : null
    case 'urgent':
      return text ? { action: 'prioritize', text, urgency: body.urgency ?? 80 } : null
    case 'note':
      return text && body.note ? { action: 'note', text, note: body.note } : null
    case 'add_reward':
      return body.name && body.cost ? { action: 'add_reward', name: body.name.trim(), cost: body.cost, tier: body.tier } : null
    case 'set_reward_cost':
      return body.name && body.cost ? { action: 'set_reward_cost', name: body.name.trim(), cost: body.cost } : null
    case 'redeem':
      return body.name || text ? { action: 'redeem', name: (body.name ?? text).trim() } : null
    case 'status':
      return { action: 'status' }
    case 'next':
      return { action: 'next' }
    default:
      return null
  }
}

function fromAi(ai: AiIntent): Resolved | null {
  switch (ai.action) {
    case 'add':
      return {
        action: 'add',
        text: ai.text,
        due_at: ai.due_at || null,
        importance: ai.importance > 0 ? ai.importance : null,
        urgency: ai.urgency > 0 ? ai.urgency : null,
      }
    case 'complete':
    case 'defer':
    case 'delete':
      return ai.text ? { action: ai.action, text: ai.text } : null
    case 'prioritize':
      return ai.text
        ? {
            action: 'prioritize',
            text: ai.text,
            importance: ai.importance > 0 ? ai.importance : null,
            urgency: ai.urgency > 0 ? ai.urgency : null,
          }
        : null
    case 'note':
      return ai.text && ai.note ? { action: 'note', text: ai.text, note: ai.note } : null
    case 'add_reward':
      return ai.name && ai.cost > 0 ? { action: 'add_reward', name: ai.name, cost: ai.cost } : null
    case 'set_reward_cost':
      return ai.name && ai.cost > 0 ? { action: 'set_reward_cost', name: ai.name, cost: ai.cost } : null
    case 'redeem':
      return ai.name ? { action: 'redeem', name: ai.name } : null
    case 'status':
      return { action: 'status' }
    case 'next':
      return { action: 'next' }
    default:
      return null
  }
}

function fromCommand(cmd: Command): Resolved {
  return cmd as Resolved
}

/** Turn a phrase into a command: deterministic first (fast/free), AI as the
 * richer fallback for `add` and anything the grammar doesn't recognise. */
async function resolvePhrase(text: string): Promise<Resolved | null> {
  const det = parseCommand(text)
  // Precise commands: run as-is — AI would add nothing.
  if (det && det.action !== 'add') return fromCommand(det)
  // `add` or unrecognised: prefer AI (due dates, priority, misheard verbs).
  if (AI_ENABLED) {
    const ai = await aiParse(text, { apiKey: ANTHROPIC_API_KEY, model: SIRI_MODEL })
    if (ai) return fromAi(ai)
  }
  return det ? fromCommand(det) : null
}

// ── Executing a resolved command against the RPCs ────────────────────────────

const HELP =
  'Say add, complete, snooze, delete, or redeem, followed by the item — or say status, or what’s next.'

async function execute(resolved: Resolved, userId: string): Promise<Response> {
  switch (resolved.action) {
    case 'add': {
      const { data, error } = await admin.rpc('siri_add_task_v2', {
        p_user_id: userId,
        p_text: resolved.text,
        p_due_at: resolved.due_at ?? null,
        p_importance: resolved.importance ?? null,
        p_urgency: resolved.urgency ?? null,
      })
      if (error || !data?.ok) return json({ ok: false, speak: 'I could not add that task.' }, 500)
      return json({ ok: true, speak: `Added: ${data.text}.` })
    }
    case 'complete': {
      const { data, error } = await admin.rpc('siri_complete_task', {
        p_user_id: userId,
        p_text: resolved.text,
      })
      if (error) return json({ ok: false, speak: 'I could not complete that task.' }, 500)
      if (!data?.ok) return json({ ok: false, speak: `I could not find an open task matching ${resolved.text}.` })
      return json({ ok: true, speak: `Completed: ${data.text}. Plus ${data.xp} X P.` })
    }
    case 'defer': {
      const { data, error } = await admin.rpc('siri_defer_task', { p_user_id: userId, p_text: resolved.text })
      if (error) return json({ ok: false, speak: 'I could not snooze that task.' }, 500)
      if (!data?.ok) return json({ ok: false, speak: `I could not find an open task matching ${resolved.text}.` })
      return json({ ok: true, speak: `Snoozed: ${data.text}.` })
    }
    case 'delete': {
      const { data, error } = await admin.rpc('siri_delete_task', { p_user_id: userId, p_text: resolved.text })
      if (error) return json({ ok: false, speak: 'I could not delete that task.' }, 500)
      if (!data?.ok) return json({ ok: false, speak: `I could not find a task matching ${resolved.text}.` })
      return json({ ok: true, speak: `Deleted: ${data.text}.` })
    }
    case 'prioritize': {
      const { data, error } = await admin.rpc('siri_set_priority', {
        p_user_id: userId,
        p_text: resolved.text,
        p_importance: resolved.importance ?? null,
        p_urgency: resolved.urgency ?? null,
      })
      if (error) return json({ ok: false, speak: 'I could not update that task.' }, 500)
      if (!data?.ok) return json({ ok: false, speak: `I could not find an open task matching ${resolved.text}.` })
      return json({ ok: true, speak: `Flagged: ${data.text}.` })
    }
    case 'note': {
      const { data, error } = await admin.rpc('siri_set_note', {
        p_user_id: userId,
        p_text: resolved.text,
        p_note: resolved.note,
      })
      if (error) return json({ ok: false, speak: 'I could not add that note.' }, 500)
      if (!data?.ok) return json({ ok: false, speak: `I could not find an open task matching ${resolved.text}.` })
      return json({ ok: true, speak: `Noted on ${data.text}.` })
    }
    case 'add_reward': {
      const { data, error } = await admin.rpc('siri_add_reward', {
        p_user_id: userId,
        p_name: resolved.name,
        p_cost: resolved.cost,
        p_tier: resolved.tier ?? 'small',
      })
      if (error || !data) return json({ ok: false, speak: 'I could not add that reward.' }, 500)
      if (!data.ok) {
        if (data.reason === 'bad_cost') return json({ ok: false, speak: 'How many coins should that reward cost?' })
        return json({ ok: false, speak: 'I could not add that reward.' }, 500)
      }
      return json({ ok: true, speak: `Added reward: ${data.name}, for ${data.cost} coins.` })
    }
    case 'set_reward_cost': {
      const { data, error } = await admin.rpc('siri_set_reward_cost', {
        p_user_id: userId,
        p_name: resolved.name,
        p_cost: resolved.cost,
      })
      if (error || !data) return json({ ok: false, speak: 'I could not update that reward.' }, 500)
      if (!data.ok) return json({ ok: false, speak: `I could not find a reward called ${resolved.name}.` })
      return json({ ok: true, speak: `${data.name} is now ${data.cost} coins.` })
    }
    case 'redeem': {
      const { data, error } = await admin.rpc('siri_redeem_reward', { p_user_id: userId, p_name: resolved.name })
      if (error || !data) return json({ ok: false, speak: 'I could not redeem that reward.' }, 500)
      if (!data.ok) {
        if (data.reason === 'insufficient') {
          return json({ ok: false, speak: `You’re ${data.short} coins away from ${data.name}. Keep going.` })
        }
        return json({ ok: false, speak: `I could not find a reward called ${resolved.name}.` })
      }
      return json({ ok: true, speak: `Redeemed: ${data.name}. You earned it. ${data.balance} coins left.` })
    }
    case 'status': {
      const { data, error } = await admin.rpc('siri_status', { p_user_id: userId })
      if (error || !data?.ok) return json({ ok: false, speak: 'I could not read your status.' }, 500)
      const tasks = data.open === 1 ? 'task' : 'tasks'
      return json({
        ok: true,
        speak: `Level ${data.level}, ${data.xp_to_next} X P to next. ${data.coins} coins. ${data.open} ${tasks} open.`,
      })
    }
    case 'next': {
      const { data, error } = await admin.rpc('siri_next_task', { p_user_id: userId })
      if (error || !data?.ok) return json({ ok: false, speak: 'I could not check your tasks.' }, 500)
      if (data.empty) return json({ ok: true, speak: 'Nothing open right now — you’re clear.' })
      return json({ ok: true, speak: `Next up: ${data.text}.` })
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, speak: 'Method not allowed.' }, 405)

  let body: Body
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, speak: 'I could not read that request.' }, 400)
  }

  const token = resolveToken(req, body)
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
  void admin.from('api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tokenRow.id)

  // Figure out what the user wants: explicit action (dedicated shortcut) or a
  // parsed phrase (universal shortcut).
  const explicitAction = (body.action ?? '').trim().toLowerCase()
  const text = (body.text ?? '').trim()

  let resolved: Resolved | null
  if (explicitAction) {
    resolved = fromExplicit(explicitAction, body)
  } else {
    if (!text) return json({ ok: false, speak: 'What would you like to do?' }, 400)
    resolved = await resolvePhrase(text)
  }

  if (!resolved) return json({ ok: false, speak: HELP }, 400)
  return await execute(resolved, tokenRow.user_id)
})
