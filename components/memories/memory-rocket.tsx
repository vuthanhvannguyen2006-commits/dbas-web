"use client";

import { useId, useState } from "react";
import s from "./constellation.module.css";

/** Keep the moving credit independent from the member-selection state. */
export default function MemoryRocket() {
  const creditId = useId();
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditHovered, setCreditHovered] = useState(false);
  const creditShown = creditOpen || creditHovered;

  return (
    <div
      className={`${s.rocketFlight} ${creditOpen ? s.rocketStopped : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && creditShown) {
          event.stopPropagation();
          setCreditOpen(false);
          setCreditHovered(false);
        }
      }}
    >
      <button
        type="button"
        className={s.rocket}
        aria-label="Meet the page maker"
        aria-expanded={creditShown}
        aria-controls={creditId}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setCreditHovered(true);
        }}
        onPointerLeave={() => setCreditHovered(false)}
        onClick={() => setCreditOpen(!creditOpen)}
      >
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path
            className={s.flame}
            d="M20 25Q-2 32 20 39L25 32Z"
            fill="#f8bd55"
          />
          <path
            d="M21 28L14 17Q27 14 35 23M21 36L14 47Q27 50 35 41"
            fill="#d5b457"
          />
          <path d="M17 27Q36 13 55 32Q36 51 17 37Z" fill="#e9e5dc" />
          <path d="M43 23Q50 26 55 32Q50 38 43 41Z" fill="#d7b34c" />
          <circle
            cx="33"
            cy="32"
            r="6"
            fill="#75bdd4"
            stroke="#303b4e"
            strokeWidth="2"
          />
          <path
            d="M23 26L20 23M23 38L20 41"
            stroke="#fff8db"
            strokeWidth="1.5"
          />
        </svg>
      </button>
      <div
        id={creditId}
        className={`${s.credit} ${creditShown ? s.creditVisible : ""}`}
        role="status"
        aria-hidden={!creditShown}
      >
        Duc made this page :D
      </div>
    </div>
  );
}
