"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/nav-bar/nav-bar";
import Footer from "@/components/footer/footer";
import MaxWidth from "@/components/max-width/max-width";
import Carousel, { type Slide } from "@/components/carousel/carousel";
import EventCard from "@/components/events-card/events-card";
import { loadEvents, splitByDate, type PublicEvent } from "@/lib/content";
import { formatEventDay, formatEventTime } from "@/lib/datetime";

/* Two generic filler slides — always shown alongside the featured event, so
   the carousel has something to show even with no events at all. */
const GENERIC_SLIDES: Slide[] = [
  {
    id: 98,
    image: "/speech.png",
    imageAlt: "DBAS members networking",
    title: "Build Skills. Make Connections.",
    description:
      "DBAS runs workshops, industry nights and competitions, giving members real experience and direct access to employers.",
    cta: "Become a Member",
    link: "https://www.dusa.org.au/clubs/deakin-business-and-analytics-society-dbas",
  },
  {
    id: 99,
    image: "/who-we-are.png",
    imageAlt: "DBAS competition",
    title: "Where Curious Minds Become Decision Makers.",
    description:
      "From information seminars to case competitions, every DBAS event is designed to close the gap between the classroom and the boardroom.",
    cta: "See All Events",
    link: "#events",
  },
];

function toSlide(ev: PublicEvent): Slide {
  const meta: string[] = [];
  if (ev.startsAt) meta.push(`📅 ${formatEventDay(ev.startsAt)} · ${formatEventTime(ev.startsAt)}`);
  if (ev.location) meta.push(`📍 ${ev.location}`);

  return {
    id: ev.id,
    image: ev.image,
    imageAlt: ev.title,
    tag: ev.tag,
    title: ev.title,
    description: ev.description ?? undefined,
    meta,
    cta: ev.cta ?? "Find out more",
    link: ev.link,
  };
}

/* `fallback` is read from the committed events.json on the server, so the page
   arrives with real content already in it. The database result replaces it once
   it arrives. If neither source can be read the fallback simply stays — which
   is why "nothing to show" can only ever mean a source actually answered and
   had nothing, never that a load failed. */
export default function EventsView({ fallback }: { fallback: PublicEvent[] }) {
  const [events, setEvents] = useState<PublicEvent[]>(fallback);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    let cancelled = false;

    loadEvents()
      .then(({ events: live, source }) => {
        if (cancelled || source === "unavailable") return;
        // Unlike the team list, an empty result is accepted here: a committee
        // genuinely can have no events, and showing stale ones would be worse.
        setEvents(live);
      })
      .catch((err) => console.warn("Events: keeping the built-in list.", err));

    return () => {
      cancelled = true;
    };
  }, []);

  const { upcoming, past } = splitByDate(events);

  /* Conditional: the previous version called this unconditionally and took the
     whole page down whenever nothing was featured. */
  const featured = events.find((e) => e.isFeatured);
  const slides: Slide[] = featured ? [toSlide(featured), ...GENERIC_SLIDES] : GENERIC_SLIDES;

  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div className="events_page">
      <NavBar />

      <Carousel slides={slides} />

      <section className="events_listing_section" id="events">
        <MaxWidth>
          <div className="events_listing_header">
            <h2 className="events_listing_title">Events</h2>
            <div className="events_tabs">
              <button
                className={`events_tab ${tab === "upcoming" ? "events_tab_active" : ""}`}
                onClick={() => setTab("upcoming")}
              >
                Upcoming ({upcoming.length})
              </button>
              <button
                className={`events_tab ${tab === "past" ? "events_tab_active" : ""}`}
                onClick={() => setTab("past")}
              >
                Past ({past.length})
              </button>
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="events_empty">
              {tab === "upcoming"
                ? "Nothing coming up just yet — check back soon, or follow us on Instagram for the first word."
                : "No past events to show."}
            </p>
          ) : (
            <div className="events_grid">
              {shown.map((ev) => (
                <EventCard
                  key={ev.id}
                  tag={ev.tag}
                  title={ev.title}
                  date={ev.startsAt ? formatEventDay(ev.startsAt) : ""}
                  time={ev.startsAt ? formatEventTime(ev.startsAt) : ""}
                  location={ev.location}
                  image={ev.image}
                  link={ev.link}
                />
              ))}
            </div>
          )}
        </MaxWidth>
      </section>

      <Footer />
    </div>
  );
}
