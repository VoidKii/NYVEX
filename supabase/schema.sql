-- NYVEX per-user long-term memory.
-- Run this file in Supabase Dashboard -> SQL Editor.
-- Every row is privately scoped to the authenticated owner by RLS.
create extension if not exists pgcrypto;

create table if not exists public.nyvex_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists nyvex_memories_user_created_idx
  on public.nyvex_memories (user_id, created_at desc);

alter table public.nyvex_memories enable row level security;

drop policy if exists "Users can read their own NYVEX memories" on public.nyvex_memories;
create policy "Users can read their own NYVEX memories"
  on public.nyvex_memories for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own NYVEX memories" on public.nyvex_memories;
create policy "Users can create their own NYVEX memories"
  on public.nyvex_memories for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own NYVEX memories" on public.nyvex_memories;
create policy "Users can delete their own NYVEX memories"
  on public.nyvex_memories for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.nyvex_memories to authenticated;
revoke all on public.nyvex_memories from anon;

-- Defensive assertion: the exposed table must remain protected by RLS.
alter table public.nyvex_memories force row level security;
