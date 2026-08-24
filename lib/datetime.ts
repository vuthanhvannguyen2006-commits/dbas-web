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

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

/** Parses the old JSON format — "21 July 2026" plus "6:00 PM" — into an
    absolute instant, reading it as Melbourne time like everything else.
    Returns null rather than guessing if the strings are not that shape. */
export function parseLegacyDateTime(date: string, time: string): string | null {
  const dm = date?.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!dm) return null;
  const month = MONTHS[dm[2].toLowerCase()];
  if (!month) return null;

  const tm = time?.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!tm) return null;

  let hour = Number(tm[1]);
  const minute = tm[2];
  const meridiem = tm[3]?.toLowerCase();
  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  const local = `${dm[3]}-${month}-${dm[1].padStart(2, "0")}T${String(hour).padStart(2, "0")}:${minute}`;
  try {
    return melbourneLocalToIso(local);
  } catch {
    return null;
  }
}

/** "21 July 2026" — the date half only, for the event cards. */
export function formatEventDay(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** "6:00 pm" — the time half only. */
export function formatEventTime(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
