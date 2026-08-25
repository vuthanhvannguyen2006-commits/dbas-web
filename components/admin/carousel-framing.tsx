"use client";

import { useRef, useState } from "react";
import { resolveImageUrl } from "@/lib/storage";
import type { CarouselFit } from "@/lib/content";
import styles from "@/app/admin/admin.module.css";

/* Choosing a picture for the banner is only half the job — the banner also
   decides which part of it you actually see, and two things about that are
   invisible from a form:

     1. It crops. The strip is wide and short, so a portrait photo loses most
        of its top and bottom.
     2. Half of it is covered by the text. On desktop the overlay gradient runs
        left to right and the text card sits on the right, so the usable area is
        the LEFT half. Under 768px the gradient turns vertical and the card goes
        along the bottom, so the usable area becomes the TOP half instead.

   One focal point serves both layouts, so the preview offers both rather than
   picking one and letting the other surprise someone later. The gradients below
   are deliberately copies of the real ones in carousel.module.css — if those
   are ever retuned, these should be retuned with them, or this stops telling
   the truth, which is worse than not showing it at all. */

const DESKTOP_GRADIENT =
  "linear-gradient(90deg, rgba(13,9,5,0) 0%, rgba(13,9,5,0.15) 30%, rgba(13,9,5,0.72) 52%, rgba(13,9,5,0.95) 65%, rgba(13,9,5,1) 80%)";

const MOBILE_GRADIENT =
  "linear-gradient(180deg, rgba(13,9,5,0) 0%, rgba(13,9,5,0.6) 45%, rgba(13,9,5,0.98) 70%)";

type Props = {
  /** What the banner would actually show: the carousel image, or the event image. */
  imageUrl: string;
  focalX: number;
  focalY: number;
  fit: CarouselFit;
  onChange: (next: { focalX: number; focalY: number; fit: CarouselFit }) => void;
};

function clamp(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export default function CarouselFraming({
  imageUrl,
  focalX,
  focalY,
  fit,
  onChange,
}: Props) {
  const [shape, setShape] = useState<"desktop" | "mobile">("desktop");
  const [dragging, setDragging] = useState(false);
  /* Which contact owns the drag. A ref rather than state because the pointer
     handlers must gate on it immediately, within the same event — not after a
     render. `dragging` exists only to drive the cursor. */
  const activePointer = useRef<number | null>(null);
  const src = resolveImageUrl(imageUrl);

  // Nothing to frame yet. Showing an empty box here would imply the controls
  // do something, and they would not.
  if (!src) return null;

  const isMobile = shape === "mobile";

  /* Pointer events rather than mouse events, so one code path covers mouse,
     trackpad, touch and pen. A tap is just a drag of zero distance, which is
     why there is no separate click handler — having both would fire twice for
     every press. */
  function moveTo(e: React.PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    onChange({
      focalX: clamp(((e.clientX - box.left) / box.width) * 100),
      focalY: clamp(((e.clientY - box.top) / box.height) * 100),
      fit,
    });
  }

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    // Right-click belongs to the context menu, not to repositioning.
    if (e.button !== 0) return;
    /* One contact owns the drag at a time. `button` is 0 for every touch
       contact, not just the first, so without this a second finger landing
       mid-drag takes over — and its release then ends the drag while the
       original finger is still down, leaving the picture unresponsive until
       the user lifts and starts again. Verified by replaying that exact
       sequence, so it is a real defect rather than a theoretical one. */
    if (activePointer.current !== null) return;

    activePointer.current = e.pointerId;
    setDragging(true);

    /* Capture routes later events for this pointer back here even once the
       cursor leaves, so dragging past the edge keeps tracking and pins to the
       clamped edge. It can throw if the pointer is already gone by the time we
       ask, which must not abort the drag we have just registered — hence after
       the bookkeeping, and guarded. Note capture does NOT guarantee a pointerup:
       lostpointercapture can arrive on its own, which is why that is handled
       below too. */
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* Nothing to do — the drag still works from the events we receive. */
    }

    moveTo(e);
  }

  function drag(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointer.current !== e.pointerId) return;
    moveTo(e);
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointer.current !== e.pointerId) return;
    activePointer.current = null;
    setDragging(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* Already released by the browser. */
    }
  }

  return (
    <div className={styles.field}>
      <span>Position on the carousel</span>

      <div className={styles.framing_tabs}>
        {(["desktop", "mobile"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.framing_tab} ${shape === s ? styles.framing_tab_active : ""}`}
            onClick={() => setShape(s)}
            aria-pressed={shape === s}
          >
            {s === "desktop" ? "On a computer" : "On a phone"}
          </button>
        ))}
      </div>

      {/* Click target as well as preview. A button would be more obviously
          clickable, but it cannot contain the layered preview, so the keyboard
          path is the two sliders underneath rather than this. */}
      {/* The two shapes have to be sized from opposite axes. The wide one fills
          the available width and derives its height; the tall one would then be
          ~700px high, so it is driven from a fixed height and derives its width
          instead. Sizing both from width and capping with max-height silently
          produces a landscape "phone" preview — which is worse than no preview,
          because it looks authoritative while being wrong. */}
      <div
        className={styles.framing_preview}
        style={{
          ...(isMobile
            ? { aspectRatio: "3 / 4", height: 420, width: "fit-content", maxWidth: "100%" }
            : { aspectRatio: "8 / 3", height: "auto", width: "100%", maxWidth: 520 }),
          cursor: dragging ? "grabbing" : "grab",
        }}
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        aria-hidden="true"
        title="Drag to choose the part of the picture that matters most"
      >
        {/* draggable={false} because the browser's own image drag starts on
            mousedown and swallows the pointer stream — without it the picture
            ghosts away under the cursor and the framing stops following. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className={styles.framing_image}
          style={{ objectFit: fit, objectPosition: `${focalX}% ${focalY}%` }}
        />
        <div
          className={styles.framing_overlay}
          style={{ background: isMobile ? MOBILE_GRADIENT : DESKTOP_GRADIENT }}
        />
        <div
          className={styles.framing_card_outline}
          style={
            isMobile
              ? { left: 0, right: 0, top: "auto", bottom: 0, height: "42%" }
              : { left: "auto", right: 0, top: 0, bottom: 0, width: "42%" }
          }
        >
          <span>Text sits here</span>
        </div>
        <div
          className={styles.framing_crosshair}
          style={{ left: `${focalX}%`, top: `${focalY}%` }}
          aria-hidden="true"
        />
      </div>

      <small className={styles.hint}>
        Drag on the picture to choose the part that matters most — a face, a logo
        — and the banner keeps it in view. Check both shapes: the text covers the
        right side on a computer and the bottom on a phone.
      </small>

      <div className={styles.framing_sliders}>
        <label>
          Left to right: {focalX}%
          <input
            type="range"
            min={0}
            max={100}
            value={focalX}
            onChange={(e) => onChange({ focalX: Number(e.target.value), focalY, fit })}
          />
        </label>
        <label>
          Top to bottom: {focalY}%
          <input
            type="range"
            min={0}
            max={100}
            value={focalY}
            onChange={(e) => onChange({ focalX, focalY: Number(e.target.value), fit })}
          />
        </label>
      </div>

      <div className={styles.framing_actions}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={fit === "contain"}
            onChange={(e) =>
              onChange({ focalX, focalY, fit: e.target.checked ? "contain" : "cover" })
            }
          />
          <span>Show the whole picture instead of filling the banner</span>
        </label>

        <button
          type="button"
          className={styles.ghost_button}
          onClick={() => onChange({ focalX: 50, focalY: 50, fit: "cover" })}
        >
          Reset to centre
        </button>
      </div>
    </div>
  );
}
