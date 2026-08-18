"use client";
import { useEffect, useState } from "react";
import NavBar from "@/components/nav-bar/nav-bar";
import Footer from "@/components/footer/footer";
import MaxWidth from "@/components/max-width/max-width";
import Carousel, { type Slide } from "@/components/carousel/carousel";
import EventCard from "@/components/events-card/events-card";
import { loadEvents, splitByDate, type PublicEvent } from "@/lib/content";
import { formatEventDay, formatEventTime } from "@/lib/datetime";
import "@/app/events/global.css";

/* Two generic filler slides — always shown alongside the featured event
   so the carousel always has something to show, even with no events at all. */
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

export default function EventsPage() {
  const [events, setEvents] = useState<PublicEvent[] | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    let cancelled = false;
    loadEvents()
      .then(({ events }) => {
        if (!cancelled) setEvents(events);
      })
      .catch((err) => {
        console.error("Could not load events from either source:", err);
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (events === null) {
    return (
      <div className="events_page">
        <NavBar />
        <div className="events_loading">Loading events…</div>
        <Footer />
      </div>
    );
  }

  const { upcoming, past } = splitByDate(events);

  /* The featured event leads the carousel when there is one. Previously this
     assumed one always existed and crashed the whole page when it did not —
     which is a realistic state now that events are managed by hand. */
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
