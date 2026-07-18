-- 0004_siri_voice_v2.sql — Voice control v2: EDIT tasks + rewards by voice.
-- EXPAND-ONLY per Decision 5: only new functions (no table/column/policy change),
-- so old offline clients keep working untouched. Builds on 0003_siri_api.sql
-- (api_tokens + siri_add_task / siri_complete_task), which stay as-is.
--
-- Shape unchanged from 0003: the `siri` Edge Function runs server-side with the
-- service-role key, resolves a personal token to a user, then calls exactly one
-- of the RPCs below with the resolved user_id. Every RPC is security-definer and
-- execute-revoked from `public` (grants at the bottom) so a signed-in client can
-- never invoke them with a forged p_user_id. Idempotent (create-or-replace) so a
-- manual re-run in the SQL editor converges.

-- ---------------------------------------------------------------------------
-- Internal match helpers (locked down — service_role only, like every RPC here)
-- ---------------------------------------------------------------------------

-- Best OPEN/eligible task by spoken text, mirroring siri_complete_task's ranking
-- (exact → prefix → substring; newest wins ties). p_statuses lets callers widen
-- the pool (e.g. delete also targets deferred). done/deleted are never matched.
create or replace function public.siri_match_task(
  p_user_id uuid, p_needle text, p_statuses text[]
) returns public.tasks
language sql
stable
security definer
set search_path = public
as $$
  select t.*
  from public.tasks t
  where t.user_id = p_user_id
    and t.deleted_at is null
    and t.status = any(p_statuses)
    and lower(t.text) like '%' || lower(btrim(p_needle)) || '%'
  order by
    (lower(t.text) = lower(btrim(p_needle))) desc,
    (lower(t.text) like lower(btrim(p_needle)) || '%') desc,
    t.created_at desc
  limit 1;
$$;

-- Best live reward by spoken name (same ranking).
create or replace function public.siri_match_reward(
  p_user_id uuid, p_needle text
) returns public.rewards
language sql
stable
security definer
set search_path = public
as $$
  select r.*
  from public.rewards r
  where r.user_id = p_user_id
    and r.deleted_at is null
    and lower(r.name) like '%' || lower(btrim(p_needle)) || '%'
  order by
    (lower(r.name) = lower(btrim(p_needle))) desc,
    (lower(r.name) like lower(btrim(p_needle)) || '%') desc,
    r.created_at desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Level curve (LOCKED — mirror of domain/levels.ts; the curve never changes,
-- per CLAUDE.md, so this duplication can't drift). Used by siri_status so the
-- voice read-back matches exactly what the app shows.
-- ---------------------------------------------------------------------------
create or replace function public.siri_xp_for_level(p_level integer)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  base   integer[] := array[0, 60, 150, 280, 460, 700, 1000, 1370, 1820, 2360]; -- levels 1..10
  growth integer := 90;   -- late game: each delta grows by +90 per level
  total  integer;
  delta  integer;
  l      integer;
begin
  if p_level <= 1 then return 0; end if;
  if p_level <= array_length(base, 1) then return base[p_level]; end if;
  total := base[array_length(base, 1)];
  delta := base[array_length(base, 1)] - base[array_length(base, 1) - 1];
  for l in (array_length(base, 1) + 1)..p_level loop
    delta := delta + growth;
    total := total + delta;
  end loop;
  return total;
end;
$$;

create or replace function public.siri_level_info(p_total_xp integer)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  lvl integer := 1;
begin
  while public.siri_xp_for_level(lvl + 1) <= p_total_xp loop
    lvl := lvl + 1;
  end loop;
  return jsonb_build_object(
    'level', lvl,
    'xp_to_next', public.siri_xp_for_level(lvl + 1) - p_total_xp
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Tasks — add (rich) / defer / delete / set-priority / set-note
-- ---------------------------------------------------------------------------

-- Add a task, optionally with a deadline and matrix position (the AI parser can
-- fill these from a phrase like "remind me tomorrow, it's important"). Nulls
-- fall back to the schema defaults (matrix centre 50/50, no deadline). Mirrors
-- newTask() in domain/tasks.ts. Superset of 0003's siri_add_task.
create or replace function public.siri_add_task_v2(
  p_user_id uuid,
  p_text text,
  p_due_at timestamptz default null,
  p_importance integer default null,
  p_urgency integer default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text text := btrim(p_text);
  v_id   uuid := gen_random_uuid();
  v_imp  integer := greatest(0, least(100, coalesce(p_importance, 50)));
  v_urg  integer := greatest(0, least(100, coalesce(p_urgency, 50)));
begin
  if v_text = '' then
    return jsonb_build_object('ok', false, 'reason', 'empty');
  end if;
  insert into public.tasks (id, user_id, text, due_at, importance, urgency)
  values (v_id, p_user_id, v_text, p_due_at, v_imp, v_urg);
  return jsonb_build_object('ok', true, 'id', v_id, 'text', v_text, 'due_at', p_due_at);
end;
$$;

-- Defer (snooze) the best-matching open task — status → 'deferred'. Quiet, no
-- reward, matches deferTask() in taskActions.ts (P8: undone defers quietly).
create or replace function public.siri_defer_task(p_user_id uuid, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
begin
  v_task := public.siri_match_task(p_user_id, p_text, array['open']);
  if v_task.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_match');
  end if;
  update public.tasks set status = 'deferred' where id = v_task.id;
  return jsonb_build_object('ok', true, 'text', v_task.text);
end;
$$;

-- Soft-delete the best-matching open OR deferred task (never a done one), the
-- delete-never convention (deleted_at tombstone). Mirrors softDeleteTask().
create or replace function public.siri_delete_task(p_user_id uuid, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
begin
  v_task := public.siri_match_task(p_user_id, p_text, array['open', 'deferred']);
  if v_task.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_match');
  end if;
  update public.tasks set deleted_at = now() where id = v_task.id;
  return jsonb_build_object('ok', true, 'text', v_task.text);
end;
$$;

-- Reprioritise: set the matrix position of the best-matching open task. Either
-- axis may be null to leave it unchanged (e.g. "important X" bumps importance
-- only). Clamped 0..100. Mirrors setTaskPriority() in taskActions.ts.
create or replace function public.siri_set_priority(
  p_user_id uuid, p_text text, p_importance integer default null, p_urgency integer default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
  v_imp  integer;
  v_urg  integer;
begin
  v_task := public.siri_match_task(p_user_id, p_text, array['open']);
  if v_task.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_match');
  end if;
  v_imp := greatest(0, least(100, coalesce(p_importance, v_task.importance)));
  v_urg := greatest(0, least(100, coalesce(p_urgency, v_task.urgency)));
  update public.tasks set importance = v_imp, urgency = v_urg where id = v_task.id;
  return jsonb_build_object('ok', true, 'text', v_task.text, 'importance', v_imp, 'urgency', v_urg);
end;
$$;

-- Attach a note to the best-matching open task (optional metadata, FR-11).
create or replace function public.siri_set_note(p_user_id uuid, p_text text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
  v_note text := nullif(btrim(p_note), '');
begin
  v_task := public.siri_match_task(p_user_id, p_text, array['open']);
  if v_task.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_match');
  end if;
  update public.tasks set note = v_note where id = v_task.id;
  return jsonb_build_object('ok', true, 'text', v_task.text);
end;
$$;

-- ---------------------------------------------------------------------------
-- Rewards — add / set-cost / redeem (Decision 2: redeeming spends COINS only;
-- XP and level are never touched)
-- ---------------------------------------------------------------------------

-- Add a real-world reward. Mirrors newReward() in domain/rewards.ts; cost must
-- be > 0 (the rewards.coin_cost check). tier defaults to 'small'.
create or replace function public.siri_add_reward(
  p_user_id uuid, p_name text, p_cost integer, p_tier text default 'small'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(p_name);
  v_id   uuid := gen_random_uuid();
  v_tier text := coalesce(nullif(btrim(p_tier), ''), 'small');
begin
  if v_name = '' then
    return jsonb_build_object('ok', false, 'reason', 'empty');
  end if;
  if p_cost is null or p_cost <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'bad_cost');
  end if;
  insert into public.rewards (id, user_id, name, tier, coin_cost)
  values (v_id, p_user_id, v_name, v_tier, p_cost);
  return jsonb_build_object('ok', true, 'id', v_id, 'name', v_name, 'cost', p_cost);
end;
$$;

-- Re-cost an existing reward (edit). Mirrors updateReward() (LWW row update).
create or replace function public.siri_set_reward_cost(
  p_user_id uuid, p_name text, p_cost integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward public.rewards%rowtype;
begin
  if p_cost is null or p_cost <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'bad_cost');
  end if;
  v_reward := public.siri_match_reward(p_user_id, p_name);
  if v_reward.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_match');
  end if;
  update public.rewards set coin_cost = p_cost where id = v_reward.id;
  return jsonb_build_object('ok', true, 'name', v_reward.name, 'cost', p_cost);
end;
$$;

-- Redeem a reward by voice: re-check the balance from the ledger, then append
-- the SAME immutable pair the client does (redemptions row + a negative
-- coin_ledger spend) in ONE transaction. XP/level untouched (P4). Mirrors
-- redeemReward() in rewardActions.ts + buildRedemption/buildCoinSpend.
create or replace function public.siri_redeem_reward(p_user_id uuid, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward        public.rewards%rowtype;
  v_balance       integer;
  v_redemption_id uuid := gen_random_uuid();
  v_now           timestamptz := now();
begin
  v_reward := public.siri_match_reward(p_user_id, p_name);
  if v_reward.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_match');
  end if;

  select coalesce(sum(delta), 0) into v_balance
  from public.coin_ledger
  where user_id = p_user_id and deleted_at is null;

  if v_balance < v_reward.coin_cost then
    return jsonb_build_object(
      'ok', false, 'reason', 'insufficient',
      'name', v_reward.name, 'cost', v_reward.coin_cost, 'balance', v_balance,
      'short', v_reward.coin_cost - v_balance
    );
  end if;

  insert into public.redemptions
    (id, user_id, reward_id, reward_name_snapshot, coins_spent, at)
  values
    (v_redemption_id, p_user_id, v_reward.id, v_reward.name, v_reward.coin_cost, v_now);

  insert into public.coin_ledger (id, user_id, delta, reason, ref_id, at)
  values (gen_random_uuid(), p_user_id, -v_reward.coin_cost, 'redemption', v_redemption_id, v_now);

  return jsonb_build_object(
    'ok', true, 'name', v_reward.name, 'coins_spent', v_reward.coin_cost,
    'balance', v_balance - v_reward.coin_cost
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Reads — status / next task (voice read-backs; state out of the head, P3)
-- ---------------------------------------------------------------------------

-- Level / XP-to-next / coin balance / open-task count — all derived from the
-- append-only logs (25 = ENDOWED_XP from domain/xp.ts), so they match the app.
create or replace function public.siri_status(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_xp integer;
  v_coins    integer;
  v_open     integer;
  v_info     jsonb;
begin
  select 25 + coalesce(sum(xp_awarded), 0) into v_total_xp
  from public.completions where user_id = p_user_id and deleted_at is null;

  select coalesce(sum(delta), 0) into v_coins
  from public.coin_ledger where user_id = p_user_id and deleted_at is null;

  select count(*) into v_open
  from public.tasks where user_id = p_user_id and status = 'open' and deleted_at is null;

  v_info := public.siri_level_info(v_total_xp);
  return jsonb_build_object(
    'ok', true,
    'total_xp', v_total_xp,
    'level', v_info -> 'level',
    'xp_to_next', v_info -> 'xp_to_next',
    'coins', v_coins,
    'open', v_open
  );
end;
$$;

-- The single highest-priority open task (matrix score: importance weighted over
-- urgency, same 0.6/0.4 split as domain/xp.ts; earlier deadline then newer wins
-- ties). "What should I do next?" without opening the app.
create or replace function public.siri_next_task(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
begin
  select t.* into v_task
  from public.tasks t
  where t.user_id = p_user_id and t.status = 'open' and t.deleted_at is null
  order by
    (0.6 * t.importance + 0.4 * t.urgency) desc,
    t.due_at asc nulls last,
    t.created_at desc
  limit 1;

  if v_task.id is null then
    return jsonb_build_object('ok', true, 'empty', true);
  end if;
  return jsonb_build_object('ok', true, 'text', v_task.text, 'due_at', v_task.due_at);
end;
$$;

-- ---------------------------------------------------------------------------
-- Lock everything down: only the service role (the Edge Function, after it has
-- validated the caller's token) may execute these. Postgres grants EXECUTE to
-- PUBLIC by default, so each must be revoked explicitly (as in 0003).
-- ---------------------------------------------------------------------------
do $$
declare
  sig text;
begin
  foreach sig in array array[
    'public.siri_match_task(uuid, text, text[])',
    'public.siri_match_reward(uuid, text)',
    'public.siri_xp_for_level(integer)',
    'public.siri_level_info(integer)',
    'public.siri_add_task_v2(uuid, text, timestamptz, integer, integer)',
    'public.siri_defer_task(uuid, text)',
    'public.siri_delete_task(uuid, text)',
    'public.siri_set_priority(uuid, text, integer, integer)',
    'public.siri_set_note(uuid, text, text)',
    'public.siri_add_reward(uuid, text, integer, text)',
    'public.siri_set_reward_cost(uuid, text, integer)',
    'public.siri_redeem_reward(uuid, text)',
    'public.siri_status(uuid)',
    'public.siri_next_task(uuid)'
  ]
  loop
    execute format('revoke all on function %s from public', sig);
    execute format('grant execute on function %s to service_role', sig);
  end loop;
end;
$$;
