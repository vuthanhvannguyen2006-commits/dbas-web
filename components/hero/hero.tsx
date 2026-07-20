"use client";
import { useRef } from "react";
import styles from "./hero.module.css";

const taglines = [
  "Leadership",
  "Networking",
  "Workshops",
  "Competitions",
  "Career Opportunities",
  "Connections",
];

export default function Hero() {
  const heroRef = useRef(null);

  const handleGetStarted = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section ref={heroRef} className={styles.hero}>
      <div className={styles.hero_bg} aria-hidden="true" />

      <div className={styles.hero_inner}>
        {/* Left: heading + rotating word */}
        <div className={styles.hero_left}>
          <h1 className={styles.hero_heading}>
            Empowering the Next Generation of
          </h1>

          <div className={styles.rotate_wrapper}>
            {taglines.map((word, i) => (
              <span key={i} className={styles.rotate_word}>
                {word}
              </span>
            ))}
          </div>

          <p className={styles.hero_subtext}>
            Deakin Business & Analytics Society, where you build skills,
            relationships and careers.
          </p>

          <button className={styles.hero_button} onClick={handleGetStarted}>
            <span>Get started</span>
            <svg
              className={styles.hero_button_icon}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M5 12H19M19 12L13 6M19 12L13 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Right: scattered floating image cards */}
        <div className={styles.hero_right}>
          <div className={`${styles.image_card} ${styles.card_one}`}>
            <img src="/hero-1.png" alt="DBAS event" />
          </div>
          <div className={`${styles.image_card} ${styles.card_two}`}>
            <img src="/hero-2.png" alt="DBAS workshop" />
          </div>
          <div className={`${styles.image_card} ${styles.card_three}`}>
            <img src="/hero-3.png" alt="DBAS networking" />
          </div>
        </div>
      </div>
    </section>
  );
}