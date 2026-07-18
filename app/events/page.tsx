"use client";
import { useState, useEffect } from "react";
import NavBar from "@/components/nav-bar/nav-bar";
import Footer from "@/components/footer/footer";
import MaxWidth from "@/components/max-width/max-width";
import Carousel, { type Slide } from "@/components/carousel/carousel";
import EventCard from "@/components/events-card/events-card";
import "@/app/events/global.css";

type CurrentEvent = {
  id: number;
  tag: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image: string;
  cta: string;
  link: string;
};

type Event = {
  id: number;
  tag: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
  link: string;
};

type EventsData = {
  current: CurrentEvent;
  upcoming: Event[];
  past: Event[];
};

/* Two generic filler slides — always shown alongside the current event
   so the carousel always has 3 slides and feels alive.
   Edit the text/images here to suit your branding. */
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

/* Convert the current event → generic Slide shape */
function toSlide(ev: CurrentEvent): Slide {
  return {
    id: ev.id,
    image: ev.image,
    imageAlt: ev.title,
    tag: ev.tag,
    title: ev.title,
    description: ev.description,
    meta: [`📅 ${ev.date} · ${ev.time}`, `📍 ${ev.location}`],
    cta: ev.cta,
    link: ev.link,
  };
}

export default function EventsPage() {
  const [data, setData] = useState<EventsData | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    fetch("/data/events.json")
      .then((res) => res.json())
      .then((json: EventsData) => setData(json))
      .catch((err) => console.error("Failed to load events:", err));
  }, []);

  if (!data) {
    return (
      <div className="events_page">
        <NavBar />
        <div className="events_loading">Loading events…</div>
        <Footer />
      </div>
    );
  }

  /* Current event first, then the two generic filler slides */
  const slides: Slide[] = [toSlide(data.current), ...GENERIC_SLIDES];

  const events = tab === "upcoming" ? data.upcoming : data.past;

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
                Upcoming ({data.upcoming.length})
              </button>
              <button
                className={`events_tab ${tab === "past" ? "events_tab_active" : ""}`}
                onClick={() => setTab("past")}
              >
                Past ({data.past.length})
              </button>
            </div>
          </div>

          <div className="events_grid">
            {events.map((ev) => (
              <EventCard
                key={ev.id}
                tag={ev.tag}
                title={ev.title}
                date={ev.date}
                time={ev.time}
                location={ev.location}
                image={ev.image}
                link={ev.link}
              />
            ))}
          </div>
        </MaxWidth>
      </section>

      <Footer />
    </div>
  );
}