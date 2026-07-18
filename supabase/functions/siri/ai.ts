// AI natural-language parsing for the voice endpoint (opt-in, Tim's ask).
//
// When the deterministic grammar (parse.ts) can't confidently read a phrase —
// or the phrase is an `add` with richness worth extracting ("call the dentist
// next Tuesday, it's important") — we ask Claude to turn the utterance into the
// same structured Command shape, including an optional due date and matrix
// position. Everything stays server-side; the ANTHROPIC_API_KEY is a Supabase
// Function secret, never in the app bundle.
//
// Transport: raw HTTPS via fetch (not the SDK). This is one tiny structured
// call from a Deno Edge Function — raw HTTP avoids any npm version-pin/resolve
// risk at deploy time and the Messages wire format (anthropic-version pinned)
// is stable. Structured Outputs (output_config.format) guarantees parseable
// JSON; the model is asked for ONLY the JSON object as belt-and-suspenders.
//
// Model: defaults to Claude Haiku 4.5 — a voice command has Siri waiting to
// speak the reply, so low latency matters more than deep reasoning for this
// simple extraction. Override with the SIRI_MODEL function secret (e.g. set it
// to claude-opus-4-8 for maximum parsing quality at higher latency/cost).

export type AiAction =
  | 'add'
  | 'complete'
  | 'defer'
  | 'delete'
  | 'prioritize'
  | 'note'
  | 'add_reward'
  | 'set_reward_cost'
  | 'redeem'
  | 'status'
  | 'next'
  | 'unknown'

export interface AiIntent {
  action: AiAction
  /** Task/reward target (or the task text for `add`). */
  text: string
  note: string
  name: string
  /** ISO date "YYYY-MM-DD" or "" when none. */
  due_at: string
  /** 0 = the user didn't express priority; 60–100 = they did. */
  importance: number
  urgency: number
  cost: number
}

const INTENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: {
      type: 'string',
      enum: [
        'add',
        'complete',
        'defer',
        'delete',
        'prioritize',
        'note',
        'add_reward',
        'set_reward_cost',
        'redeem',
        'status',
        'next',
        'unknown',
      ],
    },
    text: { type: 'string' },
    note: { type: 'string' },
    name: { type: 'string' },
    due_at: { type: 'string' },
    importance: { type: 'integer' },
    urgency: { type: 'integer' },
    cost: { type: 'integer' },
  },
  required: ['action', 'text', 'note', 'name', 'due_at', 'importance', 'urgency', 'cost'],
} as const

function systemPrompt(todayIso: string): string {
  return [
    'You turn a single spoken command for a gamified to-do app into one JSON object.',
    `Today is ${todayIso} (UTC). Resolve relative dates ("tomorrow", "next Monday") against it.`,
    '',
    'Actions:',
    '- add: create a task. `text` = the task. Set `due_at` (YYYY-MM-DD) only if a time is stated, else "".',
    '  Set `importance`/`urgency` (60-100) only if the speaker expresses priority; otherwise 0.',
    '  "important" -> importance ~80; "urgent"/"asap" -> urgency ~85; "critical" -> both high.',
    '- complete / defer / delete: `text` = words identifying the existing task.',
    '- prioritize: `text` = the task; set importance and/or urgency (60-100), others 0.',
    '- note: `text` = the task; `note` = the note to attach.',
    '- add_reward: `name` = reward name; `cost` = coin cost (integer > 0).',
    '- set_reward_cost: `name` = reward; `cost` = new coin cost.',
    '- redeem: `name` = reward to redeem.',
    '- status: no fields. next: no fields (the highest-priority task).',
    '- unknown: use when it is not a task or reward command.',
    '',
    'Always fill every field: unused strings = "", unused numbers = 0.',
    'Respond with ONLY the JSON object, nothing else.',
  ].join('\n')
}

interface AiOptions {
  apiKey: string
  model: string
  /** Injectable for tests; defaults to real fetch. */
  fetchImpl?: typeof fetch
  todayIso?: string
}

/** Parse a phrase with Claude. Returns null on any failure so the caller can
 * degrade gracefully (deterministic parse / help line) — never throws. */
export async function aiParse(text: string, opts: AiOptions): Promise<AiIntent | null> {
  const clean = text.trim()
  if (!clean) return null
  const today = opts.todayIso ?? new Date().toISOString().slice(0, 10)
  const doFetch = opts.fetchImpl ?? fetch

  try {
    const res = await doFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': opts.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: 300,
        system: systemPrompt(today),
        output_config: { format: { type: 'json_schema', schema: INTENT_SCHEMA } },
        messages: [{ role: 'user', content: clean }],
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[]
      stop_reason?: string
    }
    if (data.stop_reason === 'refusal') return null
    const raw = data.content?.find((b) => b.type === 'text')?.text
    if (!raw) return null
    return coerce(extractJson(raw))
  } catch {
    return null
  }
}

/** Tolerate a stray code fence or surrounding prose around the JSON. */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1))
    throw new Error('no json')
  }
}

const ACTIONS: ReadonlySet<AiAction> = new Set<AiAction>([
  'add', 'complete', 'defer', 'delete', 'prioritize', 'note',
  'add_reward', 'set_reward_cost', 'redeem', 'status', 'next', 'unknown',
])

function clampAxis(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : 0
  return Math.min(100, Math.max(0, v))
}

/** Normalise the model's object into a validated AiIntent (or null if useless). */
function coerce(obj: unknown): AiIntent | null {
  if (!obj || typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  const action = String(o.action ?? '') as AiAction
  if (!ACTIONS.has(action) || action === 'unknown') return null
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const cost = typeof o.cost === 'number' && Number.isFinite(o.cost) ? Math.round(o.cost) : 0
  const due = str(o.due_at)
  return {
    action,
    text: str(o.text),
    note: str(o.note),
    name: str(o.name),
    due_at: /^\d{4}-\d{2}-\d{2}/.test(due) ? due : '',
    importance: clampAxis(o.importance),
    urgency: clampAxis(o.urgency),
    cost: cost > 0 ? cost : 0,
  }
}
