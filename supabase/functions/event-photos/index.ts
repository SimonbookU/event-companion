import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Two idempotent jobs for the event sales app, triggered by pg_cron:
//   ingest: copy LinkedIn profile photos (photo_source_url) into the private
//           event-photos bucket and set photo_path.
//   purge:  once an event's purge_after date has passed, delete its photos and
//           all scraped profile data (retention: 30 days after the event).
// No caller input is trusted beyond the action name: both jobs only act on rows
// already in the database, and ingest only fetches from LinkedIn's CDN.
// Deployed with verify_jwt = false (called by pg_net from pg_cron).

const BUCKET = "event-photos";
const ALLOWED_HOST = /(^|\.)licdn\.com$/;
const MAX_BYTES = 1_000_000;

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

Deno.serve(async (req) => {
  let action = "ingest";
  try {
    action = (await req.json())?.action ?? "ingest";
  } catch {
    // empty body: default action
  }
  const result = action === "purge" ? await purge() : await ingest();
  return Response.json({ action, ...result });
});

async function ingest() {
  const { data: rows, error } = await db
    .from("event_delegates")
    .select("id, event_id, photo_source_url")
    .not("photo_source_url", "is", null)
    .is("photo_path", null)
    .limit(150);
  if (error) return { error: error.message };

  let stored = 0;
  const failed: string[] = [];
  for (const r of rows ?? []) {
    try {
      const url = new URL(r.photo_source_url);
      if (url.protocol !== "https:" || !ALLOWED_HOST.test(url.hostname)) throw new Error("host not allowed");
      const res = await fetch(url);
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("image/")) throw new Error(`HTTP ${res.status} ${type}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_BYTES) throw new Error("image too large");
      const path = `${r.event_id}/${r.id}`;
      const up = await db.storage.from(BUCKET).upload(path, bytes, { contentType: type, upsert: true });
      if (up.error) throw up.error;
      const { error: ue } = await db.from("event_delegates").update({ photo_path: path }).eq("id", r.id);
      if (ue) throw ue;
      stored++;
    } catch (e) {
      failed.push(`${r.id}: ${(e as Error).message}`);
    }
  }
  return { candidates: rows?.length ?? 0, stored, failed };
}

async function purge() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: events, error } = await db
    .from("events")
    .select("id")
    .lte("purge_after", today)
    .is("purged_at", null);
  if (error) return { error: error.message };

  const purged: Record<string, number> = {};
  for (const ev of events ?? []) {
    let removed = 0;
    for (;;) {
      const { data: files, error: le } = await db.storage.from(BUCKET).list(ev.id, { limit: 100 });
      if (le) return { error: le.message, purged };
      if (!files?.length) break;
      const { error: re } = await db.storage.from(BUCKET).remove(files.map((f) => `${ev.id}/${f.name}`));
      if (re) return { error: re.message, purged };
      removed += files.length;
    }
    const { error: ue } = await db
      .from("event_delegates")
      .update({
        photo_source_url: null, photo_path: null, linkedin_url: null, headline: null,
        role_since: null, recent_posts: null, icebreaker: null, linkedin_activity: null,
        profile_match: null, profile_flag: null, profile_note: null,
      })
      .eq("event_id", ev.id);
    if (ue) return { error: ue.message, purged };
    await db.from("events").update({ purged_at: new Date().toISOString() }).eq("id", ev.id);
    purged[ev.id] = removed;
  }
  return { purged };
}
