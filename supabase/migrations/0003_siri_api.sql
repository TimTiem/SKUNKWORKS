-- 0003_siri_api.sql — Voice control via iOS Shortcuts / Siri (headless).
-- EXPAND-ONLY per Decision 5: one new table + two functions. No existing table,
-- policy, or trigger is changed, so old offline clients keep working untouched.
--
-- Shape of the feature: an iOS Shortcut POSTs to the `siri` Edge Function with a
-- personal bearer token (created in-app: Settings → Voice & Siri). The function
-- runs server-side with the service-role key, hashes the token, resolves it to a
-- user via api_tokens, then calls one of the RPCs below with the resolved
-- user_id. The RAW token never touches the database — only its SHA-256 hash is
-- stored, so a DB leak cannot be replayed against the API.
--
-- Idempotent (drop-then-create / if-not-exists) so a manual re-run in the SQL
-- editor converges instead of erroring.

-- ---------------------------------------------------------------------------
-- Personal API tokens for the voice endpoint (managed from the app)
-- ---------------------------------------------------------------------------
create table if not exists public.api_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token_hash   text not null,               -- sha256(token) as lowercase hex; the raw token is never stored
  label        text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz                  -- revoke = set this (soft, matches our delete-never convention)
);

create unique index if not exists api_tokens_hash_idx on public.api_tokens (token_hash);

alter table public.api_tokens enable row level security;

-- The user manages their OWN tokens from the app (create + revoke + list).
drop policy if exists api_tokens_select_own on public.api_tokens;
create policy api_tokens_select_own on public.api_tokens
  for select using (auth.uid() = user_id);
drop policy if exists api_tokens_insert_own on public.api_tokens;
create policy api_tokens_insert_own on public.api_tokens
  for insert with check (auth.uid() = user_id);
drop policy if exists api_tokens_update_own on public.api_tokens;
create policy api_tokens_update_own on public.api_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- No delete policy: revoking is an update (revoked_at), never a hard delete.

-- ---------------------------------------------------------------------------
-- RPCs the Edge Function calls (service-role only — see grants at the bottom)
-- ---------------------------------------------------------------------------

-- siri_add_task: append one open task for p_user_id. Mirrors the client's
-- addTask (features/tasks/taskActions.ts) — a bare task at matrix-centre
-- defaults (importance/urgency 50), which the app picks up on its next pull.
create or replace function public.siri_add_task(p_user_id uuid, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text text := btrim(p_text);
  v_id   uuid := gen_random_uuid();
begin
  if v_text = '' then
    return jsonb_build_object('ok', false, 'reason', 'empty');
  end if;
  insert into public.tasks (id, user_id, text)
  values (v_id, p_user_id, v_text);
  return jsonb_build_object('ok', true, 'id', v_id, 'text', v_text);
end;
$$;

-- siri_complete_task: find the best OPEN task matching p_text and complete it,
-- appending the SAME immutable event pair the client does (Decision 1): a
-- completions row + its coin_ledger earn, in ONE transaction (a function body
-- is atomic). Reward mirrors completionRewards(importance, urgency, false) in
-- domain/xp.ts:  xp = 10 + round(30 * (0.6*importance + 0.4*urgency)/100); 12
-- coins. A voice complete takes the stored base position — no crit, no focus
-- bonus, no deadline/graph urgency pull — so it stays simple and predictable.
create or replace function public.siri_complete_task(p_user_id uuid, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_needle        text := lower(btrim(p_text));
  v_task          public.tasks%rowtype;
  v_xp            integer;
  v_completion_id uuid := gen_random_uuid();
  v_now           timestamptz := now();
begin
  if v_needle = '' then
    return jsonb_build_object('ok', false, 'reason', 'empty');
  end if;

  -- Best match among the user's live, OPEN tasks: exact (normalised) beats a
  -- prefix beats a substring; newest wins remaining ties. done/deferred/deleted
  -- are ignored, so a voice "complete" never touches an already-finished task.
  select t.* into v_task
  from public.tasks t
  where t.user_id = p_user_id
    and t.status = 'open'
    and t.deleted_at is null
    and lower(t.text) like '%' || v_needle || '%'
  order by
    (lower(t.text) = v_needle) desc,
    (lower(t.text) like v_needle || '%') desc,
    t.created_at desc
  limit 1;

  if v_task.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_match');
  end if;

  v_xp := 10 + round(30 * (0.6 * v_task.importance + 0.4 * v_task.urgency) / 100.0);

  update public.tasks set status = 'done' where id = v_task.id;

  insert into public.completions
    (id, user_id, task_id, completed_at, xp_awarded, coins_awarded, multiplier)
  values
    (v_completion_id, p_user_id, v_task.id, v_now, v_xp, 12, 1);

  -- Ledger earn mirrors the completion's coins; ref_id points at the completion
  -- (matches buildCoinEarn in domain/completions.ts).
  insert into public.coin_ledger (id, user_id, delta, reason, ref_id, at)
  values (gen_random_uuid(), p_user_id, 12, 'completion', v_completion_id, v_now);

  return jsonb_build_object('ok', true, 'text', v_task.text, 'xp', v_xp, 'coins', 12);
end;
$$;

-- Lock the RPCs down: only the service role (i.e. the Edge Function) may call
-- them, so a signed-in client can never invoke them with a forged p_user_id.
revoke all on function public.siri_add_task(uuid, text) from public;
revoke all on function public.siri_complete_task(uuid, text) from public;
grant execute on function public.siri_add_task(uuid, text) to service_role;
grant execute on function public.siri_complete_task(uuid, text) to service_role;
