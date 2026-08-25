"use client";
import { useState } from "react";
import styles from "./carousel.module.css";

export type Slide = {
  /* Widened from number: database ids are UUIDs. Only ever used as a React
     key, so nothing else is affected. */
  id: string | number;
  image: string;
  imageAlt?: string;
  /* Framing for this slide's picture. Both are composed by the caller from
     already-validated values — this component does no checking of its own,
     because they go straight into an inline style. Omitted for the generic
     slides, which then fall back to what the stylesheet already does. */
  imageFit?: "cover" | "contain";
  /** Shift from centre, as a percentage of the slide's own width and height. */
  imageOffsetX?: number;
  imageOffsetY?: number;
  /** Size as a multiplier; 1 fills the slide, below 1 leaves the ground showing. */
  imageZoom?: number;
  tag?: string;
  title: string;
  description?: string;
  meta?: string[];
  cta?: string;
  link?: string;
};

type Props = {
  slides: Slide[];
};

/* Returns undefined rather than a no-op transform when nothing has been moved,
   so an untouched slide renders with no transform at all — which is what the
   two generic slides want, and what every event looked like before any of this
   existed. Shared with the admin preview by being the same shape of string;
   if this changes, the preview has to change with it or it stops previewing. */
function transformFor(slide: Slide): string | undefined {
  const x = slide.imageOffsetX ?? 0;
  const y = slide.imageOffsetY ?? 0;
  const zoom = slide.imageZoom ?? 1;
  if (x === 0 && y === 0 && zoom === 1) return undefined;
  return `translate(${x}%, ${y}%) scale(${zoom})`;
}

export default function Carousel({ slides }: Props) {
  const [current, setCurrent] = useState(0);

  const prev = () =>
    setCurrent((s) => (s - 1 + slides.length) % slides.length);
  const next = () =>
    setCurrent((s) => (s + 1) % slides.length);

  return (
    <section className={styles.section}>
      <div className={styles.track}>
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`${styles.slide} ${i === current ? styles.slide_active : ""}`}
            aria-hidden={i !== current}
          >
            <img
              src={slide.image}
              alt={slide.imageAlt ?? slide.title}
              className={styles.img}
              style={{
                objectFit: slide.imageFit ?? "cover",
                /* Position comes from a transform rather than object-position,
                   which is defined as a point *inside* the box and therefore
                   clamps at the picture's own edges. A translate does not, so
                   the picture can be pushed past the edge and sit smaller than
                   the banner, with the section's ground showing behind it.

                   Percentages in translate() resolve against this element's own
                   border box — the slide — and not against the scale, so a drag
                   of N pixels always moves the picture N pixels whatever the
                   zoom. The section clips the overflow. */
                transform: transformFor(slide),
              }}
            />
            <div className={styles.overlay} />
            <div className={styles.card}>
              {slide.tag && (
                <span className={styles.tag}>{slide.tag}</span>
              )}
              <h2 className={styles.title}>{slide.title}</h2>
              {slide.description && (
                <p className={styles.desc}>{slide.description}</p>
              )}
              {slide.meta && slide.meta.length > 0 && (
                <ul className={styles.meta}>
                  {slide.meta.map((line, j) => (
                    <li key={j}>{line}</li>
                  ))}
                </ul>
              )}
              {slide.cta && slide.link && (
                <a href={slide.link} className={styles.btn}>
                  {slide.cta}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Only render controls when there's more than one slide */}
      {slides.length > 1 && (
        <div className={styles.controls}>
          <button className={styles.arrow} onClick={prev} aria-label="Previous">
            ‹
          </button>
          <div className={styles.dots}>
            {slides.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === current ? styles.dot_active : ""}`}
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button className={styles.arrow} onClick={next} aria-label="Next">
            ›
          </button>
        </div>
      )}
    </section>
  );
}