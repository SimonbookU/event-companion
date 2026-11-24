# bookU Event Companion

**Live:** https://simonbooku.github.io/event-companion/ (team login required)

A phone-first PWA for the bookU team at events:
- delegate cards with photo, background, recent posts, an opener, and how to talk to them per persona
- companies grouped by tier (A orange, B violet, C grey, Intel pink), plus search
- a personal coffee list per login (Coffees → Mine): assigned contacts to invite, then booked, accepted, invited, met; plus a team view with progress per owner
- the LinkedIn connection note and follow-up DM on each card, signed with the sender's own name, with copy buttons and one-tap status updates
- coffee planning in London time, and on-site notes shared with the team

It works offline after the first sign-in. Screenshots with fictional demo data are in [docs/screenshots](docs/screenshots).

## How it works

| Part | Where |
|---|---|
| Data | Supabase `krslddeyigckxgrxiimf`: `events`, `event_delegates`, `persona_playbook`. Schema is in `migrations/20261123_event_delegates.sql` and `migrations/20261123b_event_companion_app.sql` in the GTM repo. |
| Access | Supabase Auth, email + password. Only emails in `public.event_app_users` can read anything (RLS via `app_private.is_event_app_user()`); the team can also read that list (email, name) for owner labels. The app can only write the note fields: owner, invite status, coffee, interest, next step, notes. |
| Owners | `event_delegates.owner` is a team email (foreign key to `event_app_users`). `events.owner_pools` says which teammates take which tier, e.g. `{"A": ["lead@…"], "B": ["rep1@…", "rep2@…", "rep3@…"]}`. `event_delegates_retier()` calls `event_delegates_assign()`, which gives every invitee without an owner one: colleagues at the same company share an owner, otherwise the pool member with the fewest people. Existing owners never change; hand a contact over with the Owner field on its card. Migration: `migrations/20261124_event_owner_assignment.sql` in the GTM repo. |
| Invite texts | `events.outreach`: connection note per persona, DM, and Belgian-opener versions for warm-hook accounts. Placeholders `{first} {company} {company_local} {be_entity} {pain} {sender}`; `{sender}` is the signed-in teammate's name. |
| Photos | Private bucket `event-photos`, copied from LinkedIn by edge function `event-photos` ([source](supabase/functions/event-photos/index.ts)). pg_cron job `event-photos-ingest` runs it daily at 03:23 UTC. |
| Retention | `events.purge_after` (2027-01-01 for efe2026). pg_cron job `event-data-purge` (03:41 UTC) deletes photos and scraped profile data. Notes are kept. |
| Offline | The snapshot, photos and unsynced edits live in IndexedDB. Signing out clears them from the phone. |

## Add a teammate
1. Supabase → Authentication → Users → **Add user → Create new user**: email + password, with auto-confirm on.
2. Add them to the list: `insert into public.event_app_users (email, name) values ('name@booku.eu', 'Name');` (the name signs their invites).
3. Share the URL and password through a private channel.
4. To give them contacts: add their email to the tier's pool in `events.owner_pools`, then run `select * from public.event_delegates_retier('<event_id>');`. Only contacts without an owner are assigned; to split a tier again, first set `owner = null` for its contacts that have no activity yet.

Keep **Allow new users to sign up** switched off (Authentication → Sign In / Providers). Even with it on, data stays protected by the team list above.

## Run locally
```bash
npm install
npm run dev
```

## Deploy
GitHub Pages through [.github/workflows/deploy.yml](.github/workflows/deploy.yml). It builds with `--base=/<repo-name>/` on every push to `main`.

## Next event
1. Insert a row in `public.events` with `agenda`, `briefing`, `owner_pools`, `outreach`, and `purge_after` set to the end date + 30 days.
2. Load delegates with the GTM repo scripts (`scripts/score_event_delegates.py` → `scripts/event_delegates_upsert_sql.py`). Classify the segment of new companies, then run `select * from public.event_delegates_retier('<event_id>');` It sets tiers and gives new invitees an owner.
3. Change `EVENT_ID` and `EVENT_TZ` in [src/config.ts](src/config.ts), then deploy.
