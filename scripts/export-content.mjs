/**
 * Writes public/data/events.json and team.json from the live database.
 *
 * These files are the fallback the public pages fall back to when Supabase is
 * unreachable, and app/events/page.tsx reads events.json at build time. Left
 * alone they would slowly freeze at whatever the content was on import day, so
 * this refreshes them.
 *
 * Uses the ANON key deliberately, not the service role key. It only needs to
 * read published rows, which the anon role may already do — so no secret has
 * to exist in CI at all.
 *
 * The output keeps the original file shape (current / upcoming / past, and
 * free-text date and time strings) so anything already reading these files
 * keeps working. lib/datetime.ts parses that format back.
 *
 * Run:  node scripts/export-content.mjs
 */

import { writeFileSync, readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
  process.exit(1);
}

const supabase = createClient(url, key);
const ZONE = "Australia/Melbourne";

const dayFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: ZONE, day: "numeric", month: "long", year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: ZONE, hour: "numeric", minute: "2-digit",
});

/** "6:00 pm" -> "6:00 PM", matching how the original file was written. */
function formatTime(iso) {
  return timeFmt.format(new Date(iso)).toUpperCase().replace(/\s+/g, " ").trim();
}

function toLegacyEvent(e, index) {
  const out = {
    id: index + 1,
    tag: e.tag,
    title: e.title,
    date: dayFmt.format(new Date(e.starts_at)),
    time: formatTime(e.starts_at),
    location: e.location ?? "",
    image: e.image_url ?? "",
    link: e.link ?? "",
  };
  if (e.description) out.description = e.description;
  if (e.cta) out.cta = e.cta;
  return out;
}

/** Writes only when the content actually changed, so the workflow does not
    produce an empty commit every week. */
function writeIfChanged(path, value) {
  const next = JSON.stringify(value, null, 2) + "\n";
  let current = "";
  try {
    current = readFileSync(path, "utf-8");
  } catch {
    /* first run */
  }
  if (current === next) {
    console.log(`unchanged: ${path}`);
    return false;
  }
  writeFileSync(path, next);
  console.log(`updated:   ${path}`);
  return true;
}

const { data: events, error: eventsError } = await supabase
  .from("events")
  .select("*")
  .eq("is_published", true)
  .order("starts_at", { ascending: false });

if (eventsError) {
  console.error("Could not read events:", eventsError.message);
  process.exit(1);
}

const { data: team, error: teamError } = await supabase
  .from("team_members")
  .select("*")
  .eq("is_published", true)
  .order("sort_order", { ascending: true })
  .order("created_at", { ascending: true });

if (teamError) {
  console.error("Could not read team members:", teamError.message);
  process.exit(1);
}

// Refuse to overwrite good files with nothing. An empty result is far more
// likely to mean a policy change or a bad query than a society that has
// deleted its entire committee.
if (team.length === 0) {
  console.error("The database returned no published team members. Refusing to overwrite team.json.");
  process.exit(1);
}

const now = Date.now();
const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now);
const past = events.filter((e) => new Date(e.starts_at).getTime() < now);
const featured = events.find((e) => e.is_featured) ?? upcoming[0] ?? events[0] ?? null;

const eventsJson = {
  current: featured ? toLegacyEvent(featured, 0) : null,
  upcoming: upcoming.map(toLegacyEvent),
  past: past.map(toLegacyEvent),
};

const teamJson = team.map((m) => ({
  id: m.slug,
  name: m.name,
  role: m.role,
  image: m.image_url ?? "",
  bio: m.bio ?? "",
  tags: m.tags ?? [],
  ...(m.linkedin_url ? { linkedin: m.linkedin_url } : {}),
}));

const a = writeIfChanged("public/data/events.json", eventsJson);
const b = writeIfChanged("public/data/team.json", teamJson);

console.log(`\n${events.length} events (${upcoming.length} upcoming), ${team.length} team members.`);
console.log(a || b ? "Content changed." : "Nothing changed.");
