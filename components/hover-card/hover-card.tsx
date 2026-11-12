"use client";
import { useState, useSyncExternalStore, type MouseEvent } from "react";
import styles from "./hover-card.module.css";
import MaxWidth from "../max-width/max-width";

interface Pillar {
  id: string;
  number: string;
  letter: string;
  rest: string;
  badge: string;
  subheading: string;
  description: string;
  image: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
}

const pillars: Pillar[] = [
  {
    id: "discover",
    number: "01",
    letter: "D",
    rest: "iscover",
    badge: "DBAS",
    subheading: "Where business meets analytics",
    description:
      "Kickoff socials, information sessions and networking events that introduce you to the people, projects and pathways for Business Analytics.",
    image: "/discover.png",
  },
  {
    id: "build",
    number: "02",
    letter: "B",
    rest: "uild",
    badge: "BIZTALKS",
    subheading: "Networking night with industry experts",
    description:
      "Hear directly from analysts, consultants and founders. Build the network that turns coursework into a career.",
    image: "/build.png",
  },
  {
    id: "excelerate",
    number: "03",
    letter: "A",
    rest: "ccelerate",
    badge: "EXCEL-ERATE",
    subheading: "Turn spreadsheets into strategy",
    description:
      "Hands-on workshops in analytical and AI tools for business analysis.",
    image: "/apply.png",
  },
  {
    id: "hack",
    number: "04",
    letter: "S",
    rest: "olve",
    badge: "SHOWCASE REAL SKILLS",
    subheading: "Build real solutions for real clients",
    description:
      "Team up for case competitions and consulting projects with industry partners, turning real business problems into data-driven solutions.",
    image: "/solve.png",
  },
];

const touchQuery = "(hover: none), (pointer: coarse)";
function subscribeTouch(onChange: () => void) {
  const media = window.matchMedia(touchQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const getTouchSnapshot = () => window.matchMedia(touchQuery).matches;
const getServerTouchSnapshot = () => false;

export default function HoverCard() {
  const [activeId, setActiveId] = useState<string>(pillars[0].id);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
  });
  const isTouch = useSyncExternalStore(subscribeTouch, getTouchSnapshot, getServerTouchSnapshot);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>): void => {
    if (isTouch) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    });
  };

  const handleCardInteract = (id: string) => {
    setActiveId(id);
  };

  return (
    <section>
      <MaxWidth>
      <h1 className="heading_on_black">
        <span className="heading_accent">WHAT</span> WE DO
      </h1>           
      <h2 className="subtitle_on_black">
        Four pillars that define every DBAS year. Hover or tap to explore.
      </h2>
      <div
        className={styles["pillars-row"]}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          if (isTouch) return;
          setActiveId(pillars[0].id);
          setTooltip((t) => ({ ...t, visible: false }));
        }}
      >
        {tooltip.visible && !isTouch && (
          <span
            className={styles["pillars-tooltip"]}
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            Project preview
          </span>
        )}

        {pillars.map((pillar) => {
          const isActive = pillar.id === activeId;
          return (
            <div
              key={pillar.id}
              className={`${styles["pillar-card"]} ${
                isActive ? styles.active : ""
              }`}
              onMouseEnter={() => !isTouch && setActiveId(pillar.id)}
              onClick={() => handleCardInteract(pillar.id)}
              role="button"
              tabIndex={0}
            >
              {isActive ? (
                <div className={styles["pillar-expanded"]}>
                  <div className={styles["pillar-text"]}>
                    <h2 className={styles["pillar-title"]}>
                      <span className={styles.dropcap}>{pillar.letter}</span>
                      {pillar.rest}
                    </h2>

                    <span className={styles["pillar-badge"]}>
                      <span className={styles.dot} />
                      {pillar.badge}
                    </span>

                    <h3 className={styles["pillar-subheading"]}>
                      {pillar.subheading}
                    </h3>
                    <p className={styles["pillar-description"]}>
                      {pillar.description}
                    </p>
                  </div>

                  <div className={styles["pillar-image"]}>
                    <img src={pillar.image} alt={pillar.subheading} />
                  </div>
                </div>
              ) : (
                <div className={styles["pillar-collapsed"]}>
                  <span className={styles["collapsed-letter"]}>
                    {pillar.letter}
                  </span>
                  <span className={styles["collapsed-label"]}>
                    {pillar.badge}
                  </span>
                  <span className={styles["collapsed-number"]}>
                    {pillar.number}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      </MaxWidth>
    </section>
  );
}
