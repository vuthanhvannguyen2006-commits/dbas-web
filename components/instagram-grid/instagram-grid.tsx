"use client";
import { useEffect } from "react";
import styles from "./instagram-grid.module.css";
import MaxWidth from "../max-width/max-width";
import Button from "../button/button";

const POSTS = [
  "https://www.instagram.com/p/DS3l5YUlEpg/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
  "https://www.instagram.com/p/DXRQjR2jFzb/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
  "https://www.instagram.com/p/DVvPNfNkuTL/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
];

export default function InstagramGrid() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    document.body.appendChild(script);
    script.onload = () => {
      const instagramWindow = window as Window & {
        instgrm?: { Embeds: { process: () => void } };
      };
      instagramWindow.instgrm?.Embeds.process();
    };
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <section className={styles.section}>
      <MaxWidth>
        <h1 className={`heading_on_white ${styles.heading}`}>
          <span className="heading_accent">FOLLOW</span> OUR INSTAGRAM
        </h1>
        <h2 className="subtitle_on_white">
          Catch up with latest events and information from DBAS via our Instagram account.
        </h2>
        <a href="https://www.instagram.com/dbas.deakin/" target="_blank" rel="noopener noreferrer">
          <Button text="Visit Our Instagram" />
        </a>
        <div className={styles.divider} />
        <div className={styles.embeds}>
          {POSTS.map((url, i) => (
            <div key={i} className={styles.embed_wrapper}>
              <blockquote
                className="instagram-media"
                data-instgrm-permalink={url}
                data-instgrm-version="14"
                style={{ width: "100%", margin: 0 }}
              />
            </div>
          ))}
        </div>
      </MaxWidth>
    </section>
  );
}
