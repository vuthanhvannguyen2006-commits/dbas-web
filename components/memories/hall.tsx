"use client";
/* Native images intentionally load only thumbnail URLs; originals are reserved for the viewer. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { database } from "@/lib/memories";
import {
  initials,
  coverImageStyle,
  pageRange,
  type MemoryAlbum,
  type PastMember,
} from "@/lib/memories-core";
import { useLive } from "./use-live";
import s from "./memories.module.css";
import MemoryAtmosphere from "./memory-atmosphere";
export function LoadNotice({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string | null;
  retry: () => void;
}) {
  return loading ? (
    <p className={s.notice} role="status">
      Loading memories...
    </p>
  ) : error ? (
    <div className={s.notice} role="alert">
      <p>Unable to load memories. {error}</p>
      <button onClick={retry}>Retry</button>
    </div>
  ) : null;
}
export function Pagination({
  page,
  count,
  size,
  change,
}: {
  page: number;
  count: number;
  size: number;
  change: (page: number) => void;
}) {
  return count > size ? (
    <nav className={s.pagination} aria-label="Pagination">
      <button disabled={page === 1} onClick={() => change(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {Math.ceil(count / size)}
      </span>
      <button disabled={page * size >= count} onClick={() => change(page + 1)}>
        Next
      </button>
    </nav>
  ) : null;
}
function Gallery() {
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    const sb = database();
    const [start, end] = pageRange(page, 12);
    const albums = await sb
      .from("memory_albums")
      .select("*", { count: "exact" })
      .eq("is_published", true)
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(start, end);
    if (albums.error) throw new Error(albums.error.message);
    const rows = (albums.data ?? []) as MemoryAlbum[];
    // One limited cover query per displayed album avoids downloading all photos.
    const covers = await Promise.all(
      rows.map(async (album) => {
        let query = sb
          .from("memory_photos")
          .select("thumbnail_url,alt_text,memory_albums!memory_photos_album_id_fkey!inner(is_published)")
          .eq("album_id", album.id)
          .eq("memory_albums.is_published", true);
        if (album.cover_photo_id) query = query.eq("id", album.cover_photo_id);
        const r = await query
          .order("sort_order")
          .order("id")
          .limit(1);
        if (r.error) throw new Error(r.error.message);
        return [album.id, r.data?.[0]] as const;
      }),
    );
    return {
      rows,
      covers: Object.fromEntries(covers),
      count: albums.count ?? 0,
    };
  }, [page]);
  const state = useLive(load);
  return (
    <>
      <LoadNotice {...state} />
      {state.data && (
        <>
          {!state.data.rows.length ? (
            <p className={s.notice}>
              Our memories will appear here when the first album is published.
            </p>
          ) : (
            <div className={s.grid}>
              {state.data.rows.map((a) => (
                <article className={s.card} key={a.id}>
                  <Link href={`/hall-of-memories/gallery/${a.id}`}>
                    {state.data!.covers[a.id] && (
                      <div className={s.albumCover}>
                      <img
                        loading="lazy"
                        src={state.data!.covers[a.id].thumbnail_url}
                        alt={state.data!.covers[a.id].alt_text || a.title}
                        style={coverImageStyle(a)}
                      />
                      </div>
                    )}
                    <div className={s.copy}>
                      <h2>{a.title}</h2>
                      {a.event_date && <p>{displayDate(a.event_date)}</p>}
                      <p className={s.cardLink}>
                        View album <span aria-hidden="true">&rarr;</span>
                      </p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
          <Pagination
            page={page}
            size={12}
            count={state.data.count}
            change={setPage}
          />
        </>
      )}
    </>
  );
}
export function displayDate(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date + "T00:00:00Z"));
}
function PastMembers() {
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    const [start, end] = pageRange(page, 12);
    const r = await database()
      .from("past_members")
      .select("*", { count: "exact" })
      .eq("is_published", true)
      .order("sort_order")
      .order("created_at")
      .order("id")
      .range(start, end);
    if (r.error) throw new Error(r.error.message);
    return { rows: r.data as PastMember[], count: r.count ?? 0 };
  }, [page]);
  const state = useLive(load);
  return (
    <>
      <LoadNotice {...state} />
      {state.data && (
        <>
          {!state.data.rows.length ? (
            <p className={s.notice}>
              Past members will be celebrated here soon.
            </p>
          ) : (
            <div className={s.grid}>
              {state.data.rows.map((m) => (
                <article className={s.card} key={m.id}>
                  {m.thumbnail_url ? (
                    <img src={m.thumbnail_url} alt={m.name} loading="lazy" />
                  ) : (
                    <div className={s.initials} aria-hidden="true">
                      {initials(m.name)}
                    </div>
                  )}
                  <div className={s.copy}>
                    <h2>{m.name}</h2>
                    {m.former_role && <p>{m.former_role}</p>}
                    {m.years_active && <p>{m.years_active}</p>}
                    {m.bio && (
                      <details>
                        <summary>Read bio</summary>
                        <p className={s.story}>{m.bio}</p>
                      </details>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          <Pagination
            page={page}
            size={12}
            count={state.data.count}
            change={setPage}
          />
        </>
      )}
    </>
  );
}
export default function Hall() {
  const past = useSearchParams().get("tab") === "past-members";
  return (
    <main className={s.shell}>
      <MemoryAtmosphere />
      <header className={s.hero}>
        <p className={s.eyebrow}>Deakin Business &amp; Analytics Society</p>
        <h1>Hall of Memories</h1>
        <p className={s.intro}>
          The moments we shared. The people who made them possible.
        </p>
        <div className={s.heroDetail} aria-hidden="true">
          <span /> <i /> <span />
        </div>
      </header>
      <nav className={s.tabs} aria-label="Hall of Memories">
        <Link
          href="/hall-of-memories"
          aria-current={!past ? "page" : undefined}
        >
          Gallery
        </Link>
        <Link
          href="/hall-of-memories?tab=past-members"
          aria-current={past ? "page" : undefined}
        >
          Past Members
        </Link>
      </nav>
      {past ? <PastMembers /> : <Gallery />}
    </main>
  );
}
