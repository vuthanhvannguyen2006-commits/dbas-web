"use client";
/* Member photos are small thumbnails shown on demand; native images keep this simple. */
/* eslint-disable @next/next/no-img-element */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { initials, type PastMember } from "@/lib/memories-core";
import { trapDialogTab } from "@/lib/dialog-focus";
import {
  assignStars,
  fieldStars,
  nearestInDirection,
  projectConstellation,
  revealSchedule,
  sparklePath,
  type Cohort,
  type Direction,
} from "@/lib/constellations";
import s from "./constellation.module.css";
import MemoryRocket from "./memory-rocket";

const ARROWS: Record<string, Direction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

export default function Constellations({
  cohorts,
}: {
  cohorts: Cohort<PastMember>[];
}) {
  const [year, setYear] = useState(cohorts[0]?.year);
  const cohort = cohorts.find((c) => c.year === year) ?? cohorts[0];
  if (!cohort) return null;
  return (
    <section className={s.section} aria-label="Past committees by year">
      {cohorts.length > 1 && (
        <div className={s.years} role="group" aria-label="Committee year">
          {cohorts.map((c) => (
            <button
              key={c.year}
              type="button"
              aria-pressed={c.year === cohort.year}
              onClick={() => setYear(c.year)}
            >
              {c.year}
            </button>
          ))}
        </div>
      )}
      <CohortSky key={cohort.year} cohort={cohort} />
    </section>
  );
}

function CohortSky({ cohort }: { cohort: Cohort<PastMember> }) {
  const { year, constellation, members } = cohort;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = {
    glow: `glow-${uid}`,
    aurora: `aurora-${uid}`,
    bolt: `bolt-${uid}`,
    rayGlow: `ray-glow-${uid}`,
    title: `sky-title-${uid}`,
    help: `sky-help-${uid}`,
    panel: `sky-panel-${uid}`,
    name: `sky-name-${uid}`,
  };
  const sky = useMemo(
    () => projectConstellation(constellation),
    [constellation],
  );
  const { placements, stars } = useMemo(() => {
    const assigned = assignStars(sky, members, year);
    if (year === 2026) {
      const secretary = assigned.placements.find(
        (p) => p.member.former_role?.toLowerCase() === "secretary",
      );
      const treasurer = assigned.placements.find(
        (p) => p.member.former_role?.toLowerCase() === "treasurer",
      );
      if (secretary && treasurer)
        [secretary.star, treasurer.star] = [treasurer.star, secretary.star];
    }
    return assigned;
  }, [sky, members, year]);
  const field = useMemo(() => fieldStars(year, sky), [year, sky]);
  const reveal = useMemo(() => revealSchedule(sky, stars), [sky, stars]);
  const holderOf = useMemo(
    () => new Map(placements.map((p, i) => [p.star.id, i])),
    [placements],
  );

  const [selected, setSelected] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [pointed, setPointed] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const skyRef = useRef<HTMLDivElement>(null);
  const starRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  // Draw the figure lines once, the first time the sky scrolls into view.
  // The class is added directly so server and client render the same markup.
  useEffect(() => {
    const el = skyRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add(s.drawn);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add(s.drawn);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Native modal behaviour on phones keeps focus above the obscured page.
  // On desktop the same panel remains beside the sky as a non-modal dialog.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || selected === null) return;
    const media = window.matchMedia("(max-width: 1100px)");
    const overflow = document.body.style.overflow;
    const show = () => {
      if (panel.open) panel.close();
      if (media.matches) panel.showModal();
      else panel.show();
      document.body.style.overflow = media.matches ? "hidden" : overflow;
      headingRef.current?.focus({ preventScroll: media.matches });
    };
    show();
    media.addEventListener("change", show);
    return () => {
      media.removeEventListener("change", show);
      panel.close();
      document.body.style.overflow = overflow;
    };
  }, [selected]);

  function open(i: number, opener: HTMLElement, toggle: boolean) {
    skyRef.current?.classList.add(s.exploring);
    returnTo.current = opener;
    setActive(i);
    if (selected === i) {
      if (toggle) close();
      else headingRef.current?.focus();
      return;
    }
    setSelected(i);
  }

  function close() {
    panelRef.current?.close();
    setSelected(null);
    (returnTo.current ?? starRefs.current[active])?.focus();
  }

  function onStarClick(e: MouseEvent<HTMLButtonElement>, fallback: number) {
    // Overlapping touch areas must choose the closest visible star, not the
    // button that happens to occur last in the document. Keyboard clicks keep
    // their focused target (detail === 0).
    let index = fallback;
    if (e.detail > 0) {
      let distance = Infinity;
      starRefs.current.forEach((button, i) => {
        if (!button) return;
        const b = button.getBoundingClientRect();
        const d = Math.hypot(
          e.clientX - b.x - b.width / 2,
          e.clientY - b.y - b.height / 2,
        );
        if (d < distance) {
          distance = d;
          index = i;
        }
      });
    }
    open(index, starRefs.current[index] ?? e.currentTarget, true);
  }

  function onSkyKey(e: KeyboardEvent<HTMLDivElement>) {
    const direction = ARROWS[e.key];
    let next: number | null = null;
    if (direction) {
      next = nearestInDirection(
        placements.map((p) => p.star),
        active,
        direction,
      );
    } else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = placements.length - 1;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    starRefs.current[next]?.focus();
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape" && selected !== null) {
      e.preventDefault();
      close();
    }
  }

  const labelled = pointed ?? focused ?? selected;
  const current = selected === null ? null : placements[selected];
  const photo = current?.member.thumbnail_url || current?.member.image_url;
  const pct = (n: number, of: number) => `${(n / of) * 100}%`;

  return (
    <div className={`${s.cohort} ${paused ? s.paused : ""}`} onKeyDown={onKey}>
      <header className={s.head}>
        <h2 id={ids.title}>
          <span>{year}</span> Committee
        </h2>
        <button
          type="button"
          className={s.motionToggle}
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? "Resume animation" : "Pause animation"}
        </button>
        <button
          type="button"
          className={s.motionToggle}
          onClick={(event) => {
            const el = skyRef.current;
            if (!el) return;
            panelRef.current?.close();
            setSelected(null);
            event.currentTarget.focus();
            setPaused(false);
            el.classList.remove(s.drawn, s.exploring);
            void el.offsetWidth;
            el.classList.add(s.drawn);
          }}
        >
          Replay the stars
        </button>
      </header>

      <div className={s.stage}>
        <figure className={s.figure}>
          <div
            ref={skyRef}
            className={s.sky}
            style={
              {
                aspectRatio: `${sky.width} / ${sky.height}`,
                "--ratio": sky.width / sky.height,
                "--reveal-end": `${reveal.duration}s`,
              } as CSSProperties
            }
          >
            <svg
              className={s.svg}
              viewBox={`0 0 ${sky.width} ${sky.height}`}
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                <filter
                  id={ids.rayGlow}
                  filterUnits="userSpaceOnUse"
                  x={-200}
                  y={-200}
                  width={400}
                  height={400}
                >
                  <feGaussianBlur stdDeviation="3" />
                </filter>
                <filter
                  id={ids.bolt}
                  filterUnits="userSpaceOnUse"
                  x={-200}
                  y={-200}
                  width={sky.width + 400}
                  height={sky.height + 400}
                >
                  <feGaussianBlur stdDeviation="4" />
                </filter>
                <radialGradient id={ids.glow}>
                  <stop offset="0" stopColor="#fff7e8" stopOpacity="0.8" />
                  <stop offset="0.15" stopColor="#fff0d4" stopOpacity="0.3" />
                  <stop offset="0.45" stopColor="#ead3a5" stopOpacity="0.08" />
                  <stop offset="1" stopColor="#ead3a5" stopOpacity="0" />
                </radialGradient>
                <radialGradient id={ids.aurora}>
                  <stop offset="0" stopColor="#e3f7ff" stopOpacity="0.4" />
                  <stop offset="0.25" stopColor="#bdd5ed" stopOpacity="0.16" />
                  <stop offset="0.55" stopColor="#c0b1dc" stopOpacity="0.04" />
                  <stop offset="1" stopColor="#b498e8" stopOpacity="0" />
                </radialGradient>
              </defs>
              <g className={s.field}>
                {field.map((f, i) => (
                  <circle
                    key={i}
                    cx={f.x}
                    cy={f.y}
                    r={f.r}
                    opacity={f.opacity}
                    className={f.twinkle === null ? undefined : s.twinkle}
                    style={
                      f.twinkle === null
                        ? undefined
                        : { animationDelay: `${f.twinkle}s` }
                    }
                  />
                ))}
              </g>
              <g className={s.lines}>
                {reveal.lines.map(({ from: a, to: b, at }) => (
                  <path
                    key={`${a.id}-${b.id}`}
                    d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
                    pathLength={1}
                    style={{ animationDelay: `${at}s` }}
                  />
                ))}
              </g>
              <g className={s.currents}>
                {sky.lines.map(([a, b], i) => (
                  <g
                    key={`current-${a.id}-${b.id}`}
                    style={
                      {
                        "--bolt-delay": `${reveal.duration + i * 0.35}s`,
                      } as CSSProperties
                    }
                  >
                    <path
                      className={s.boltHalo}
                      d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
                      pathLength={100}
                      filter={`url(#${ids.bolt})`}
                    />
                    <path
                      className={s.boltColor}
                      d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
                      pathLength={100}
                    />
                    <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} pathLength={100} />
                  </g>
                ))}
              </g>
              {stars.map((star, starIndex) => {
                const holder = holderOf.get(star.id);
                const kind =
                  holder === undefined
                    ? s.idle
                    : star.kind === "extra"
                      ? s.extra
                      : s.held;
                return (
                  <g
                    key={star.id}
                    className={`${s.star} ${kind} ${holder === labelled ? s.awake : ""}`}
                    style={
                      {
                        "--phase": `${-starIndex * 1.7}s`,
                        "--sway-duration": `${13 + ((starIndex * 7) % 11)}s`,
                        "--pulse-duration": `${3.8 + ((starIndex * 3) % 7) * 0.43}s`,
                        "--turn": `${starIndex % 2 ? -1 : 1}`,
                        "--arrive": `${reveal.starTimes[star.id]}s`,
                      } as CSSProperties
                    }
                  >
                    <circle
                      className={s.aura}
                      cx={star.x}
                      cy={star.y}
                      r={star.r * 5.5}
                      fill={`url(#${ids.aurora})`}
                    />
                    <circle
                      className={s.glow}
                      cx={star.x}
                      cy={star.y}
                      r={star.r * 4.5}
                      fill={`url(#${ids.glow})`}
                    />
                    <g transform={`translate(${star.x} ${star.y})`}>
                      <g className={s.starTurn}>
                        <path
                          className={`${s.sparkle} ${s.sparkleHalo}`}
                          d={sparklePath(starIndex, star.r)}
                          filter={`url(#${ids.rayGlow})`}
                        />
                        <path
                          className={s.sparkle}
                          d={sparklePath(starIndex, star.r)}
                        />
                        {[0, 1].map((accent) => (
                          <path
                            key={accent}
                            className={s.sparkle}
                            style={{
                              fill: [
                                "#a8dfff",
                                "#d0b3ff",
                                "#ffb9d8",
                                "#a9ebdb",
                                "#ffe0a3",
                              ][(starIndex + accent * 2) % 5],
                            }}
                            d={sparklePath(starIndex, star.r, accent ? 3 : 1)}
                          />
                        ))}
                      </g>
                    </g>
                    <circle
                      className={s.core}
                      cx={star.x}
                      cy={star.y}
                      r={star.r * 0.26}
                    />
                    {holder !== undefined && holder === selected && (
                      <circle
                        className={s.ring}
                        cx={star.x}
                        cy={star.y}
                        r={star.r + 16}
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            <div
              className={s.hits}
              role="group"
              aria-labelledby={ids.title}
              aria-describedby={ids.help}
              onKeyDown={onSkyKey}
            >
              {placements.map((p, i) => (
                <button
                  key={p.member.id}
                  ref={(el) => {
                    starRefs.current[i] = el;
                  }}
                  type="button"
                  className={s.hit}
                  style={{
                    left: pct(p.star.x, sky.width),
                    top: pct(p.star.y, sky.height),
                  }}
                  tabIndex={i === active ? 0 : -1}
                  aria-pressed={selected === i}
                  aria-controls={ids.panel}
                  aria-label={`Meet ${p.member.name}${p.member.former_role ? `, ${p.member.former_role}` : ""}`}
                  onClick={(e) => onStarClick(e, i)}
                  onPointerEnter={() => setPointed(i)}
                  onPointerLeave={() => setPointed((v) => (v === i ? null : v))}
                  onFocus={() => {
                    skyRef.current?.classList.add(s.exploring);
                    setFocused(i);
                    setActive(i);
                  }}
                  onBlur={() => setFocused((v) => (v === i ? null : v))}
                />
              ))}
            </div>

            {labelled !== null && placements[labelled] && (
              <p
                className={`${s.tag} ${placements[labelled].star.y / sky.height < 0.16 ? s.below : ""} ${placements[labelled].star.x / sky.width < 0.25 ? s.alignStart : placements[labelled].star.x / sky.width > 0.75 ? s.alignEnd : ""}`}
                style={{
                  left: pct(placements[labelled].star.x, sky.width),
                  top: pct(placements[labelled].star.y, sky.height),
                }}
                aria-hidden="true"
              >
                <strong>{placements[labelled].member.name}</strong>
                <span>{placements[labelled].member.former_role}</span>
              </p>
            )}
          </div>
          <MemoryRocket />
          <figcaption className={s.caption}>
            Choose a star. Meet the people behind the year.
          </figcaption>
          <p id={ids.help} className={s.srOnly}>
            Each star is a member. Use the arrow keys to move between stars,
            Enter to open a member, and Escape to close.
          </p>
        </figure>

        <dialog
          ref={panelRef}
          id={ids.panel}
          className={`${s.panel} ${current ? s.open : ""}`}
          aria-labelledby={current ? ids.name : undefined}
          aria-label={current ? undefined : "Member details"}
          onCancel={(e) => {
            e.preventDefault();
            close();
          }}
          onKeyDown={trapDialogTab}
        >
          {current ? (
            <>
              <div className={s.panelTop}>
                <div className={s.portrait}>
                  {photo ? (
                    <img src={photo} alt="" />
                  ) : (
                    <span aria-hidden="true">
                      {initials(current.member.name)}
                    </span>
                  )}
                </div>
                <button type="button" className={s.close} onClick={close}>
                  Close
                </button>
              </div>
              <h3 id={ids.name} ref={headingRef} tabIndex={-1}>
                {current.member.name}
              </h3>
              {current.member.former_role && (
                <p className={s.role}>{current.member.former_role}</p>
              )}
              <p className={s.meta}>{current.member.years_active || year}</p>
              {current.member.bio && (
                <p className={s.bio}>{current.member.bio}</p>
              )}
            </>
          ) : (
            <p className={s.placeholder}>
              Choose a star to meet the member who holds it.
            </p>
          )}
        </dialog>
      </div>

      <details className={s.rosterBlock}>
        <summary className={s.rosterHeading}>
          Browse all {members.length} members
        </summary>
        <ol className={s.roster}>
          {placements.map((p, i) => (
            <li key={p.member.id}>
              <button
                type="button"
                className={s.rosterButton}
                aria-controls={ids.panel}
                aria-current={selected === i ? "true" : undefined}
                onClick={(e) => open(i, e.currentTarget, false)}
              >
                <span className={s.rosterName}>{p.member.name}</span>
                {p.member.former_role && <span>{p.member.former_role}</span>}
              </button>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
