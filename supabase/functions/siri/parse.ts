// Deterministic voice-command parser — the fast, free, offline-independent path
// for the universal "Skunkworks" shortcut. Given a spoken phrase, it reads the
// leading verb and returns a structured Command, or null when it can't parse
// confidently (the caller then falls back to AI, if enabled, or a help line).
//
// PURE: no Deno/Web APIs, no IO — so it's unit-tested with Vitest under Node
// (parse.test.ts) exactly as it runs in the Edge Function.
//
// Design notes:
// - Precise commands (complete/defer/delete/prioritise/note/redeem/reward
//   edits/status/next) are handled here and executed as-is — AI adds nothing.
// - `add` is parsed here too, but the caller prefers AI for it when enabled, so
//   a phrase like "call the dentist tomorrow, it's important" can yield a due
//   date + matrix position instead of a bare task.

/** How high "important"/"urgent"/"flag" pushes an axis (0..100). Strong, not max. */
export const PRIORITY_BUMP = 80

export type Command =
  | { action: 'add'; text: string }
  | { action: 'complete'; text: string }
  | { action: 'defer'; text: string }
  | { action: 'delete'; text: string }
  | { action: 'prioritize'; text: string; importance?: number; urgency?: number }
  | { action: 'note'; text: string; note: string }
  | { action: 'add_reward'; name: string; cost: number; tier?: string }
  | { action: 'set_reward_cost'; name: string; cost: number }
  | { action: 'redeem'; name: string }
  | { action: 'status' }
  | { action: 'next' }

/** Normalise a spoken phrase: collapse whitespace, drop a leading/trailing app
 * name and courtesy words, strip surrounding punctuation. */
function normalize(input: string): string {
  let s = (input ?? '').trim().replace(/\s+/g, ' ')
  // Drop a leading or trailing "skunkworks" (with optional comma) — the phrase
  // may echo the app name even though the shortcut already scoped it.
  s = s.replace(/^skunk\s?works[,:]?\s*/i, '').replace(/\s*(?:in|on|to)?\s*skunk\s?works[.!?]*$/i, '')
  // Common courtesy lead-ins.
  s = s.replace(/^(?:hey |ok |please |can you |could you )+/i, '')
  return s.replace(/[.!?]+$/g, '').trim()
}

/** Strip a leading verb group (any of the alternatives) and return the rest, or
 * null if none matched. Alternatives are matched longest-first as a word group. */
function afterVerb(s: string, verbs: string[]): string | null {
  for (const v of verbs) {
    const re = new RegExp(`^${v}\\b[\\s:,-]*`, 'i')
    if (re.test(s)) return s.replace(re, '').trim()
  }
  return null
}

/** Pull a trailing integer amount, tolerating "for", "to", "coins", "$". */
function trailingAmount(s: string): { rest: string; amount: number } | null {
  const m = s.match(/^(.*?)(?:\s+(?:for|at|to|=))?\s*\$?\s*(\d{1,7})\s*(?:coins?|pts?|points?)?$/i)
  if (!m) return null
  const rest = m[1].replace(/\s+(?:for|at|to|worth|costing)\s*$/i, '').trim()
  return { rest, amount: parseInt(m[2], 10) }
}

export function parseCommand(input: string): Command | null {
  const s = normalize(input)
  if (!s) return null
  const lower = s.toLowerCase()

  // ── Reads (no argument) ────────────────────────────────────────────────────
  if (/^(status|progress|stats|score|how am i (doing|going)|where am i|my (level|stats|progress))\b/.test(lower)) {
    return { action: 'status' }
  }
  if (/^(next|what('| i)?s next|what should i (do|work on)|up next)\b/.test(lower)) {
    return { action: 'next' }
  }

  // ── Rewards (check "reward" before generic add/complete) ───────────────────
  // "add reward massage for 200", "new reward a long bath 200"
  const rewardAdd = afterVerb(s, ['add (?:a )?reward', 'new reward', 'create (?:a )?reward', 'reward'])
  if (rewardAdd !== null) {
    const amt = trailingAmount(rewardAdd)
    if (amt && amt.rest) return { action: 'add_reward', name: amt.rest, cost: amt.amount }
    return null // a reward without a cost is ambiguous — let AI/help handle it
  }
  // "redeem massage", "claim my long bath", "cash in massage"
  const redeem = afterVerb(s, ['redeem', 'claim', 'cash in', 'spend on'])
  if (redeem !== null && redeem) return { action: 'redeem', name: redeem }

  // ── Priority ("important buy milk" / "urgent taxes" / "flag the report") ────
  const important = afterVerb(s, ['important', 'high priority', 'prioriti[sz]e', 'flag'])
  if (important !== null && important) {
    return { action: 'prioritize', text: important, importance: PRIORITY_BUMP }
  }
  const urgent = afterVerb(s, ['urgent(?:ly)?', 'asap'])
  if (urgent !== null && urgent) {
    return { action: 'prioritize', text: urgent, urgency: PRIORITY_BUMP }
  }

  // ── Note ("note on buy milk: get the good stuff") ──────────────────────────
  const noteBody = afterVerb(s, ['note on', 'note for', 'add note to', 'add note on', 'note'])
  if (noteBody !== null) {
    const sep = noteBody.match(/\s*(?::|—| that | saying )\s*/i)
    if (sep && sep.index !== undefined && sep.index > 0) {
      const text = noteBody.slice(0, sep.index).trim()
      const note = noteBody.slice(sep.index + sep[0].length).trim()
      if (text && note) return { action: 'note', text, note }
    }
    return null // no clear task/note split — let AI/help handle it
  }

  // ── Re-cost a reward ("set massage to 300") — only when it ends in a number ─
  const setBody = afterVerb(s, ['set', 'change', 'make'])
  if (setBody !== null) {
    const amt = trailingAmount(setBody)
    if (amt && amt.rest) return { action: 'set_reward_cost', name: amt.rest, cost: amt.amount }
    // "set" without a trailing amount isn't a re-cost — fall through to AI/help.
  }

  // ── Complete / defer / delete ──────────────────────────────────────────────
  const complete = afterVerb(s, [
    'complete',
    'completed',
    'finish(?:ed)?',
    'done(?: with)?',
    'mark (?:as )?(?:done|complete)',
    'check off',
    'tick off',
  ])
  if (complete !== null && complete) return { action: 'complete', text: complete }

  const defer = afterVerb(s, ['defer', 'snooze', 'postpone', 'later', 'put off', 'push back'])
  if (defer !== null && defer) return { action: 'defer', text: defer }

  const del = afterVerb(s, ['delete', 'remove', 'cancel', 'scrap', 'trash', 'get rid of', 'drop'])
  if (del !== null && del) return { action: 'delete', text: del }

  // ── Add (the default verb) ─────────────────────────────────────────────────
  const add = afterVerb(s, [
    'add (?:a )?task',
    'new task',
    'create (?:a )?task',
    'capture',
    'remind me to',
    'add',
    'todo',
    "to-?do",
  ])
  if (add !== null && add) return { action: 'add', text: add }

  return null
}
