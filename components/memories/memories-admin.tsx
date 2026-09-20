"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminSession } from "@/components/admin/admin-session";
import { checkWrite, database, saveAlbumPhoto } from "@/lib/memories";
import { memoryWriteError } from "@/lib/memories-core";
import type {
  MemoryAlbum,
  MemoryPhoto,
  PastMember,
  UploadJob,
} from "@/lib/memories-core";
import { useLive } from "./use-live";
import UploadQueue from "./upload-queue";
import s from "./admin.module.css";
import a from "@/app/admin/admin.module.css";
import g from "./gallery-editor.module.css";
import GalleryCoverFraming, { type CoverFrame } from "./gallery-cover-framing";
import AlbumLayoutPicker from "./album-layout-picker";
import AlbumAiAssist from "./album-ai-assist";
type Row = MemoryAlbum | PastMember;
type Kind = "gallery" | "past-members";
const tableFor = (kind: Kind) =>
  kind === "gallery" ? "memory_albums" : "past_members";
const nameFor = (row: Row) => ("title" in row ? row.title : row.name);
const message = (e: unknown) =>
  e instanceof Error ? e.message : "The change could not be saved. Try again.";
export default function MemoriesAdmin({ kind }: { kind: Kind }) {
  const { role } = useAdminSession();
  const allowed =
    kind === "gallery"
      ? role === "admin" || role === "editor"
      : role === "admin";
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const loader = useCallback(async () => {
    if (!allowed) return [];
    let q = database().from(tableFor(kind)).select("*");
    q =
      kind === "gallery"
        ? q
            .order("event_date", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
        : q.order("sort_order").order("created_at").order("id");
    const r = await q;
    if (r.error) throw new Error(memoryWriteError(r.error));
    return r.data as Row[];
  }, [kind, allowed]);
  const state = useLive(loader);
  if (!allowed)
    return (
      <>
        <h1 className={a.page_heading}>Admin only</h1>
        <p>This section is limited to admin accounts.</p>
      </>
    );
  async function remove(row: Row) {
    setBusy(true);
    setError("");
    try {
      checkWrite(
        await database()
          .from(tableFor(kind))
          .delete()
          .eq("id", row.id)
          .eq("updated_at", row.updated_at)
          .select(),
      );
      setConfirm(null);
      state.retry();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function move(index: number, delta: number) {
    const rows = state.data as PastMember[];
    const x = rows[index],
      y = rows[index + delta];
    if (!x || !y) return;
    setBusy(true);
    setError("");
    try {
      const r = await database().rpc("swap_past_member_order", {
        id_a: x.id,
        id_b: y.id,
        expected_order_a: x.sort_order,
        expected_order_b: y.sort_order,
      });
      if (r.error) throw new Error(memoryWriteError(r.error));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
      state.retry();
    }
  }
  if (editing)
    return (
      <Editor
        key={editing === "new" ? "new" : editing.id}
        kind={kind}
        initial={editing}
        close={() => {
          setEditing(null);
          state.retry();
        }}
      />
    );
  return (
    <>
      <div className={a.page_header_row}>
        <h1 className={a.page_heading}>
          {kind === "gallery" ? "Gallery" : "Past Members"}
        </h1>
        <button className={s.button} onClick={() => setEditing("new")}>
          New {kind === "gallery" ? "album" : "member"}
        </button>
      </div>
      <p className={a.page_sub}>
        New entries start as drafts. Publish each one when it is ready.
      </p>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {state.loading ? (
        <p role="status">Loading...</p>
      ) : state.error ? (
        <div role="alert">
          <p>{state.error}</p>
          <button className={s.button} onClick={state.retry}>
            Retry
          </button>
        </div>
      ) : (
        <ul className={s.rows}>
          {!state.data?.length && (
            <li>No {kind === "gallery" ? "albums" : "past members"} yet.</li>
          )}
          {state.data?.map((row, index) => (
            <li className={s.panel} key={row.id}>
              <h2>{nameFor(row)}</h2>
              <p>{row.is_published ? "Published" : "Draft"}</p>
              <div className={s.actions}>
                <button onClick={() => setEditing(row)}>Edit</button>
                {kind === "past-members" && (
                  <>
                    <button
                      disabled={busy || index === 0}
                      onClick={() => void move(index, -1)}
                      aria-label={`Move ${nameFor(row)} up`}
                    >
                      Up
                    </button>
                    <button
                      disabled={busy || index === state.data!.length - 1}
                      onClick={() => void move(index, 1)}
                      aria-label={`Move ${nameFor(row)} down`}
                    >
                      Down
                    </button>
                  </>
                )}
                {confirm === row.id ? (
                  <>
                    <span>
                      Delete {nameFor(row)}
                      {kind === "gallery" ? " and all its photo records" : ""}?
                    </span>
                    <button disabled={busy} onClick={() => void remove(row)}>
                      Confirm deletion
                    </button>
                    <button disabled={busy} onClick={() => setConfirm(null)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <button disabled={busy} onClick={() => setConfirm(row.id)}>
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
function Editor({
  kind,
  initial,
  close,
}: {
  kind: Kind;
  initial: Row | "new";
  close: () => void;
}) {
  const gallery = kind === "gallery";
  const [row, setRow] = useState<Row | null>(
    initial === "new" ? null : initial,
  );
  const album = initial !== "new" && "title" in initial ? initial : null;
  const member = initial !== "new" && "name" in initial ? initial : null;
  const [title, setTitle] = useState(album?.title ?? member?.name ?? "");
  const [date, setDate] = useState(album?.event_date ?? "");
  const [story, setStory] = useState(album?.story ?? member?.bio ?? "");
  const [linked, setLinked] = useState(album?.linked_event_id ?? "");
  const [formerRole, setFormerRole] = useState(member?.former_role ?? "");
  const [years, setYears] = useState(member?.years_active ?? "");
  const [image, setImage] = useState(member?.image_url ?? null);
  const [thumb, setThumb] = useState(member?.thumbnail_url ?? null);
  const [dirty, setDirty] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [photoVersion, setPhotoVersion] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoDirty, setPhotoDirty] = useState(false);
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [layoutDirty, setLayoutDirty] = useState(false);
  // Photo work and layout work both block saving/publishing the album.
  const workBusy = photoBusy || layoutBusy;
  const pendingChanges = photoDirty || layoutDirty;
  const eventsLoader = useCallback(async () => {
    if (!gallery) return [];
    const r = await database()
      .from("events")
      .select("id,title,starts_at")
      .eq("is_published", true)
      .order("starts_at", { ascending: false });
    if (r.error) throw new Error(memoryWriteError(r.error));
    return r.data as { id: string; title: string; starts_at: string }[];
  }, [gallery]);
  const events = useLive(eventsLoader);
  async function save(publish?: boolean) {
    if (busy || workBusy) return;
    if (!title.trim()) {
      setError(gallery ? "Title is required." : "Name is required.");
      return;
    }
    if (publish && gallery && pendingChanges) {
      setError(
        "Save your photo descriptions, cover and layout below before publishing.",
      );
      return;
    }
    if (publish && incomplete) {
      setError("Finish or remove failed uploads before publishing.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const fields = gallery
        ? {
            title: title.trim(),
            event_date: date || null,
            story: story.trim() || null,
            linked_event_id: linked || null,
          }
        : {
            name: title.trim(),
            former_role: formerRole.trim() || null,
            years_active: years.trim() || null,
            bio: story.trim() || null,
            image_url: image,
            thumbnail_url: thumb,
          };
      const payload = {
        ...fields,
        is_published: publish ?? row?.is_published ?? false,
      };
      const result = row
        ? await database()
            .from(tableFor(kind))
            .update(payload)
            .eq("id", row.id)
            .eq("updated_at", row.updated_at)
            .select()
        : await database()
            .from(tableFor(kind))
            .insert({ ...payload, is_published: false })
            .select();
      checkWrite(result);
      setRow(result.data![0] as Row);
      setDirty(false);
      setNotice(
        publish === true
          ? "Published."
          : publish === false
            ? "Saved as draft."
            : "Saved.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function refreshAlbum() {
    setPhotoVersion((v) => v + 1);
    if (!row || !("title" in row)) return;
    const result = await database()
      .from("memory_albums")
      .select("*")
      .eq("id", row.id)
      .single();
    if (result.error || !result.data) {
      setError(
        "Unable to refresh album status. Your text is kept. Reload before publishing.",
      );
      return;
    }
    const fresh = result.data as MemoryAlbum;
    if (
      fresh.title !== row.title ||
      fresh.story !== row.story ||
      fresh.event_date !== row.event_date ||
      fresh.linked_event_id !== row.linked_event_id
    ) {
      setError(
        "This album was edited elsewhere. Your unsaved text is kept. Copy it before returning to the list and reopening the album.",
      );
      return;
    }
    setRow(fresh);
  }
  // Accepts the album row returned by a layout save. Same guard as
  // refreshAlbum: if the text fields moved under us, keep the editor's text and
  // do not adopt the new updated_at, so a later Save cannot silently overwrite.
  function layoutSaved(fresh: MemoryAlbum): boolean {
    if (!row || !("title" in row)) return false;
    if (
      fresh.title !== row.title ||
      fresh.story !== row.story ||
      fresh.event_date !== row.event_date ||
      fresh.linked_event_id !== row.linked_event_id
    ) {
      setError(
        "This album was edited elsewhere. Your unsaved text is kept. Copy it before returning to the list and reopening the album.",
      );
      return false;
    }
    setRow(fresh);
    return true;
  }
  async function memberImage(job: UploadJob) {
    if (!job.originalUrl || !job.thumbnailUrl)
      throw new Error("Both image versions must be uploaded.");
    setImage(job.originalUrl);
    setThumb(job.thumbnailUrl);
    setDirty(true);
  }
  return (
    <>
      <h1 className={a.page_heading}>
        {row ? "Edit" : "New"} {gallery ? "album" : "past member"}
      </h1>
      <div className={s.panel}>
        <p>{row?.is_published ? "Published" : "Draft"}</p>
        {gallery && (
          <label className={s.field}>
            <span>Copy from a published event (optional)</span>
            <select
              value={linked}
              onChange={(e) => {
                const id = e.target.value;
                setLinked(id);
                const event = events.data?.find((x) => x.id === id);
                if (event) {
                  setTitle(event.title);
                  setDate(
                    new Intl.DateTimeFormat("en-CA", {
                      timeZone: "Australia/Melbourne",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).format(new Date(event.starts_at)),
                  );
                }
                setDirty(true);
              }}
            >
              <option value="">Independent album</option>
              {linked && !events.data?.some((e) => e.id === linked) && (
                <option value={linked}>Previously linked event</option>
              )}
              {events.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
            <small className={s.hint}>
              Copies the title and date once. You can edit them below; future
              event changes will not overwrite this album.
            </small>
            {events.error && (
              <span role="alert">
                Events unavailable.{" "}
                <button onClick={events.retry}>Retry events</button>
              </span>
            )}
          </label>
        )}
        <label className={s.field}>
          <span>{gallery ? "Title" : "Name"} (required)</span>
          <input
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
          />
        </label>
        {gallery ? (
          <label className={s.field}>
            <span>Event date (optional)</span>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setDirty(true);
              }}
            />
          </label>
        ) : (
          <>
            <label className={s.field}>
              <span>Former role (optional)</span>
              <input
                value={formerRole}
                onChange={(e) => {
                  setFormerRole(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
            <label className={s.field}>
              <span>Years active (optional)</span>
              <input
                value={years}
                onChange={(e) => {
                  setYears(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
          </>
        )}
        <label className={s.field}>
          <span>{gallery ? "Story" : "Bio"} (optional)</span>
          <textarea
            rows={6}
            value={story}
            onChange={(e) => {
              setStory(e.target.value);
              setDirty(true);
            }}
          />
        </label>
        {gallery && (
          <AlbumAiAssist
            title={title}
            eventDate={date}
            currentStory={story}
            disabled={busy || workBusy}
            apply={(text) => {
              setStory(text);
              setDirty(true);
            }}
          />
        )}
        {!gallery && thumb && (
          <>
            <img className={s.preview} src={thumb} alt="Member preview" />
            <button
              onClick={() => {
                setImage(null);
                setThumb(null);
                setDirty(true);
              }}
            >
              Remove photo
            </button>
          </>
        )}
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        <div className={s.actions}>
          <button disabled={busy || workBusy} onClick={() => void save()}>
            {busy ? "Saving..." : row ? "Save changes" : "Create draft"}
          </button>
          {row && (
            <button
              disabled={
                busy ||
                workBusy ||
                (!row.is_published && (incomplete || pendingChanges))
              }
              onClick={() => void save(!row.is_published)}
            >
              {row.is_published ? "Unpublish" : "Publish"}
            </button>
          )}
          <button
            disabled={busy || workBusy || incomplete}
            onClick={() => {
              if (
                !(dirty || pendingChanges) ||
                window.confirm("Discard unsaved changes?")
              )
                close();
            }}
          >
            Back to list
          </button>
        </div>
        {gallery && pendingChanges && (
          <p className={s.hint} role="status">
            You have unsaved photo descriptions, cover or layout settings. Save
            them below before publishing; Save changes above saves album details
            only.
          </p>
        )}
        <p className={s.hint}>
          {gallery
            ? "Publishing requires a title and at least one photo. The selected cover is independent of photo order; otherwise the first photo is used. Removing the last photo automatically returns the album to draft."
            : "Save changes after choosing or removing a photo."}
        </p>
      </div>
      {gallery && row ? (
        <>
          <UploadQueue
            folder="gallery"
            save={(job) => saveAlbumPhoto(row.id, job)}
            changed={refreshAlbum}
            incomplete={setIncomplete}
          />
          <PhotoEditor
            dirtyChanged={setPhotoDirty}
            locked={busy || layoutBusy}
            pending={setPhotoBusy}
            album={row as MemoryAlbum}
            albumId={row.id}
            version={photoVersion}
            changed={refreshAlbum}
          />
          <AlbumLayoutPicker
            album={row as MemoryAlbum}
            version={photoVersion}
            locked={busy || photoBusy}
            pending={setLayoutBusy}
            dirtyChanged={setLayoutDirty}
            saved={layoutSaved}
          />
        </>
      ) : !gallery ? (
        <UploadQueue
          folder="past-members"
          multiple={false}
          save={memberImage}
          changed={() => {}}
          incomplete={setIncomplete}
        />
      ) : (
        <p className={s.hint}>
          Enter an album title and choose Create draft. You can then add several
          photos at once, choose their order, and write optional descriptions.
        </p>
      )}
    </>
  );
}
type PhotoDraft = { base: MemoryPhoto; alt: string; caption: string };
const isPhotoDirty = (draft: PhotoDraft) =>
  draft.alt.trim() !== draft.base.alt_text ||
  (draft.caption.trim() || null) !== draft.base.caption;

function coverFrame(album: MemoryAlbum): CoverFrame {
  return {
    cover_photo_id: album.cover_photo_id ?? null,
    cover_offset_x: album.cover_offset_x ?? 0,
    cover_offset_y: album.cover_offset_y ?? 0,
    cover_zoom: album.cover_zoom ?? 100,
  };
}

function PhotoEditor({
  album,
  albumId,
  version,
  changed,
  pending,
  dirtyChanged,
  locked,
}: {
  album: MemoryAlbum;
  albumId: string;
  version: number;
  changed: () => Promise<void>;
  pending: (value: boolean) => void;
  dirtyChanged: (value: boolean) => void;
  locked: boolean;
}) {
  // Lives above the loading/list branch: a refresh, reorder, or another photo's
  // save must never destroy text the committee member is still writing.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [arrange, setArrange] = useState(false);
  const [cachedPhotos, setCachedPhotos] = useState<MemoryPhoto[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PhotoDraft>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [coverDraft, setCoverDraft] = useState<{
    base: CoverFrame;
    value: CoverFrame;
  } | null>(null);
  const coverValue = coverDraft?.value ?? coverFrame(album);
  const coverDirty =
    !!coverDraft &&
    JSON.stringify(coverDraft.base) !== JSON.stringify(coverDraft.value);
  const dragRef = useRef<{
    id: string;
    pointer: number;
    startX: number;
    startY: number;
    active: boolean;
    expected: string[];
    over: string | null;
  } | null>(null);
  const [dragView, setDragView] = useState<{
    id: string;
    over: string | null;
    x: number;
    y: number;
  } | null>(null);
  const dirtyCount = Object.values(drafts).filter(isPhotoDirty).length;
  useEffect(() => {
    dirtyChanged(dirtyCount > 0 || coverDirty);
  }, [dirtyCount, coverDirty, dirtyChanged]);
  const loader = useCallback(async () => {
    void version;
    const r = await database()
      .from("memory_photos")
      .select("*")
      .eq("album_id", albumId)
      .order("sort_order")
      .order("id");
    if (r.error) throw new Error(memoryWriteError(r.error));
    setCachedPhotos(r.data as MemoryPhoto[]);
    return r.data as MemoryPhoto[];
  }, [albumId, version]);
  const state = useLive(loader);
  const rows = state.data ?? cachedPhotos;
  const selected = rows.find((p) => p.id === selectedId);
  function edit(photo: MemoryPhoto, field: "alt" | "caption", value: string) {
    setDrafts((current) => ({
      ...current,
      [photo.id]: {
        ...(current[photo.id] ?? {
          base: photo,
          alt: photo.alt_text,
          caption: photo.caption ?? "",
        }),
        [field]: value,
      },
    }));
    setNotice("");
  }
  function forget(id: string) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setRowErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }
  function working(value: boolean) {
    setBusy(value);
    pending(value);
  }
  function changeCover(value: CoverFrame) {
    setCoverDraft((current) => ({
      base: current?.base ?? coverFrame(album),
      value,
    }));
  }
  async function saveCover() {
    if (busy || locked || !coverDirty) return;
    working(true);
    setError("");
    setNotice("");
    try {
      if (
        JSON.stringify(coverDraft!.base) !== JSON.stringify(coverFrame(album))
      )
        throw new Error(
          "The cover changed elsewhere. Your framing is kept. Reload before replacing it.",
        );
      checkWrite(
        await database()
          .from("memory_albums")
          .update(coverValue)
          .eq("id", albumId)
          .eq("updated_at", album.updated_at)
          .select(),
      );
      setCoverDraft(null);
      await changed();
      setNotice("Cover saved.");
    } catch (e) {
      setError(message(e));
    } finally {
      working(false);
    }
  }
  async function reorder(expected: string[], ordered: string[]) {
    if (busy || locked || expected.every((id, i) => id === ordered[i])) return;
    working(true);
    setError("");
    setNotice("");
    try {
      const result = await database().rpc("reorder_memory_photos", {
        p_album_id: albumId,
        p_expected_ids: expected,
        p_ordered_ids: ordered,
      });
      if (result.error) throw new Error(memoryWriteError(result.error));
      await changed();
      setNotice("Photo order saved.");
    } catch (e) {
      setError(message(e));
    } finally {
      working(false);
    }
  }
  function move(index: number, delta: number) {
    const expected = state.data?.map((p) => p.id);
    if (!expected || !expected[index + delta]) return;
    const ordered = [...expected];
    [ordered[index], ordered[index + delta]] = [
      ordered[index + delta],
      ordered[index],
    ];
    void reorder(expected, ordered);
  }
  function cancelDrag() {
    dragRef.current = null;
    setDragView(null);
  }
  function dragStart(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (
      busy ||
      locked ||
      e.button !== 0 ||
      dragRef.current ||
      !state.data ||
      (e.pointerType !== "mouse" && !arrange)
    )
      return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    dragRef.current = {
      id,
      pointer: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      expected: state.data.map((p) => p.id),
      over: id,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function dragMove(e: React.PointerEvent<HTMLButtonElement>) {
    const active = dragRef.current;
    if (!active || active.pointer !== e.pointerId) return;
    if (
      !active.active &&
      Math.hypot(e.clientX - active.startX, e.clientY - active.startY) < 6
    )
      return;
    active.active = true;
    const hit = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-photo-id]");
    const over = hit?.dataset.photoId ?? null;
    active.over = over && active.expected.includes(over) ? over : null;
    setDragView({
      id: active.id,
      over: active.over,
      x: e.clientX,
      y: e.clientY,
    });
    if (e.clientY < 80) window.scrollBy(0, -20);
    else if (e.clientY > window.innerHeight - 80) window.scrollBy(0, 20);
  }
  function dragEnd(e: React.PointerEvent<HTMLButtonElement>) {
    const active = dragRef.current;
    if (!active || active.pointer !== e.pointerId) return;
    cancelDrag();
    if (!active.active || !active.over || active.over === active.id) return;
    const target = active.expected.indexOf(active.over);
    const ordered = active.expected.filter((id) => id !== active.id);
    ordered.splice(target, 0, active.id);
    void reorder(active.expected, ordered);
  }
  async function write(photo: MemoryPhoto, remove: boolean) {
    const draft = drafts[photo.id];
    const baseline = draft?.base ?? photo;
    let query = remove
      ? database().from("memory_photos").delete()
      : database()
          .from("memory_photos")
          .update({
            alt_text:
              (draft?.alt ?? photo.alt_text).trim() ||
              photo.alt_text ||
              "Event photo",
            caption: (draft?.caption ?? photo.caption ?? "").trim() || null,
          });
    // Current order can change through our own move. Text remains checked against
    // the original editing baseline so a remote text change is never overwritten.
    query = query
      .eq("id", photo.id)
      .eq("album_id", albumId)
      .eq("sort_order", photo.sort_order)
      .eq("alt_text", baseline.alt_text);
    query =
      baseline.caption === null
        ? query.is("caption", null)
        : query.eq("caption", baseline.caption);
    checkWrite(await query.select());
    forget(photo.id);
  }
  async function saveOne(photo: MemoryPhoto, remove: boolean) {
    if (busy || locked) return;
    working(true);
    setError("");
    setNotice("");
    try {
      await write(photo, remove);
      if (remove) setSelectedId(null);
      setNotice(remove ? "Photo removed." : "Photo description saved.");
      await changed();
    } catch (e) {
      setRowErrors((current) => ({ ...current, [photo.id]: message(e) }));
    } finally {
      working(false);
    }
  }
  async function saveAll() {
    if (busy || locked || !state.data) return;
    working(true);
    setError("");
    setNotice("");
    let saved = 0,
      failed = 0;
    const entries = Object.entries(drafts).filter(([, draft]) =>
      isPhotoDirty(draft),
    );
    try {
      for (const [id] of entries) {
        const photo = state.data.find((p) => p.id === id);
        try {
          if (!photo)
            throw new Error(
              "This photo is no longer in the album. Your description is kept below.",
            );
          await write(photo, false);
          saved++;
        } catch (e) {
          failed++;
          setRowErrors((current) => ({ ...current, [id]: message(e) }));
        }
      }
      setNotice(
        `${saved} photo description${saved === 1 ? "" : "s"} saved.${failed ? ` ${failed} could not be saved; their text is kept. Review the errors below.` : ""}`,
      );
      if (saved) await changed();
    } finally {
      working(false);
    }
  }
  const missingDrafts = state.data
    ? Object.entries(drafts).filter(
        ([id, draft]) =>
          isPhotoDirty(draft) && !state.data!.some((photo) => photo.id === id),
      )
    : [];
  const selectedIndex = rows.findIndex((p) => p.id === selectedId);
  const coverId = coverValue.cover_photo_id ?? rows[0]?.id;
  return (
    <section className={`${s.panel} ${g.editor}`} aria-label="Album photos">
      <div className={g.heading}>
        <div>
          <h2>Album photos</h2>
          <p className={s.hint}>
            Drag images to reorder. Double-click an image, or choose its details
            button, to add a description or choose the cover. On touch screens,
            turn on Arrange photos to drag.
          </p>
        </div>
        <div className={g.actions}>
          <button
            disabled={busy || locked}
            aria-pressed={arrange}
            onClick={() => {
              cancelDrag();
              setArrange(!arrange);
            }}
          >
            {arrange ? "Done arranging" : "Arrange photos"}
          </button>
          <button
            disabled={busy || locked || state.loading || !dirtyCount}
            onClick={() => void saveAll()}
          >
            Save all descriptions
          </button>
        </div>
      </div>
      <p className={g.statusLine} role="status">
        {dragView
          ? dragView.over
            ? "Release to move to position " +
              (rows.findIndex((p) => p.id === dragView.over) + 1) +
              ". Escape cancels."
            : "Release outside the grid to cancel."
          : notice ||
            (dirtyCount || coverDirty
              ? "Unsaved descriptions or cover settings are kept while you browse photos."
              : "Descriptions are optional. Your cover can be any photo.")}
      </p>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {state.error && (
        <p role="alert">
          {state.error}
          <button onClick={state.retry}>Retry</button>
        </p>
      )}
      {state.loading && <p role="status">Refreshing photos...</p>}
      <ol className={g.compactGrid}>
        {rows.map((photo, index) => (
          <li
            key={photo.id}
            data-photo-id={photo.id}
            aria-label={`Photo ${index + 1}`}
            className={`${g.tile} ${dragView?.id === photo.id ? g.dragging : ""} ${dragView?.over === photo.id && dragView.id !== photo.id ? g.insertion : ""}`}
          >
            <button
              className={`${g.thumbnailButton} ${arrange ? g.arranging : ""}`}
              aria-label={`Photo ${index + 1}: open details`}
              disabled={busy || locked || state.loading}
              onDoubleClick={() => setSelectedId(photo.id)}
              onClick={(e) => {
                if (e.detail === 0) setSelectedId(photo.id);
              }}
              onDragStart={(e) => e.preventDefault()}
              onPointerDown={(e) => dragStart(e, photo.id)}
              onPointerMove={dragMove}
              onPointerUp={dragEnd}
              onPointerCancel={cancelDrag}
              onLostPointerCapture={cancelDrag}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancelDrag();
              }}
            >
              <img
                src={photo.thumbnail_url}
                alt={photo.alt_text}
                draggable={false}
                loading="lazy"
              />
            </button>
            <span className={g.tileNumber}>{index + 1}</span>
            {photo.id === coverId && <span className={g.tileCover}>Cover</span>}
            {drafts[photo.id] && isPhotoDirty(drafts[photo.id]) && (
              <span className={g.tileDirty} aria-label="Unsaved description">
                Unsaved
              </span>
            )}
            <button
              className={g.detailsButton}
              aria-label={`Edit photo ${index + 1}`}
              onClick={() => setSelectedId(photo.id)}
            >
              ...
            </button>
          </li>
        ))}
      </ol>
      {!rows.length && !state.loading && (
        <p>Choose images above to start your album.</p>
      )}
      {dragView && (
        <img
          className={g.floatingPhoto}
          src={rows.find((p) => p.id === dragView.id)?.thumbnail_url}
          alt=""
          aria-hidden="true"
          style={{ left: dragView.x + 14, top: dragView.y + 14 }}
        />
      )}
      {selected && (
        <PhotoDetails
          key={selected.id}
          photo={selected}
          index={selectedIndex}
          last={selectedIndex === rows.length - 1}
          busy={busy || locked || state.loading}
          draft={drafts[selected.id]}
          error={rowErrors[selected.id] || error || state.error || ""}
          notice={notice}
          close={() => {
            setSelectedId(null);
            setNotice(
              "Any unsaved descriptions or cover settings are kept. Use their Save buttons when ready.",
            );
          }}
          edit={(field, value) => edit(selected, field, value)}
          save={() => void saveOne(selected, false)}
          remove={() => void saveOne(selected, true)}
          move={(delta) => move(selectedIndex, delta)}
          selectedCover={selected.id === coverId}
          setCover={() =>
            changeCover({
              cover_photo_id: selected.id,
              cover_offset_x: 0,
              cover_offset_y: 0,
              cover_zoom: 100,
            })
          }
          coverValue={coverValue}
          coverDirty={coverDirty}
          saveCover={() => void saveCover()}
          changeCover={(value) =>
            changeCover({
              ...value,
              cover_photo_id: value.cover_photo_id ?? selected.id,
            })
          }
        />
      )}
      {missingDrafts.map(([id, draft]) => (
        <div key={id} className={g.missing}>
          <p>
            A photo you edited is no longer available. Your text is kept here.
          </p>
          <textarea
            readOnly
            aria-label="Unsaved description from removed photo"
            value={draft.caption}
          />
          <button onClick={() => forget(id)}>Discard this unsaved text</button>
        </div>
      ))}
    </section>
  );
}
function PhotoDetails({
  photo,
  index,
  last,
  busy,
  draft,
  error,
  notice,
  close,
  edit,
  save,
  remove,
  move,
  selectedCover,
  setCover,
  coverValue,
  coverDirty,
  saveCover,
  changeCover,
}: {
  photo: MemoryPhoto;
  index: number;
  last: boolean;
  busy: boolean;
  draft?: PhotoDraft;
  error: string;
  notice: string;
  close: () => void;
  edit: (field: "alt" | "caption", value: string) => void;
  save: () => void;
  remove: () => void;
  move: (delta: number) => void;
  selectedCover: boolean;
  setCover: () => void;
  coverValue: CoverFrame;
  coverDirty: boolean;
  saveCover: () => void;
  changeCover: (value: CoverFrame) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    const element = dialog.current!;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      const current = document.querySelector<HTMLButtonElement>(
        `[data-photo-id="${photo.id}"] button`,
      );
      (trigger?.isConnected ? trigger : current)?.focus();
    };
  }, [photo.id]);
  return (
    <dialog
      ref={dialog}
      className={g.detailsDialog}
      aria-label="Photo details"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const all = Array.from(
          dialog.current!.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),textarea:not(:disabled),summary",
          ),
        ).filter((el) => el.getClientRects().length);
        const first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className={g.dialogHeader}>
        <h2>Photo {index + 1}</h2>
        <button onClick={close}>Close photo details</button>
      </div>
      <div className={g.dialogGrid}>
        <div>
          <img
            className={g.detailImage}
            src={photo.thumbnail_url}
            alt={photo.alt_text}
          />
          <div className={g.actions}>
            <button
              disabled={busy || index === 0}
              onClick={() => move(-1)}
              aria-label={`Move photo ${index + 1} up`}
            >
              Move earlier
            </button>
            <button
              disabled={busy || last}
              onClick={() => move(1)}
              aria-label={`Move photo ${index + 1} down`}
            >
              Move later
            </button>
          </div>
          <p>Use these buttons to arrange photos with the keyboard.</p>
        </div>
        <div>
          <label className={s.field}>
            <span>Description (optional)</span>
            <textarea
              rows={4}
              aria-label={`Description for photo ${index + 1}`}
              disabled={busy}
              value={draft?.caption ?? photo.caption ?? ""}
              onChange={(e) => edit("caption", e.target.value)}
            />
          </label>
          <details>
            <summary>Accessibility text</summary>
            <label className={s.field}>
              <span>Alternative text</span>
              <input
                disabled={busy}
                value={draft?.alt ?? photo.alt_text}
                onChange={(e) => edit("alt", e.target.value)}
              />
            </label>
          </details>
          <button
            disabled={busy || !draft || !isPhotoDirty(draft)}
            onClick={save}
          >
            Save description
          </button>
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          <div className={g.dialogCover}>
            <h3>Album cover</h3>
            <button
              disabled={
                busy || (selectedCover && coverValue.cover_photo_id !== null)
              }
              onClick={setCover}
            >
              {selectedCover && coverValue.cover_photo_id !== null
                ? "Selected cover"
                : "Set as cover"}
            </button>
            {selectedCover && (
              <>
                <GalleryCoverFraming
                  imageUrl={photo.thumbnail_url}
                  value={coverValue}
                  onChange={changeCover}
                  disabled={busy}
                />
                <button disabled={busy || !coverDirty} onClick={saveCover}>
                  Save cover
                </button>
                {coverDirty && <span> Unsaved cover</span>}
              </>
            )}
          </div>
          {confirm ? (
            <div>
              <p>Remove this photo and its unsaved text?</p>
              <button disabled={busy} onClick={remove}>
                Confirm removal
              </button>
              <button onClick={() => setConfirm(false)}>Keep</button>
            </div>
          ) : (
            <button disabled={busy} onClick={() => setConfirm(true)}>
              Remove photo
            </button>
          )}
          <p className={s.hint}>
            Closing keeps unsaved edits. Save description and Save cover store
            each change separately.
          </p>
        </div>
      </div>
    </dialog>
  );
}
