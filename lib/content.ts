import { supabase } from "./supabase";
import { resolveImageUrl } from "./storage";
import { parseLegacyDateTime } from "./datetime";

/* Loading the public pages' content, from the database when it is reachable
   and from the JSON files committed in /public when it is not.
   Both sources are normalised into the same shape so the pages never have to
   know which one they got. */

export type PublicEvent = {
  id: string;
  tag: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  location: string;
  image: string;
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

export type Source = "database" | "fallback";

type LegacyEvent = {
  id?: number | string;
  tag?: string;
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  image?: string;
  cta?: string;
  link?: string;
};

function fromLegacy(e: LegacyEvent, featured: boolean): PublicEvent {
  return {
    id: String(e.id ?? e.title ?? Math.random()),
    tag: e.tag ?? "Social",
    title: e.title ?? "Untitled event",
    description: e.description ?? null,
    startsAt: parseLegacyDateTime(e.date ?? "", e.time ?? ""),
    location: e.location ?? "",
    image: resolveImageUrl(e.image) ?? "",
    cta: e.cta ?? null,
    link: e.link ?? "",
    isFeatured: featured,
  };
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
          cta: (e.cta as string) ?? null,
          link: (e.link as string) ?? "",
          isFeatured: Boolean(e.is_featured),
        })),
      };
    }
    console.warn("Events: falling back to committed JSON.", error?.message);
  }

  const res = await fetch("/data/events.json");
  const json = await res.json();

  // The old file listed the featured event twice, once under "current" and
  // again under "upcoming". Match on title and date so the duplicate does not
  // appear as a second card.
  const seen = new Set<string>();
  const out: PublicEvent[] = [];
  for (const [item, featured] of [
    [json.current, true] as const,
    ...((json.upcoming ?? []) as LegacyEvent[]).map((e) => [e, false] as const),
    ...((json.past ?? []) as LegacyEvent[]).map((e) => [e, false] as const),
  ]) {
    if (!item) continue;
    const key = `${item.title}|${item.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(fromLegacy(item, featured));
  }

  return { events: out, source: "fallback" };
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

  const res = await fetch("/data/team.json");
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
