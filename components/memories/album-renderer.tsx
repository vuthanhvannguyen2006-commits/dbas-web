"use client";
/* One renderer for the public album page and the admin live preview, so what an
   editor sees is what visitors get. It only ever loads thumbnail URLs; the
   original image is reserved for the full-size viewer, which the host opens
   through onOpen. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  WIDE_FRAME_RATIO,
  planClusters,
  stepIndex,
  type AlbumLayoutSetting,
} from "@/lib/album-layout";
import s from "./album-renderer.module.css";

export type RenderPhoto = {
  id: string;
  thumbnail_url: string;
  alt_text: string;
  caption: string | null;
};

type Open = (index: number) => void;
type Vars = React.CSSProperties & Record<`--${string}`, string | number>;

function PhotoButton({
  photo,
  index,
  onOpen,
  className,
}: {
  photo: RenderPhoto;
  index: number;
  onOpen: Open;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`${s.frameButton} ${className ?? ""}`}
      data-album-photo={photo.id}
      aria-label={`Open photo ${index + 1}: ${photo.alt_text || "Album photo"}`}
      onClick={() => onOpen(index)}
    >
      <img
        src={photo.thumbnail_url}
        alt={photo.alt_text || ""}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </button>
  );
}

function Grid({ photos, onOpen }: { photos: RenderPhoto[]; onOpen: Open }) {
  return (
    <div className={s.grid}>
      {photos.map((photo, i) => (
        <figure key={photo.id} className={s.gridFigure}>
          <PhotoButton photo={photo} index={i} onOpen={onOpen} />
          {photo.caption && (
            <figcaption className={s.caption}>{photo.caption}</figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

function Clusters({
  photos,
  layout,
  onOpen,
}: {
  photos: RenderPhoto[];
  layout: AlbumLayoutSetting;
  onOpen: Open;
}) {
  const clusters = useMemo(
    () => planClusters(layout.format, layout.template, photos.length),
    [layout.format, layout.template, photos.length],
  );
  return (
    <div className={layout.format === "mosaic" ? s.mosaic : s.wall}>
      {clusters.map((cluster) => (
        <div
          key={cluster.start}
          role="group"
          aria-label={
            cluster.size === 1
              ? `Photo ${cluster.start + 1}`
              : `Photos ${cluster.start + 1} to ${cluster.start + cluster.size}`
          }
          className={s.cluster}
          style={
            {
              "--cols": cluster.cols,
              "--rows": cluster.rows,
              "--ratio": `${cluster.cols} / ${cluster.rows}`,
            } as Vars
          }
        >
          {/* Slots are already in reading order, so the DOM (and tab) order is
              the album's photo order. Grid placement is purely visual. */}
          {cluster.slots.map((slot) => {
            const photo = photos[slot.index];
            const wide = slot.colSpan / slot.rowSpan >= WIDE_FRAME_RATIO;
            return (
              <figure
                key={photo.id}
                className={`${s.frame} ${wide ? s.wide : ""}`}
                style={
                  {
                    "--c": slot.col,
                    "--r": slot.row,
                    "--cs": slot.colSpan,
                    "--rs": slot.rowSpan,
                  } as Vars
                }
              >
                <PhotoButton photo={photo} index={slot.index} onOpen={onOpen} />
                {photo.caption && (
                  <figcaption className={s.overlayCaption}>
                    {photo.caption}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Chapters({ photos, onOpen }: { photos: RenderPhoto[]; onOpen: Open }) {
  return (
    <ol className={s.chapters}>
      {photos.map((photo, i) => (
        <li
          key={photo.id}
          className={s.chapter}
          data-flip={i % 2 === 1}
          data-bare={!photo.caption}
        >
          <figure className={s.chapterMedia}>
            <PhotoButton photo={photo} index={i} onOpen={onOpen} />
          </figure>
          <div className={s.chapterText}>
            <span className={s.chapterNumber} aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            {photo.caption && <p>{photo.caption}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Filmstrip({ photos, onOpen }: { photos: RenderPhoto[]; onOpen: Open }) {
  const [current, setCurrent] = useState(0);
  const reel = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; moved: boolean } | null>(null);
  const at = Math.min(current, photos.length - 1);
  const photo = photos[at];

  // Keep the active thumbnail visible in the reel without scrolling the page.
  useEffect(() => {
    const strip = reel.current;
    const item = strip?.children[at] as HTMLElement | undefined;
    if (!strip || !item) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({
      left: item.offsetLeft - (strip.clientWidth - item.clientWidth) / 2,
      behavior: calm ? "auto" : "smooth",
    });
  }, [at]);

  function go(next: number, focusReel: boolean) {
    setCurrent(next);
    if (focusReel)
      requestAnimationFrame(() =>
        (reel.current?.children[next] as HTMLElement | undefined)?.focus({
          preventScroll: true,
        }),
      );
  }

  return (
    <div className={s.filmstrip}>
      <figure className={s.stage}>
        <button
          type="button"
          className={`${s.frameButton} ${s.stageButton}`}
          data-album-photo={photo.id}
          aria-label={`Open photo ${at + 1} of ${photos.length} full size: ${photo.alt_text || "Album photo"}`}
          onPointerDown={(e) => {
            swipe.current = { x: e.clientX, moved: false };
          }}
          onPointerUp={(e) => {
            const start = swipe.current;
            swipe.current = null;
            if (!start || e.pointerType === "mouse") return;
            const delta = e.clientX - start.x;
            if (Math.abs(delta) < 48) return;
            start.moved = true;
            const next = stepIndex(
              delta < 0 ? "ArrowRight" : "ArrowLeft",
              at,
              photos.length,
            );
            if (next !== null) go(next, false);
            // The synthesized click that follows a swipe must not open the viewer.
            swipe.current = { x: e.clientX, moved: true };
          }}
          onPointerCancel={() => {
            swipe.current = null;
          }}
          onClick={() => {
            if (swipe.current?.moved) {
              swipe.current = null;
              return;
            }
            onOpen(at);
          }}
        >
          <img
            key={photo.id}
            src={photo.thumbnail_url}
            alt={photo.alt_text || ""}
            draggable={false}
          />
        </button>
        <figcaption className={s.stageCaption}>
          <span className={s.stageCount} role="status">
            Photo {at + 1} of {photos.length}
          </span>
          {photo.caption ? <p>{photo.caption}</p> : <p className={s.stageHint}>A moment from the collection. Open the photo to see it in full.</p>}
          <div className={s.filmControls}>
        <button
          type="button"
          className={s.navButton}
          aria-label="Previous photo"
          disabled={at === 0}
          onClick={() => go(Math.max(at - 1, 0), false)}
        >
          <span aria-hidden="true">&lsaquo;</span>
        </button>
        <button
          type="button"
          className={s.navButton}
          aria-label="Next photo"
          disabled={at === photos.length - 1}
          onClick={() => go(Math.min(at + 1, photos.length - 1), false)}
        >
          <span aria-hidden="true">&rsaquo;</span>
        </button>
          </div>
        </figcaption>
      </figure>
      <div
        ref={reel}
        className={s.reel}
        role="group"
        aria-label="Photo reel. Use the arrow keys to move between photos."
        onKeyDown={(e) => {
          const next = stepIndex(e.key, at, photos.length);
          if (next === null) return;
          e.preventDefault();
          go(next, true);
        }}
      >
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={s.reelButton}
            tabIndex={i === at ? 0 : -1}
            aria-current={i === at ? "true" : undefined}
            aria-label={`Show photo ${i + 1}: ${p.alt_text || "Album photo"}`}
            onClick={() => go(i, false)}
          >
            <img
              src={p.thumbnail_url}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AlbumRenderer({
  photos,
  layout,
  onOpen,
}: {
  photos: RenderPhoto[];
  layout: AlbumLayoutSetting;
  /* Called with the photo's index within `photos` when a visitor asks for the
     full-size picture. */
  onOpen: Open;
}) {
  if (!photos.length) return null;
  const { format, template } = layout;
  return (
    <div
      className={`${s.root} ${s[template] ?? ""}`}
      data-format={format}
      data-template={template}
    >
      {format === "gallery-wall" || format === "mosaic" ? (
        <Clusters photos={photos} layout={layout} onOpen={onOpen} />
      ) : format === "story" ? (
        template === "filmstrip" ? (
          <Filmstrip key={photos[0].id} photos={photos} onOpen={onOpen} />
        ) : (
          <Chapters photos={photos} onOpen={onOpen} />
        )
      ) : (
        <Grid photos={photos} onOpen={onOpen} />
      )}
    </div>
  );
}
