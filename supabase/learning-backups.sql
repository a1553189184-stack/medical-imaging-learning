-- Run once in Supabase Dashboard > SQL Editor before setting cloudBackupEnabled: true.
-- One encrypted-transport JSON backup per authenticated learner. This table never
-- accepts anonymous requests and RLS only exposes a learner's own row.
create table if not exists public.learning_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint learning_backups_payload_size check (octet_length(payload::text) <= 524288)
);

alter table public.learning_backups enable row level security;
revoke all on table public.learning_backups from anon;
grant select, insert, update on table public.learning_backups to authenticated;

drop policy if exists "Learners read their own backup" on public.learning_backups;
create policy "Learners read their own backup"
  on public.learning_backups for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Learners create their own backup" on public.learning_backups;
create policy "Learners create their own backup"
  on public.learning_backups for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Learners update their own backup" on public.learning_backups;
create policy "Learners update their own backup"
  on public.learning_backups for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
