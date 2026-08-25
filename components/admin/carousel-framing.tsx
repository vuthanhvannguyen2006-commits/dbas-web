"use client";

import { useRef, useState } from "react";
import { resolveImageUrl } from "@/lib/storage";
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

   One setting serves both layouts, so the preview offers both rather than
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
  offsetX: number;
  offsetY: number;
  zoom: number;
  onChange: (next: { offsetX: number; offsetY: number; zoom: number }) => void;
};

/* Wide enough to push the picture right out of the banner, which is allowed —
   Reset brings it back. Without any bound a stray drag could store a number
   nobody could make sense of later. */
function clampOffset(n: number): number {
  return Math.min(200, Math.max(-200, Math.round(n)));
}

export default function CarouselFraming({
  imageUrl,
  offsetX,
  offsetY,
  zoom,
  onChange,
}: Props) {
  const [shape, setShape] = useState<"desktop" | "mobile">("desktop");
  const [dragging, setDragging] = useState(false);
  /* Which contact owns the drag. A ref rather than state because the pointer
     handlers must gate on it immediately, within the same event — not after a
     render. `dragging` exists only to drive the cursor. */
  const activePointer = useRef<number | null>(null);
  /* Where the drag began, in cursor pixels and in anchor percentages. Panning
     is measured from this rather than accumulated per event, so the picture
     cannot drift from rounding over a long drag, and clamping at an edge does
     not lose the rest of the gesture — pull back and it picks up where it was. */
  const dragStart = useRef<{ px: number; py: number; fx: number; fy: number } | null>(null);
  const src = resolveImageUrl(imageUrl);

  // Nothing to frame yet. Showing an empty box here would imply the controls
  // do something, and they would not.
  if (!src) return null;

  const isMobile = shape === "mobile";

  /* The picture follows the cursor exactly. Offsets are a percentage of the
     box, and translate() percentages resolve against the element's own box
     rather than against the scale, so a drag of N pixels moves the picture N
     pixels at any zoom — no correction factor, and no drift between what the
     hand does and what the eye sees.

     Measured from where the drag began rather than accumulated per event, so
     rounding cannot creep over a long drag. */
  function panBy(dx: number, dy: number, box: DOMRect) {
    const start = dragStart.current;
    if (!start) return;
    onChange({
      offsetX: clampOffset(start.fx + (dx / box.width) * 100),
      offsetY: clampOffset(start.fy + (dy / box.height) * 100),
      zoom,
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
    dragStart.current = { px: e.clientX, py: e.clientY, fx: offsetX, fy: offsetY };
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

    /* Deliberately no move on press. A pan tool that jumped the picture on
       mousedown would fight the very gesture it exists for. */
  }

  function drag(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointer.current !== e.pointerId || !dragStart.current) return;
    panBy(
      e.clientX - dragStart.current.px,
      e.clientY - dragStart.current.py,
      e.currentTarget.getBoundingClientRect()
    );
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointer.current !== e.pointerId) return;
    activePointer.current = null;
    dragStart.current = null;
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

      {/* Drag surface as well as preview. Positioning is pointer-only: the
          preview is aria-hidden and not focusable, and the position sliders
          that once provided a keyboard path were removed as redundant once
          dragging moved the picture directly. Size remains keyboard-operable. */}
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
          style={{
            /* contain, matching the banner: the whole picture, never trimmed. */
            objectFit: "contain",
            /* Must compose exactly as carousel.tsx does — same order, same
               units — or this stops being a preview and starts being a
               plausible-looking lie. */
            transform:
              offsetX === 0 && offsetY === 0 && zoom === 100
                ? undefined
                : `translate(${offsetX}%, ${offsetY}%) scale(${zoom / 100})`,
          }}
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
      </div>

      <small className={styles.hint}>
        Size the picture, then drag it around. The box shows exactly what will
        appear on the site. At 100% the whole picture fits inside the banner —
        turn the size up until the dark edges disappear if you want it to fill.
        Check both shapes: the text covers the right side on a computer and the
        bottom on a phone.
      </small>

      <div className={styles.framing_sliders}>
        <label>
          Size: {zoom}%
          <input
            type="range"
            min={20}
            max={400}
            step={5}
            value={zoom}
            onChange={(e) =>
              onChange({ offsetX, offsetY, zoom: Number(e.target.value) })
            }
          />
        </label>
      </div>

      <div className={styles.framing_actions}>
        <span className={styles.hint}>
          The whole picture is always kept — nothing is ever trimmed away.
        </span>

        <button
          type="button"
          className={styles.ghost_button}
          onClick={() => onChange({ offsetX: 0, offsetY: 0, zoom: 100 })}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
