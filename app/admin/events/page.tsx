"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ImageField from "@/components/admin/image-field";
import CarouselFraming from "@/components/admin/carousel-framing";
import { EVENT_TAGS, type EventRow } from "@/lib/types";
import type { CarouselFit } from "@/lib/content";
import {
  formatEventDate,
  isPast,
  isoToMelbourneLocal,
  makeSlug,
  melbourneLocalToIso,
} from "@/lib/datetime";
import styles from "../admin.module.css";

type Draft = {
  title: string;
  tag: string;
  description: string;
  startsAtLocal: string;
  location: string;
  imageUrl: string;
  carouselImageUrl: string;
  carouselFocalX: number;
  carouselFocalY: number;
  carouselFit: CarouselFit;
  carouselZoom: number;
  cta: string;
  link: string;
  isFeatured: boolean;
  isPublished: boolean;
};

const EMPTY: Draft = {
  title: "",
  tag: "Social",
  description: "",
  startsAtLocal: "",
  location: "",
  imageUrl: "",
  carouselImageUrl: "",
  carouselFocalX: 50,
  carouselFocalY: 50,
  carouselFit: "cover",
  carouselZoom: 100,
  cta: "",
  link: "",
  isFeatured: false,
  isPublished: true,
};

function toDraft(e: EventRow): Draft {
  return {
    title: e.title,
    tag: e.tag,
    description: e.description ?? "",
    startsAtLocal: isoToMelbourneLocal(e.starts_at),
    location: e.location ?? "",
    imageUrl: e.image_url ?? "",
    carouselImageUrl: e.carousel_image_url ?? "",
    carouselFocalX: e.carousel_focal_x ?? 50,
    carouselFocalY: e.carousel_focal_y ?? 50,
    carouselFit: e.carousel_fit === "contain" ? "contain" : "cover",
    carouselZoom: e.carousel_zoom ?? 100,
    cta: e.cta ?? "",
    link: e.link ?? "",
    isFeatured: e.is_featured,
    isPublished: e.is_published,
  };
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editing, setEditing] = useState<EventRow | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // Without this a fast double-click fires two deletes for the same row.
  const [deleting, setDeleting] = useState<string | null>(null);

  // Bumping this re-runs the fetch. The `cancelled` flag means a slow response
  // from an earlier load cannot land after a newer one and show stale rows.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    const sb = supabase;
    if (!sb) return;

    let cancelled = false;

    (async () => {
      const { data, error } = await sb
        .from("events")
        .select("*")
        .order("starts_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setLoadError(error.message);
        setEvents([]);
        return;
      }
      setLoadError(null);
      setEvents((data ?? []) as EventRow[]);
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function startNew() {
    setDraft(EMPTY);
    setEditing("new");
    setFieldError(null);
    setSaveError(null);
  }

  function startEdit(e: EventRow) {
    setDraft(toDraft(e));
    setEditing(e);
    setFieldError(null);
    setSaveError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    // R13 — block submission and name the offending field.
    if (!draft.title.trim()) return setFieldError("Title is required.");
    if (!draft.startsAtLocal) return setFieldError("Date and time are required.");
    setFieldError(null);

    const startsAtIso = melbourneLocalToIso(draft.startsAtLocal);
    const payload = {
      title: draft.title.trim(),
      tag: draft.tag,
      description: draft.description.trim() || null,
      starts_at: startsAtIso,
      location: draft.location.trim() || null,
      image_url: draft.imageUrl.trim() || null,
      carousel_image_url: draft.carouselImageUrl.trim() || null,
      carousel_focal_x: draft.carouselFocalX,
      carousel_focal_y: draft.carouselFocalY,
      carousel_fit: draft.carouselFit,
      carousel_zoom: draft.carouselZoom,
      cta: draft.cta.trim() || null,
      link: draft.link.trim() || null,
      is_featured: draft.isFeatured,
      is_published: draft.isPublished,
    };

    setSaving(true);
    const { error } =
      editing === "new"
        ? await supabase
            .from("events")
            .insert({ ...payload, slug: makeSlug(payload.title, startsAtIso) })
        : // The slug is left alone on edit: it is the key the JSON import
          // matches on, and changing it would create a duplicate next run.
          await supabase.from("events").update(payload).eq("id", (editing as EventRow).id);
    setSaving(false);

    if (error) {
      setSaveError(
        error.code === "23505"
          ? "An event with that title already exists on that date."
          : error.message
      );
      return;
    }

    setEditing(null);
    reload();
  }

  async function remove(id: string) {
    if (!supabase || deleting) return;
    setDeleting(id);
    const { error } = await supabase.from("events").delete().eq("id", id);
    setDeleting(null);
    setConfirmDelete(null);
    if (error) {
      setLoadError(error.message);
      return;
    }
    reload();
  }

  /* ---------- Form ---------- */

  if (editing) {
    const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
      setDraft((d) => ({ ...d, [k]: v }));

    return (
      <>
        <h1 className={styles.page_heading}>
          {editing === "new" ? "New " : "Edit "}
          <span className={styles.accent}>event</span>
        </h1>

        <form className={styles.form_panel} onSubmit={save}>
          <label className={styles.field}>
            <span>Title</span>
            <input value={draft.title} onChange={(e) => set("title", e.target.value)} />
          </label>

          <div className={styles.field_row}>
            <label className={styles.field}>
              <span>Date and time (Melbourne)</span>
              <input
                type="datetime-local"
                value={draft.startsAtLocal}
                onChange={(e) => set("startsAtLocal", e.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>Category</span>
              <select value={draft.tag} onChange={(e) => set("tag", e.target.value)}>
                {EVENT_TAGS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span>Location</span>
            <input
              value={draft.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Building LC, Deakin Burwood"
            />
          </label>

          <label className={styles.field}>
            <span>Description</span>
            <textarea
              rows={4}
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>

          <div className={styles.field_row}>
            <label className={styles.field}>
              <span>Button label</span>
              <input
                value={draft.cta}
                onChange={(e) => set("cta", e.target.value)}
                placeholder="Register Now"
              />
            </label>

            <label className={styles.field}>
              <span>Button link</span>
              <input
                value={draft.link}
                onChange={(e) => set("link", e.target.value)}
                placeholder="https://…"
              />
            </label>
          </div>

          <ImageField
            label="Event image"
            value={draft.imageUrl}
            onChange={(v) => set("imageUrl", v)}
            folder="events"
          />

          {/* Always shown, not gated on the featured checkbox, so it can be set
              in advance for an event you intend to feature later. */}
          <ImageField
            label="Carousel image (optional)"
            value={draft.carouselImageUrl}
            onChange={(v) => set("carouselImageUrl", v)}
            folder="events"
          />
          <small className={styles.hint}>
            Used only for the wide banner at the top of the Events page, and only
            while this event is the featured one. A landscape picture works best
            — the banner crops tall images top and bottom. Leave it empty to use
            the event image above.
          </small>

          {/* Previews whichever picture the banner would really use, which is
              the carousel one when set and the event one otherwise. */}
          <CarouselFraming
            imageUrl={draft.carouselImageUrl || draft.imageUrl}
            focalX={draft.carouselFocalX}
            focalY={draft.carouselFocalY}
            fit={draft.carouselFit}
            zoom={draft.carouselZoom}
            onChange={({ focalX, focalY, fit, zoom }) =>
              setDraft((d) => ({
                ...d,
                carouselFocalX: focalX,
                carouselFocalY: focalY,
                carouselFit: fit,
                carouselZoom: zoom,
              }))
            }
          />

          <div className={styles.toggle_row}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={draft.isFeatured}
                onChange={(e) => set("isFeatured", e.target.checked)}
              />
              <span>Feature on the events carousel</span>
            </label>

            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={draft.isPublished}
                onChange={(e) => set("isPublished", e.target.checked)}
              />
              <span>Visible on the public site</span>
            </label>
          </div>

          {draft.isFeatured && (
            <p className={styles.hint}>
              Only one event can be featured. Saving this will un-feature any other.
            </p>
          )}

          {fieldError && <p className={styles.error} role="alert">{fieldError}</p>}
          {saveError && <p className={styles.error} role="alert">{saveError}</p>}

          <div className={styles.form_actions}>
            <button type="submit" className={styles.primary_button} disabled={saving}>
              {saving ? "Saving…" : "Save event"}
            </button>
            <button
              type="button"
              className={styles.ghost_button}
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      </>
    );
  }

  /* ---------- List ---------- */

  const upcoming = (events ?? []).filter((e) => !isPast(e.starts_at));
  const past = (events ?? []).filter((e) => isPast(e.starts_at));

  const row = (e: EventRow) => (
    <li key={e.id} className={styles.row}>
      <div className={styles.row_main}>
        <div className={styles.row_title}>
          {e.title}
          {e.is_featured && <span className={styles.badge}>Featured</span>}
          {!e.is_published && <span className={styles.badge_muted}>Hidden</span>}
        </div>
        <div className={styles.row_meta}>
          {formatEventDate(e.starts_at)}
          {e.location ? ` · ${e.location}` : ""}
        </div>
      </div>

      <div className={styles.row_actions}>
        {confirmDelete === e.id ? (
          <>
            <span className={styles.confirm_text}>Delete this event?</span>
            <button
              className={styles.danger_button}
              onClick={() => remove(e.id)}
              disabled={deleting === e.id}
            >
              {deleting === e.id ? "Deleting…" : "Yes, delete"}
            </button>
            <button className={styles.ghost_button} onClick={() => setConfirmDelete(null)}>
              Keep
            </button>
          </>
        ) : (
          <>
            <button className={styles.ghost_button} onClick={() => startEdit(e)}>Edit</button>
            <button className={styles.ghost_button} onClick={() => setConfirmDelete(e.id)}>
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  );

  return (
    <>
      <div className={styles.page_header_row}>
        <h1 className={styles.page_heading}>
          <span className={styles.accent}>Events</span>
        </h1>
        <button className={styles.primary_button} onClick={startNew}>New event</button>
      </div>

      <p className={styles.page_sub}>
        Upcoming and past are worked out from the date, so an event moves itself
        once its date passes.
      </p>

      {loadError && <p className={styles.error} role="alert">{loadError}</p>}

      {events === null ? (
        <div className={styles.placeholder}><p>Loading events…</p></div>
      ) : events.length === 0 ? (
        <div className={styles.placeholder}>
          <p>No events yet. Press “New event” to add the first one.</p>
        </div>
      ) : (
        <>
          <h2 className={styles.section_heading}>Upcoming ({upcoming.length})</h2>
          {upcoming.length ? (
            <ul className={styles.rows}>{upcoming.map(row)}</ul>
          ) : (
            <div className={styles.placeholder}><p>Nothing coming up.</p></div>
          )}

          <h2 className={styles.section_heading}>Past ({past.length})</h2>
          {past.length ? (
            <ul className={styles.rows}>{past.map(row)}</ul>
          ) : (
            <div className={styles.placeholder}><p>No past events.</p></div>
          )}
        </>
      )}
    </>
  );
}
