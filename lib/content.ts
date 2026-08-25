import { supabase } from "./supabase";
import { resolveImageUrl } from "./storage";
import { parseLegacyDateTime } from "./datetime";

/* Loading the public pages' content, from the database when it is reachable
   and from the JSON files committed in /public when it is not.
   Both sources are normalised into the same shape so the pages never have to
   know which one they got. */

export type CarouselFit = "cover" | "contain";

/* The database constrains both of these with CHECK constraints, so a row read
   from it is already safe. These guards exist for the other source: the
   committed JSON in /public is a hand-editable file, and it is read straight
   into the page at build time. Since the values are composed into an inline
   style attribute, "the database checks it" is not enough on its own — anything
   unexpected has to land on the default rather than reach the DOM. */
function clampPercent(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function safeFit(value: unknown): CarouselFit {
  return value === "contain" ? "contain" : "cover";
}

export type PublicEvent = {
  id: string;
  tag: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  location: string;
  image: string;
  /* Optional wide picture for the carousel banner. Empty for almost every
     event; the banner falls back to `image`, so nothing has to set this. */
  carouselImage: string;
  /* Where that picture is anchored in the banner, and whether it crops to fill
     or shows whole. Always valid by the time they get here — see clampPercent
     and safeFit — because both end up inside an inline style. */
  carouselFocalX: number;
  carouselFocalY: number;
  carouselFit: CarouselFit;
  cta: string | null;
  link: string;
  isFeatured: boolean;
};

export type PublicMember = {
  id: string;
  name: string;
  role: string;
  image: string;
  bio: string;
  tags: string[];
  linkedin?: string | null;
};

/* "unavailable" means neither source could be read — distinct from a source
   that answered and genuinely had nothing. Callers must not treat the two the
   same, or an outage renders as "this club has no events". */
export type Source = "database" | "fallback" | "unavailable";

type LegacyEvent = {
  id?: number | string;
  tag?: string;
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  image?: string;
  carouselImage?: string;
  carouselFocalX?: number;
  carouselFocalY?: number;
  carouselFit?: string;
  cta?: string;
  link?: string;
};

function fromLegacy(e: LegacyEvent, featured: boolean, index: number): PublicEvent {
  const startsAt = parseLegacyDateTime(e.date ?? "", e.time ?? "");

  // A date the parser rejects would otherwise slide quietly into "past" with
  // no date shown and no clue why. Say so.
  if (!startsAt) {
    console.warn(
      `Event "${e.title}" has an unreadable date/time ("${e.date}" / "${e.time}") and will be listed under Past.`
    );
  }

  return {
    // Stable, not random: a fresh id per load would remount every card.
    id: String(e.id ?? e.title ?? `legacy-${index}`),
    tag: e.tag ?? "Social",
    title: e.title ?? "Untitled event",
    description: e.description ?? null,
    startsAt,
    location: e.location ?? "",
    image: resolveImageUrl(e.image) ?? "",
    carouselImage: resolveImageUrl(e.carouselImage) ?? "",
    carouselFocalX: clampPercent(e.carouselFocalX ?? 50),
    carouselFocalY: clampPercent(e.carouselFocalY ?? 50),
    carouselFit: safeFit(e.carouselFit),
    cta: e.cta ?? null,
    link: e.link ?? "",
    isFeatured: featured,
  };
}

type LegacyEventsFile = {
  current?: LegacyEvent;
  upcoming?: LegacyEvent[];
  past?: LegacyEvent[];
};

/** Turns the old events.json shape into the normalised one.

    Exported because it runs in two places: on the server at build time, to
    embed a fallback in the page, and in the browser if the database is
    unreachable. */
export function adaptLegacyEvents(json: LegacyEventsFile): PublicEvent[] {
  // The old file lists the featured event twice, once under "current" and
  // again under "upcoming". Match on title and date so it is not shown twice.
  const seen = new Set<string>();
  const out: PublicEvent[] = [];
  let index = 0;

  for (const [item, featured] of [
    [json.current, true] as const,
    ...((json.upcoming ?? []) as LegacyEvent[]).map((e) => [e, false] as const),
    ...((json.past ?? []) as LegacyEvent[]).map((e) => [e, false] as const),
  ]) {
    if (!item) continue;
    const key = `${item.title}|${item.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(fromLegacy(item, featured, index++));
  }

  return out;
}

export async function loadEvents(): Promise<{ events: PublicEvent[]; source: Source }> {
  if (supabase) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("is_published", true)
      .order("starts_at", { ascending: false });

    if (!error && data) {
      return {
        source: "database",
        events: data.map((e) => ({
          id: e.id as string,
          tag: (e.tag as string) ?? "Social",
          title: e.title as string,
          description: (e.description as string) ?? null,
          startsAt: e.starts_at as string,
          location: (e.location as string) ?? "",
          image: resolveImageUrl(e.image_url as string) ?? "",
          carouselImage: resolveImageUrl(e.carousel_image_url as string) ?? "",
          carouselFocalX: clampPercent(e.carousel_focal_x ?? 50),
          carouselFocalY: clampPercent(e.carousel_focal_y ?? 50),
          carouselFit: safeFit(e.carousel_fit),
          cta: (e.cta as string) ?? null,
          link: (e.link as string) ?? "",
          isFeatured: Boolean(e.is_featured),
        })),
      };
    }
    console.warn("Events: falling back to committed JSON.", error?.message);
  }

  // Second line of defence, and it can fail too — the file could be missing
  // from a deploy. Failing here must not look the same as "this club has no
  // events", so the caller is told the load failed and keeps what it had.
  try {
    const res = await fetch("/data/events.json");
    if (!res.ok) throw new Error(`events.json returned ${res.status}`);
    return { events: adaptLegacyEvents(await res.json()), source: "fallback" };
  } catch (err) {
    console.error("Events: the committed JSON could not be read either.", err);
    return { events: [], source: "unavailable" };
  }
}

export async function loadTeam(): Promise<{ members: PublicMember[]; source: Source }> {
  if (supabase) {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (!error && data) {
      return {
        source: "database",
        members: data.map((m) => ({
          id: m.slug as string,
          name: m.name as string,
          role: m.role as string,
          image: resolveImageUrl(m.image_url as string) ?? "",
          bio: (m.bio as string) ?? "",
          tags: (m.tags as string[]) ?? [],
          linkedin: (m.linkedin_url as string) ?? null,
        })),
      };
    }
    console.warn("Team: falling back to committed JSON.", error?.message);
  }

  try {
    const res = await fetch("/data/team.json");
    if (!res.ok) throw new Error(`team.json returned ${res.status}`);
    const json = (await res.json()) as Array<Record<string, unknown>>;
    return {
      source: "fallback",
      members: json.map((m) => ({
        id: String(m.id),
        name: String(m.name ?? ""),
        role: String(m.role ?? ""),
        image: resolveImageUrl(m.image as string) ?? "",
        bio: String(m.bio ?? ""),
        tags: (m.tags as string[]) ?? [],
        linkedin: null,
      })),
    };
  } catch (err) {
    console.error("Team: the committed JSON could not be read either.", err);
    return { members: [], source: "unavailable" };
  }
}

/** Upcoming vs past comes from the date alone. An event with no usable date —
    only possible via the old JSON — is treated as past rather than dropped, so
    nothing silently disappears from the site. */
export function splitByDate(events: PublicEvent[]) {
  const now = Date.now();
  const upcoming = events
    .filter((e) => e.startsAt && new Date(e.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime());
  const past = events
    .filter((e) => !e.startsAt || new Date(e.startsAt).getTime() < now)
    .sort((a, b) => new Date(b.startsAt ?? 0).getTime() - new Date(a.startsAt ?? 0).getTime());
  return { upcoming, past };
}
