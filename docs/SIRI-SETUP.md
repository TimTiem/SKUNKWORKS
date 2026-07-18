# Voice control — iOS Shortcuts & Siri

Run SKUNKWORKS hands-free: **"Hey Siri, SKUNKWORKS"** → *"add buy milk."* The app
never has to be open — a Shortcut POSTs to a small server endpoint, which writes
straight to your synced data. The next time SKUNKWORKS foregrounds, the change is
already there.

You can **add, complete, snooze, delete, and reprioritise tasks; add, re-cost,
and redeem rewards; and hear your status** — all by voice.

## How it works

```
"Hey Siri, SKUNKWORKS" → (Siri: "what?") → "add buy milk"
  → Shortcut POSTs { text:"add buy milk" }
    to  https://<project>.supabase.co/functions/v1/siri
    with header  x-siri-token: <your token>
  → Edge Function hashes the token, resolves it to your user,
    reads the verb ("add"), calls the matching siri_* RPC
  → row lands in Postgres; the PWA delta-pulls it on next open
```

- Only the **SHA-256 hash** of your token is stored. The raw token lives only in
  your Shortcut. Revoke it anytime from **Settings → Voice & Siri**.
- Task-targeting commands (complete/snooze/delete/reprioritise/note) match the
  closest **open** task by text: exact → prefix → substring, newest wins ties.

### About "add task X in SKUNKWORKS" in one breath

A true single-sentence command with the task embedded — *"Hey Siri, add buy milk
in SKUNKWORKS"* — needs native **App Intents**, which only an installed app can
register. SKUNKWORKS is a PWA, so iOS can't pull the task out of a freeform
sentence for it. The closest hands-free flow is the two-part exchange above: say
the shortcut name, then dictate the command. It's still fully hands-free, and the
optional AI parsing (below) makes the dictated part completely natural.

---

## The commands

Say **"Hey Siri, SKUNKWORKS"**, then any of these:

| Say… | Does |
|------|------|
| `add buy milk` / `remind me to call mom` | Adds a task |
| `complete buy milk` / `done buy milk` | Completes the closest open task (+XP) |
| `snooze taxes` / `postpone taxes` | Defers a task |
| `delete buy milk` | Soft-deletes a task |
| `important taxes` / `flag the report` | Bumps importance |
| `urgent call the bank` | Bumps urgency |
| `note on buy milk: get the good stuff` | Adds a note to a task |
| `add reward massage for 200` | Creates a reward costing 200 coins |
| `set massage to 300` | Re-costs an existing reward |
| `redeem massage` | Spends coins on a reward ("you earned it") |
| `status` / `how am I doing` | Reads level, XP-to-next, coins, open tasks |
| `next` / `what's next` | Reads your highest-priority open task |

With **AI parsing** enabled (optional, below), you can also speak naturally, e.g.
*"remind me to call the dentist next Tuesday, it's important"* → a task with a
due date and a high importance.

---

## One-time server setup

You need the Supabase project this app already uses. Three steps: run two
migrations, set the function's secret(s), deploy the function.

### 1. Run the migrations

In the Supabase dashboard → **SQL Editor**, paste and run **both** (both are
idempotent — safe to re-run):

1. `supabase/migrations/0003_siri_api.sql` — `api_tokens` + add/complete RPCs.
2. `supabase/migrations/0004_siri_voice_v2.sql` — the edit/reward/read RPCs.

### 2. Deploy the Edge Function

With the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and
logged in (`supabase login`, then `supabase link --project-ref <ref>`):

```bash
supabase functions deploy siri --no-verify-jwt
```

`--no-verify-jwt` is required: the Shortcut authenticates with **your** token,
not a Supabase login JWT, so gateway JWT verification is off and the token check
inside the function is the security boundary.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically —
nothing to configure. The service-role key stays server-side; never in the bundle.

> No CLI? Create the function in the dashboard (**Edge Functions → New function →
> `siri`**), paste the contents of `supabase/functions/siri/` (`index.ts`,
> `parse.ts`, `ai.ts`), and turn **Verify JWT off** in the function's settings.

### 3. (Optional) Enable AI natural-language parsing

The deterministic commands above work with **no** extra setup. To also understand
free-form phrases (due dates, priorities, misheard verbs), set an Anthropic API
key as a function secret:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# optional: pick the parse model (default: claude-haiku-4-5, chosen for low
# voice latency). Bump to claude-opus-4-8 for maximum parsing quality:
supabase secrets set SIRI_MODEL=claude-opus-4-8
```

The AI call is only made for `add` phrases and anything the fast grammar doesn't
recognise, so precise commands (complete/redeem/status/…) stay instant and free.
When `ANTHROPIC_API_KEY` is unset, the endpoint simply uses the grammar only.

---

## Create your token

In the app: **Settings → Voice & Siri → Create Siri token**. Copy it immediately
— it's shown once. (Lost it? Just make a new one.)

---

## Build the Shortcut

Make **one** universal shortcut. (Optionally add fixed-phrase ones too — see
below.)

### "SKUNKWORKS" (universal)

1. Shortcuts app → **+** (new shortcut).
2. Add action **Text** → set it to **Ask Each Time**. This is what you speak.
3. Add action **Get Contents of URL**:
   - **URL**: `https://<project>.supabase.co/functions/v1/siri`
     (copy the exact URL from Settings → Voice & Siri).
   - **Method**: `POST`
   - **Headers**:
     - `x-siri-token` = `<paste your token>`
     - `apikey` = `<your Supabase anon key>` *(only if the gateway rejects the
       request without it — try without first)*
   - **Request Body**: `JSON`
     - `text` (Text) = the Ask-Each-Time value from step 2
4. Add action **Get Dictionary Value** → key `speak` → from the URL contents.
5. Add action **Show Result** (or **Speak Text**) of that value, so Siri reads
   the confirmation back.
6. Rename the shortcut to **SKUNKWORKS**. That name is the Siri phrase.

Now: **"Hey Siri, SKUNKWORKS"** → *"add call the dentist"* / *"redeem massage"* /
*"status"*.

### Optional: fixed-phrase shortcuts

If you use one action constantly and want to skip the "what?" prompt, duplicate
the shortcut, and in the JSON body add a second field `action` (Text) = `add`
(or `complete`), keeping `text` = the Ask-Each-Time value. Name it **"Add task in
SKUNKWORKS"** — then *"Hey Siri, Add task in SKUNKWORKS"* → *"buy milk"*. With an
explicit `action`, the verb isn't parsed, so it's the fastest path.

> **Token transport:** `x-siri-token` is preferred because it sidesteps the
> Supabase gateway trying to read your personal token as a login JWT. The
> endpoint also accepts the token as a `token` field in the JSON body, or as
> `Authorization: Bearer <token>` — use whichever your Shortcut makes easiest.

---

## Responses

The endpoint always returns JSON with a `speak` line for Siri:

| Situation | `speak` |
|-----------|---------|
| Added | `Added: buy milk.` |
| Completed | `Completed: buy milk. Plus 25 X P.` |
| Snoozed / Deleted | `Snoozed: buy milk.` / `Deleted: buy milk.` |
| Redeemed | `Redeemed: massage. You earned it. 312 coins left.` |
| Not enough coins | `You're 40 coins away from massage. Keep going.` |
| Status | `Level 7, 210 X P to next. 512 coins. 4 tasks open.` |
| No open task matched | `I could not find an open task matching buy milk.` |
| Bad / revoked token | `That access token is not valid.` |

## Troubleshooting

- **401 "not valid"** — the token was revoked or mistyped. Create a new one.
- **401 / gateway error before reaching the function** — you're likely sending
  the token as `Authorization: Bearer` and the gateway is rejecting it as a bad
  JWT. Switch to the `x-siri-token` header (recommended), or add the `apikey`
  header (your Supabase anon key).
- **"Say add, complete…" reply** — the phrase didn't match a command. Speak a
  clearer verb, or enable AI parsing (step 3) for free-form phrasing.
- **Change doesn't appear immediately** — the PWA pulls on foreground; open the
  app (or Settings → Sync now) and it merges in.
- **Complete grabbed the wrong task** — matching favours exact text; say more of
  the task's wording.

## Security notes

- Raw tokens are never stored — only `sha256(token)` in `api_tokens`.
- All `siri_*` RPCs are execute-revoked from `public`; only the service role
  (the Edge Function, after it validates your token) can call them, so a
  signed-in client can't forge another user's writes.
- The service-role key and `ANTHROPIC_API_KEY` live only as Function secrets,
  never in the app bundle ("no service-role key in the client" holds).
- Revoke a token anytime in **Settings → Voice & Siri** (soft — sets
  `revoked_at`, matching the app's delete-never convention).
