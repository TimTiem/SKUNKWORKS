-- 0002_task_planning.sql — v1.1 expand (deadlines, subtasks, dependencies,
-- Eisenhower priority). EXPAND-ONLY per Decision 5: new nullable/defaulted
-- columns + one new table. Old offline clients keep working untouched.

-- Tasks gain planning fields. All additive with safe defaults.
alter table public.tasks
  add column if not exists due_at     timestamptz,          -- optional deadline (FR-11 metadata)
  add column if not exists parent_id  uuid,                 -- subtask -> parent task (no FK: outbox order)
  add column if not exists importance integer not null default 50, -- 0..100, Eisenhower y-axis
  add column if not exists urgency    integer not null default 50; -- 0..100, user-set base; effective urgency derived

-- Dependencies: blocked_id waits for blocker_id. A separate mutable row per
-- link (LWW + soft delete) instead of an array column, so edits from two
-- devices merge per-link instead of clobbering a whole array.
create table if not exists public.task_links (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked_id uuid not null,
  blocker_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger stamp_updated_at before insert or update on public.task_links
  for each row execute function public.stamp_updated_at();

create index task_links_user_updated_idx on public.task_links (user_id, updated_at);

alter table public.task_links enable row level security;
create policy task_links_select_own on public.task_links
  for select using (auth.uid() = user_id);
create policy task_links_insert_own on public.task_links
  for insert with check (auth.uid() = user_id);
create policy task_links_update_own on public.task_links
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
