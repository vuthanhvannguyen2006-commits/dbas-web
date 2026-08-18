import fs from "fs";
import path from "path";
import EventsView from "@/components/events/events-view";
import { adaptLegacyEvents, type PublicEvent } from "@/lib/content";
import "@/app/events/global.css";

/* Read at build time so the page ships with real content in it. The database
   replaces this in the browser a moment later.

   This is deliberately not a runtime fetch of the same file: if that request
   failed, the page would render "no events", which is indistinguishable from a
   society that genuinely has none. Reading it here means the fallback cannot
   fail at request time at all.

   The weekly job in Phase 8 rewrites events.json from the database, so this
   file stays close to current rather than freezing at today's content. */
function readCommittedEvents(): PublicEvent[] {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "events.json");
    return adaptLegacyEvents(JSON.parse(fs.readFileSync(filePath, "utf-8")));
  } catch (err) {
    console.error("Could not read the committed events.json.", err);
    return [];
  }
}

export default function EventsPage() {
  return <EventsView fallback={readCommittedEvents()} />;
}
