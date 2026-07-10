-- 0001_init.sql — SKUNKWORKS expand baseline (SETUP.md §4, PRD §6).
--
-- Conventions enforced here (CLAUDE.md → sync-safe conventions):
--  * Every row: client-generated uuid id, created_at, server-authoritative
--    updated_at (trigger — never trusted from the client), soft-delete
--    deleted_at, user_id under RLS.
--  * Mutable tables (tasks, rewards): select/insert/update policies (LWW).
--  * Append-only logs (completions, focus_sessions, coin_ledger,
--    redemptions, fact_unlocks): select/insert ONLY — immutability is
--    enforced structurally, not by convention.
--  * No delete policy anywhere: all deletes are soft (deleted_at via
--    update); hard purge is a parked maintenance job.
--  * No FKs between user tables: the outbox may flush rows out of order
--    (e.g. a completion before its task), and log rows must outlive the
--    rows they reference. Referential slack is deliberate.
--  * All future changes are additive first (expand-contract).

-- Server stamps updated_at on every write; device clocks never decide a conflict.
create or replace function public.stamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Mutable tables (conflict resolution: last-write-wins on updated_at)
-- ---------------------------------------------------------------------------

create table public.tasks (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text        text not null,
  note        text,
  tag         text,
  estimate_ms integer,
  status      text not null default 'open' check (status in ('open', 'done', 'deferred')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table public.rewards (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  tier        text not null default 'small',
  coin_cost   integer not null check (coin_cost > 0),
  min_level   integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- Append-only event logs (never updated, never conflict; totals are derived)
-- ---------------------------------------------------------------------------

create table public.completions (
  id               uuid primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id          uuid,
  completed_at     timestamptz not null,
  xp_awarded       integer not null check (xp_awarded >= 0),
  coins_awarded    integer not null check (coins_awarded >= 0),
  multiplier       integer not null default 1,
  focus_session_id uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create table public.focus_sessions (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id    uuid,
  started_at timestamptz not null,
  ended_at   timestamptz,
  planned_ms integer not null,
  actual_ms  integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.coin_ledger (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  delta      integer not null, -- +earn / -spend; balance = sum(delta)
  reason     text not null,
  ref_id     uuid,
  at         timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.redemptions (
  id                   uuid primary key,
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reward_id            uuid,
  reward_name_snapshot text not null,
  coins_spent          integer not null check (coins_spent > 0),
  at                   timestamptz not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

create table public.fact_unlocks (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fact_id     text not null, -- stable bundled-content id, never reused
  unlocked_at timestamptz not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- updated_at triggers + delta-pull indexes (user_id, updated_at) on every table
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['tasks', 'rewards', 'completions', 'focus_sessions',
                           'coin_ledger', 'redemptions', 'fact_unlocks']
  loop
    execute format(
      'create trigger stamp_updated_at before insert or update on public.%I
         for each row execute function public.stamp_updated_at()', t);
    execute format(
      'create index %I on public.%I (user_id, updated_at)', t || '_user_updated_idx', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security: a user reads/writes only their own rows
-- ---------------------------------------------------------------------------

-- Mutable tables: select / insert / update (no delete — soft deletes only)
do $$
declare
  t text;
begin
  foreach t in array array['tasks', 'rewards']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id)
         with check (auth.uid() = user_id)',
      t || '_update_own', t);
  end loop;
end;
$$;

-- Append-only logs: select / insert only (immutable by policy)
do $$
declare
  t text;
begin
  foreach t in array array['completions', 'focus_sessions', 'coin_ledger',
                           'redemptions', 'fact_unlocks']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id)',
      t || '_insert_own', t);
  end loop;
end;
$$;
