# Supabase setup

Two things must be applied before the iOS app ships.

## 1. Migration — RLS, indexes, cascade deletes

`migrations/20260827000000_secure_user_data.sql`

Both `workouts` and `spotify_tokens` are queried straight from the mobile client
with the publishable key, so RLS is what actually prevents one user reading
another's rows. `spotify_tokens` stores plaintext OAuth refresh tokens.

Apply with the CLI:

```bash
supabase link --project-ref xncjzcjorlydoedxywze
supabase db push
```

Or paste the file into the SQL Editor in the dashboard. It is safe to re-run.

**Verify afterwards:**

```sql
-- Both rows must show rowsecurity = true
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('workouts', 'spotify_tokens');

-- One policy per table, scoped to authenticated
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('workouts', 'spotify_tokens');

-- Both FKs must show 'c' (cascade)
select conrelid::regclass as tbl, conname, confdeltype
from pg_constraint
where contype = 'f' and confrelid = 'auth.users'::regclass;
```

The real test is behavioural: sign in as user A, note a workout id, then as
user B run `delete from workouts where id = '<A's id>'` through the client.
It must affect zero rows.

## 2. Edge Function — account deletion

`functions/delete-account/index.ts`

Required by App Store Guideline 5.1.1(v): an app with account creation must
offer in-app account deletion. The client cannot delete an auth user — that
needs the service-role key, which must never ship in the app bundle.

```bash
supabase functions deploy delete-account
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
injected by the platform; no secrets to set manually.

**Verify:** create a throwaway account in the app, add a workout, connect
Spotify, then Account → Delete Account. Confirm the `auth.users` row, its
`workouts`, and its `spotify_tokens` are all gone, and that the old credentials
no longer sign in.

## 3. Auth redirect URLs

So confirmation and password-recovery emails reopen the app, add this under
Authentication → URL Configuration → Redirect URLs:

```
workouttimer://auth-callback
```
