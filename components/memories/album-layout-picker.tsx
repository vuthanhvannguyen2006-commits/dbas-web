"use client";
import { useCallback, useEffect, useState } from "react";
import { checkWrite, database } from "@/lib/memories";
import type { MemoryAlbum } from "@/lib/memories-core";
import {
  ALBUM_FORMATS,
  ALBUM_PAGE_SIZE,
  FORMAT_INFO,
  TEMPLATE_INFO,
  clusterCapacity,
  defaultTemplateFor,
  layoutColumns,
  planClusters,
  resolveLayout,
  sameLayout,
  templatesFor,
  type AlbumFormat,
  type AlbumLayoutSetting,
  type AlbumTemplate,
} from "@/lib/album-layout";
import { useLive } from "./use-live";
import AlbumRenderer, { type RenderPhoto } from "./album-renderer";
import s from "./admin.module.css";
import g from "./album-layout-picker.module.css";

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", width: "100%" },
  { id: "tablet", label: "Tablet", width: "768px" },
  { id: "phone", label: "Phone", width: "390px" },
] as const;
type ViewportId = (typeof VIEWPORTS)[number]["id"];

/* A small drawing of the arrangement, made from the same cluster plans the
   renderer uses. */
function Swatch({
  format,
  template,
}: {
  format: AlbumFormat;
  template: AlbumTemplate;
}) {
  if (format === "gallery-wall" || format === "mosaic") {
    const size = Math.min(5, clusterCapacity(format, template));
    const cluster = planClusters(format, template, size)[0];
    return (
      <span
        className={g.swatch}
        aria-hidden="true"
        style={{
          gridTemplateColumns: `repeat(${cluster.cols}, 1fr)`,
          gridTemplateRows: `repeat(${cluster.rows}, 1fr)`,
          aspectRatio: `${cluster.cols} / ${cluster.rows}`,
        }}
      >
        {cluster.slots.map((slot) => (
          <i
            key={slot.index}
            style={{
              gridColumn: `${slot.col} / span ${slot.colSpan}`,
              gridRow: `${slot.row} / span ${slot.rowSpan}`,
            }}
          />
        ))}
      </span>
    );
  }
  if (format === "story")
    return (
      <span className={g.swatch} data-story={template} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    );
  return (
    <span className={g.swatch} data-story="grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, n) => (
        <i key={n} />
      ))}
    </span>
  );
}

export default function AlbumLayoutPicker({
  album,
  version,
  locked,
  pending,
  dirtyChanged,
  saved,
}: {
  album: MemoryAlbum;
  /* Bumped by the editor whenever photos change, so the preview stays current. */
  version: number;
  locked: boolean;
  pending: (value: boolean) => void;
  dirtyChanged: (value: boolean) => void;
  /* Receives the freshly saved album row. */
  saved: (row: MemoryAlbum) => boolean;
}) {
  const [draft, setDraft] = useState<AlbumLayoutSetting | null>(null);
  const [base, setBase] = useState<AlbumLayoutSetting | null>(null);
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cache, setCache] = useState<{ photos: RenderPhoto[]; total: number }>({
    photos: [],
    total: 0,
  });

  // False before the layout migration has been applied: the columns are absent.
  const supported = "layout_format" in album;
  const current = resolveLayout(album);
  const value = draft ?? current;
  const dirty = !sameLayout(value, current);
  useEffect(() => dirtyChanged(dirty), [dirty, dirtyChanged]);

  const loader = useCallback(async () => {
    void version;
    const r = await database()
      .from("memory_photos")
      .select("id,thumbnail_url,alt_text,caption", { count: "exact" })
      .eq("album_id", album.id)
      .order("sort_order")
      .order("id")
      .range(0, ALBUM_PAGE_SIZE - 1);
    if (r.error) throw new Error(r.error.message);
    const next = { photos: r.data as RenderPhoto[], total: r.count ?? 0 };
    setCache(next);
    return next;
  }, [album.id, version]);
  const state = useLive(loader);

  function change(next: AlbumLayoutSetting) {
    if (!draft) setBase(current);
    setDraft(next);
    setNotice("");
    setError("");
    dirtyChanged(!sameLayout(next, current));
  }
  function chooseFormat(format: AlbumFormat) {
    if (format === value.format) return;
    change({ format, template: defaultTemplateFor(format) });
  }
  async function save() {
    if (busy || locked || !dirty || !supported) return;
    if (base && !sameLayout(base, current)) {
      setError("Another editor changed this layout. Discard your layout change to use the saved version, then choose again.");
      return;
    }
    setBusy(true);
    pending(true);
    setError("");
    setNotice("");
    try {
      const result = await database()
        .from("memory_albums")
        .update(layoutColumns(value))
        .eq("id", album.id)
        .eq("updated_at", album.updated_at)
        .select();
      checkWrite(result);
      if (!saved(result.data![0] as MemoryAlbum)) return;
      setDraft(null);
      setBase(null);
      dirtyChanged(false);
      setNotice(
        album.is_published
          ? "Layout saved. Visitors see it now."
          : "Layout saved. Visitors see it once the album is published.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The layout could not be saved.",
      );
    } finally {
      setBusy(false);
      pending(false);
    }
  }

  const { photos, total } = state.data ?? cache;
  const width = VIEWPORTS.find((v) => v.id === viewport)!.width;
  const templates = templatesFor(value.format);

  return (
    <section className={`${s.panel} ${g.picker}`} aria-label="Album layout">
      <h2>Album layout</h2>
      <p className={s.hint}>
        Choose how visitors see this album. New and existing albums stay a
        regular grid until you change and save this. Photo order, descriptions
        and cover are unaffected.
      </p>
      {!supported && (
        <p className={s.error} role="alert">
          Layout choices need the latest database update. Ask the site
          maintainer to apply it; the album keeps working as a regular grid.
        </p>
      )}

      <fieldset className={g.group} disabled={!supported || busy || locked}>
        <legend>Format</legend>
        <div className={g.options}>
          {ALBUM_FORMATS.map((format) => (
            <label
              key={format}
              className={g.option}
              data-selected={value.format === format}
            >
              <input
                type="radio"
                name="album-format"
                checked={value.format === format}
                onChange={() => chooseFormat(format)}
              />
              <Swatch format={format} template={defaultTemplateFor(format)} />
              <strong>{FORMAT_INFO[format].label}</strong>
              <small>{FORMAT_INFO[format].blurb}</small>
            </label>
          ))}
        </div>
      </fieldset>

      {templates.length > 1 && (
        <fieldset className={g.group} disabled={!supported || busy || locked}>
          <legend>{FORMAT_INFO[value.format].label} template</legend>
          <div className={g.options}>
            {templates.map((template) => (
              <label
                key={template}
                className={g.option}
                data-selected={value.template === template}
              >
                <input
                  type="radio"
                  name="album-template"
                  checked={value.template === template}
                  onChange={() => change({ format: value.format, template })}
                />
                <Swatch format={value.format} template={template} />
                <strong>{TEMPLATE_INFO[template].label}</strong>
                <small>{TEMPLATE_INFO[template].blurb}</small>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className={g.previewHead}>
        <h3>Live preview</h3>
        <div role="group" aria-label="Preview width" className={g.viewports}>
          {VIEWPORTS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={viewport === v.id}
              onClick={() => setViewport(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <p className={s.hint} role="status">
        {!total
          ? "Add photos to preview this layout."
          : `Showing ${photos.length} of ${total} photo${total === 1 ? "" : "s"}, the first page visitors see. This is the same renderer as the public album.`}
      </p>
      {state.error && (
        <p role="alert" className={s.error}>
          {state.error}{" "}
          <button type="button" onClick={state.retry}>
            Retry preview
          </button>
        </p>
      )}
      <div className={g.stageWrap}>
        <div className={g.stage} style={{ width }}>
          <AlbumRenderer
            key={`${value.format}/${value.template}`}
            photos={photos}
            layout={value}
            onOpen={() =>
              setNotice(
                "Preview only. Visitors open the full-size photo from here.",
              )
            }
          />
        </div>
      </div>

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className={s.actions}>
        <button
          type="button"
          disabled={busy || locked || !dirty || !supported}
          onClick={() => void save()}
        >
          {busy ? "Saving layout..." : "Save layout"}
        </button>
        <button
          type="button"
          disabled={busy || locked || !dirty}
          onClick={() => {
            setDraft(null);
            setBase(null);
            setError("");
            dirtyChanged(false);
          }}
        >
          Discard layout change
        </button>
        {dirty && <span className={g.unsaved}>Unsaved layout change</span>}
      </div>
    </section>
  );
}
