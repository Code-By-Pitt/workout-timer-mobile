-- Locks user data down at the database level and makes account deletion cascade.
--
-- Both tables are queried directly from the mobile client using the publishable
-- key, so the database — not the app — has to be what stops one user reading
-- another's rows. spotify_tokens in particular stores plaintext OAuth refresh
-- tokens; without RLS it is readable by any authenticated user.
--
-- Safe to re-run.

-- 1. Row Level Security ------------------------------------------------------

alter table public.workouts enable row level security;
alter table public.spotify_tokens enable row level security;

-- auth.uid() is wrapped in a SELECT so the planner evaluates it once per query
-- instead of once per row. Policies are scoped to `authenticated` so the anon
-- role gets nothing at all.

drop policy if exists workouts_owner_policy on public.workouts;
create policy workouts_owner_policy on public.workouts
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists spotify_tokens_owner_policy on public.spotify_tokens;
create policy spotify_tokens_owner_policy on public.spotify_tokens
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 2. Indexes backing the policy predicate ------------------------------------
-- Every policy check filters on user_id, so this is on the hot path for all
-- reads, not just an optimization for large tables.

create index if not exists workouts_user_id_idx
  on public.workouts (user_id);

create index if not exists spotify_tokens_user_id_idx
  on public.spotify_tokens (user_id);

-- 3. Cascade deletes ---------------------------------------------------------
-- The delete-account Edge Function removes owned rows explicitly, but the FKs
-- should cascade too so no path can orphan data. Constraint names vary by how
-- the tables were created, so rebuild whichever ones exist.

do $$
declare
  fk record;
begin
  for fk in
    select con.conname,
           con.conrelid::regclass::text as tbl
    from pg_constraint con
    where con.contype = 'f'
      and con.confrelid = 'auth.users'::regclass
      and con.conrelid in (
        'public.workouts'::regclass,
        'public.spotify_tokens'::regclass
      )
      and con.confdeltype <> 'c'  -- 'c' = already ON DELETE CASCADE
  loop
    execute format('alter table %s drop constraint %I', fk.tbl, fk.conname);
    execute format(
      'alter table %s add constraint %I foreign key (user_id) '
      'references auth.users(id) on delete cascade',
      fk.tbl, fk.conname
    );
    raise notice 'Rebuilt % on % with ON DELETE CASCADE', fk.conname, fk.tbl;
  end loop;
end $$;
