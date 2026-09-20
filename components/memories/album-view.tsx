"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { database } from "@/lib/memories";
import {
  pageRange,
  type MemoryAlbum,
  type MemoryPhoto,
} from "@/lib/memories-core";
import { resolveLayout, ALBUM_PAGE_SIZE } from "@/lib/album-layout";
import { useLive } from "./use-live";
import { displayDate, LoadNotice, Pagination } from "./hall";
import AlbumRenderer from "./album-renderer";
import s from "./memories.module.css";
import MemoryAtmosphere from "./memory-atmosphere";
function Viewer({
  photos,
  initial,
  close,
}: {
  photos: MemoryPhoto[];
  initial: number;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(initial);
  useEffect(() => {
    const element = dialog.current!;
    const trigger = document.activeElement as HTMLElement | null;
    const openedId = photos[initial]?.id;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      // Safari and Firefox do not focus a button on click, so activeElement can
      // be <body>; fall back to the control that opened this photo.
      const origin =
        trigger && trigger !== document.body && trigger.isConnected
          ? trigger
          : document.querySelector<HTMLElement>(
              `[data-album-photo="${openedId}"]`,
            );
      origin?.focus();
    };
    // Runs once per opening; the photo list is stable while the viewer is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const move = (delta: number) =>
    setIndex((i) => (i + delta + photos.length) % photos.length);
  const photo = photos[index];
  return (
    <dialog
      ref={dialog}
      className={s.viewer}
      aria-label="Album photo viewer"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          move(1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1);
        }
        if (e.key === "Tab") {
          const buttons = Array.from(
            dialog.current!.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          );
          const first = buttons[0],
            last = buttons[buttons.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <div className={s.viewerContent}>
        <div className={s.viewerControls}>
          <button onClick={close} autoFocus>
            Close
          </button>
          <button
            onClick={() => move(-1)}
            disabled={photos.length < 2}
            aria-label="Previous photo"
          >
            Previous
          </button>
          <span aria-live="polite">
            {index + 1} / {photos.length} on this page
          </span>
          <button
            onClick={() => move(1)}
            disabled={photos.length < 2}
            aria-label="Next photo"
          >
            Next
          </button>
        </div>
        <img src={photo.image_url} alt={photo.alt_text || "Album photo"} />
        {photo.caption && <p>{photo.caption}</p>}
      </div>
    </dialog>
  );
}
export default function AlbumView({ id }: { id: string }) {
  const [page, setPage] = useState(1),
    [selected, setSelected] = useState<number | null>(null);
  const loader = useCallback(async () => {
    const sb = database();
    const album = await sb
      .from("memory_albums")
      .select("*")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();
    if (album.error) throw new Error(album.error.message);
    if (!album.data) return null;
    const [start, end] = pageRange(page, ALBUM_PAGE_SIZE);
    const photos = await sb
      .from("memory_photos")
      .select("*,memory_albums!memory_photos_album_id_fkey!inner(is_published)", { count: "exact" })
      .eq("album_id", id)
      .eq("memory_albums.is_published", true)
      .order("sort_order")
      .order("id")
      .range(start, end);
    if (photos.error) throw new Error(photos.error.message);
    return {
      album: album.data as MemoryAlbum,
      photos: photos.data as MemoryPhoto[],
      count: photos.count ?? 0,
    };
  }, [id, page]);
  const state = useLive(loader);
  return (
    <main className={s.shell}>
      <MemoryAtmosphere />
      <Link className={s.backLink} href="/hall-of-memories">
        <span aria-hidden="true">&larr; </span>Back to Gallery
      </Link>
      <LoadNotice {...state} />
      {!state.loading && !state.error && !state.data && (
        <div className={s.notice}>
          <h1>Album unavailable</h1>
          <p>This album is not published or no longer exists.</p>
        </div>
      )}
      {state.data && (
        <>
          <header className={s.hero}>
            <p className={s.eyebrow}>From the DBAS collection</p>
            <h1>{state.data.album.title}</h1>
            {state.data.album.event_date && (
              <p>{displayDate(state.data.album.event_date)}</p>
            )}
            {state.data.album.story && (
              <p className={s.story}>{state.data.album.story}</p>
            )}
          </header>
          {/* Thumbnails only; the viewer below is the one place originals load. */}
          <AlbumRenderer
            photos={state.data.photos}
            layout={resolveLayout(state.data.album)}
            onOpen={setSelected}
          />
          <Pagination
            page={page}
            count={state.data.count}
            size={ALBUM_PAGE_SIZE}
            change={setPage}
          />
          {selected !== null && (
            <Viewer
              photos={state.data.photos}
              initial={selected}
              close={() => setSelected(null)}
            />
          )}
        </>
      )}
    </main>
  );
}
