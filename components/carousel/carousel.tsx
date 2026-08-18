"use client";
import { useState } from "react";
import styles from "./carousel.module.css";

export type Slide = {
  /* Widened from number: database ids are UUIDs. Only ever used as a React
     key, so nothing else is affected. */
  id: string | number;
  image: string;
  imageAlt?: string;
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