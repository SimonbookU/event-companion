# bookU Event Companion

A phone-first PWA for the bookU team at events:
- delegate cards with photo, background, recent posts, an opener, and how to talk to them per persona
- companies grouped by tier (A orange, B violet, C grey, Intel pink), plus search
- coffee planning in London time, and on-site notes shared with the team

It works offline after the first sign-in. Screenshots with fictional demo data are in [docs/screenshots](docs/screenshots).

## How it works

| Part | Where |
|---|---|
| Data | Supabase `krslddeyigckxgrxiimf`: `events`, `event_delegates`, `persona_playbook`. Schema is in `migrations/20261123_event_delegates.sql` and `migrations/20261123b_event_companion_app.sql` in the GTM repo. |
| Access | Supabase Auth, email + password. Only emails in `public.event_app_users` can read anything (RLS via `app_private.is_event_app_user()`). The app can only write the note fields: invite status, coffee, interest, next step, notes. |
| Photos | Private bucket `event-photos`, copied from LinkedIn by edge function `event-photos` ([source](supabase/functions/event-photos/index.ts)). pg_cron job `event-photos-ingest` runs it daily at 03:23 UTC. |
| Retention | `events.purge_after` (2027-01-01 for efe2026). pg_cron job `event-data-purge` (03:41 UTC) deletes photos and scraped profile data. Notes are kept. |
| Offline | The snapshot, photos and unsynced edits live in IndexedDB. Signing out clears them from the phone. |

## Add a teammate
1. Supabase → Authentication → Users → **Add user → Create new user**: email + password, with auto-confirm on.
2. Add them to the list: `insert into public.event_app_users (email, name) values ('name@booku.eu', 'Name');`
3. Share the URL and password through a private channel.

Keep **Allow new users to sign up** switched off (Authentication → Sign In / Providers). Even with it on, data stays protected by the team list above.

## Run locally
```bash
npm install
npm run dev
```

## Deploy
GitHub Pages through [.github/workflows/deploy.yml](.github/workflows/deploy.yml). It builds with `--base=/<repo-name>/` on every push to `main`.

## Next event
1. Insert a row in `public.events` with `agenda`, `briefing`, and `purge_after` set to the end date + 30 days.
2. Load delegates with the GTM repo scripts (`scripts/score_event_delegates.py` → `scripts/event_delegates_upsert_sql.py`). Classify the segment of new companies, then run `select * from public.event_delegates_retier('<event_id>');`
3. Change `EVENT_ID` and `EVENT_TZ` in [src/config.ts](src/config.ts), then deploy.
