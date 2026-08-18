/* Event times are stored as timestamptz (an absolute instant) but written and
   read by people thinking in Melbourne time, where every DBAS event happens.
   A fixed +10 or +11 offset would be wrong for half the year because of
   daylight saving, so the offset is derived from the date itself. */

const ZONE = "Australia/Melbourne";

/** How far ahead of UTC Melbourne is at this particular instant, in ms. */
function zoneOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );

  return asIfUtc - instant.getTime();
}

/** "2026-09-01T18:00" typed by a committee member → the matching UTC instant. */
export function melbourneLocalToIso(local: string): string {
  const pretendUtc = new Date(`${local}:00Z`);
  const offset = zoneOffsetMs(pretendUtc);
  return new Date(pretendUtc.getTime() - offset).toISOString();
}

/** A stored instant → the "YYYY-MM-DDTHH:mm" a datetime-local input expects. */
export function isoToMelbourneLocal(iso: string): string {
  const instant = new Date(iso);
  const shifted = new Date(instant.getTime() + zoneOffsetMs(instant));
  return shifted.toISOString().slice(0, 16);
}

/** Human-readable, always in Melbourne time: "21 July 2026, 6:00 pm". */
export function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

/** A URL-safe key derived from the title and date, used so the JSON import and
    any re-run stay idempotent rather than creating duplicates. */
export function makeSlug(title: string, iso: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "event"}-${iso.slice(0, 10)}`;
}
