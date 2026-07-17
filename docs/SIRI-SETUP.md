# Voice control — iOS Shortcuts & Siri

Add and complete tasks hands-free: **"Hey Siri, SKUNKWORKS add buy milk."** The app
never has to be open — a Shortcut POSTs to a small server endpoint, which writes
straight to your synced data. The next time SKUNKWORKS foregrounds, the task (or
completion + XP) is already there.

## How it works

```
"Hey Siri, SKUNKWORKS add buy milk"
  → Shortcut POSTs { action:"add", text:"buy milk" }
    to  https://<project>.supabase.co/functions/v1/siri
    with header  Authorization: Bearer <your token>
  → Edge Function hashes the token, resolves it to your user,
    calls siri_add_task / siri_complete_task
  → row lands in Postgres; the PWA delta-pulls it on next open
```

- **Add** creates a task at the matrix centre (importance/urgency 50).
- **Complete** finds the best-matching *open* task by text (exact → prefix →
  substring, newest wins ties), marks it done, and appends the same XP +
  coin events the app does (base position reward, no crit, no focus bonus).
- Only the **SHA-256 hash** of your token is stored. The raw token lives only in
  your Shortcut. Revoke it anytime from **Settings → Voice & Siri**.

---

## One-time server setup

You need the Supabase project this app already uses. Two steps: run the
migration, deploy the function.

### 1. Run the migration

In the Supabase dashboard → **SQL Editor**, paste and run
`supabase/migrations/0003_siri_api.sql`. It's idempotent — safe to re-run. This
adds the `api_tokens` table and the two `siri_*` functions.

### 2. Deploy the Edge Function

With the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and
logged in (`supabase login`, then `supabase link --project-ref <ref>`):

```bash
supabase functions deploy siri --no-verify-jwt
```

`--no-verify-jwt` is required: the Shortcut authenticates with **your** token,
not a Supabase login JWT, so gateway JWT verification is off and the token check
inside the function is the security boundary.

The function reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, both of which
Supabase injects into Edge Functions automatically — nothing to configure. The
service-role key stays server-side; it is never in the app bundle.

> No CLI? You can also create the function in the dashboard (**Edge Functions →
> New function → `siri`**), paste `supabase/functions/siri/index.ts`, and turn
> **Verify JWT off** in the function's settings.

---

## Create your token

In the app: **Settings → Voice & Siri → Create Siri token**. Copy it immediately
— it's shown once. (You won't see it again; just make a new one if you lose it.)

---

## Build the Shortcuts

Make **two** shortcuts — one to add, one to complete. They're identical except
for the `action` value.

### "SKUNKWORKS add"

1. Shortcuts app → **+** (new shortcut).
2. Add action **Text** → set it to **Ask Each Time** (or **Dictated Text**).
   This is what you speak.
3. Add action **Get Contents of URL**:
   - **URL**: `https://<project>.supabase.co/functions/v1/siri`
     (copy the exact URL from Settings → Voice & Siri).
   - **Method**: `POST`
   - **Headers**:
     - `Authorization` = `Bearer <paste your token>`
     - `apikey` = `<your Supabase anon key>` *(only if the gateway rejects the
       request without it — try without first)*
   - **Request Body**: `JSON`
     - `action` (Text) = `add`
     - `text` (Text) = the Ask-Each-Time value from step 2
4. Add action **Get Dictionary Value** → key `speak` → from the URL contents.
5. Add action **Show Result** (or **Speak Text**) of that value, so Siri reads
   the confirmation back.
6. Rename the shortcut to **SKUNKWORKS add**. That name is the Siri phrase.

Now: **"Hey Siri, SKUNKWORKS add call the dentist."**

### "SKUNKWORKS complete"

Duplicate the shortcut above, change the JSON `action` to `complete`, and rename
it **SKUNKWORKS complete**.

Now: **"Hey Siri, SKUNKWORKS complete call the dentist."** It matches the closest
open task and reads back e.g. *"Completed: call the dentist. Plus 25 XP."*

> Tip: you can also make a single shortcut that first **asks** "add or complete?"
> and branches — but two named shortcuts are the fastest to trigger by voice.

---

## Responses

The endpoint always returns JSON with a `speak` line for Siri:

| Situation | `speak` |
|-----------|---------|
| Added | `Added: buy milk.` |
| Completed | `Completed: buy milk. Plus 25 X P.` |
| No open task matched | `I could not find an open task matching buy milk.` |
| Bad / revoked token | `That access token is not valid.` |

## Troubleshooting

- **401 "not valid"** — the token was revoked or mistyped. Create a new one.
- **Gateway error / 401 before reaching the function** — add the `apikey` header
  (your Supabase anon key) to the Shortcut.
- **Task doesn't appear immediately** — the PWA pulls on foreground; open the
  app (or Settings → Sync now) and it merges in.
- **Complete grabbed the wrong task** — matching favours exact text; say more of
  the task's wording.

## Security notes

- Raw tokens are never stored — only `sha256(token)` in `api_tokens`.
- `siri_add_task` / `siri_complete_task` are execute-revoked from `public`; only
  the service role (the Edge Function, after it validates your token) can call
  them, so a signed-in client can't forge another user's writes.
- Revoke a token anytime in **Settings → Voice & Siri** (soft — sets
  `revoked_at`, matching the app's delete-never convention).
