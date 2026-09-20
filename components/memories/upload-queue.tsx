"use client";
import { useRef, useState } from "react";
import {
  runUpload,
  batchIncomplete,
  type UploadJob,
} from "@/lib/memories-core";
import { makeThumbnail, uploadMemoryObject } from "@/lib/memories";
import s from "./admin.module.css";
export default function UploadQueue({
  folder,
  multiple = true,
  save,
  changed,
  incomplete,
}: {
  folder: "gallery" | "past-members";
  multiple?: boolean;
  save: (job: UploadJob) => Promise<void>;
  changed: () => void | Promise<void>;
  incomplete: (value: boolean) => void;
}) {
  const jobs = useRef<UploadJob[]>([]);
  const running = useRef(false);
  const [, render] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const gallery = folder === "gallery" && multiple;
  const disabled = busy || (!multiple && batchIncomplete(jobs.current));
  const completed = jobs.current.filter((job) => job.phase === "done").length;
  function notify() {
    render((v) => v + 1);
    incomplete(running.current || batchIncomplete(jobs.current));
  }
  async function run(onlyId?: string) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    notify();
    try {
      for (const job of jobs.current)
        if (job.phase !== "done" && (!onlyId || job.id === onlyId))
          await runUpload(
            job,
            {
              thumbnail: makeThumbnail,
              upload: (id, blob, original) =>
                uploadMemoryObject(folder, id, blob, original),
              save,
            },
            notify,
          );
    } finally {
      try {
        // Keep Publish blocked until the album version reflects the new photos.
        await changed();
      } finally {
        running.current = false;
        setBusy(false);
        notify();
      }
    }
  }
  function add(files: File[]) {
    if (disabled || !files.length) return;
    jobs.current.push(...(multiple ? files : files.slice(0, 1)).map((file) => ({
      id: crypto.randomUUID(), file, phase: "waiting" as const,
    })));
    void run();
  }
  return (
    <section className={s.panel} aria-label="Image uploads">
      <h2>{gallery ? "Add photos in bulk" : multiple ? "Add photos" : "Member photo"}</h2>
      {gallery && <p className={s.hint}>Select several images at once, or drop a batch below. Once uploaded, arrange them and add optional descriptions in the photo grid.</p>}
      <p className={s.hint}>
        PNG, JPEG, WebP or GIF, up to 5 MiB each. A static WebP thumbnail is
        created for cards. Images use public storage: anyone with an image URL
        can access it, including draft images.
      </p>
      <label
        className={gallery ? `${s.uploadDropTarget} ${dragging ? s.uploadDragActive : ""}` : s.field}
        onDragOver={gallery ? (event) => { event.preventDefault(); if (!disabled) setDragging(true); } : undefined}
        onDragLeave={gallery ? (event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); } : undefined}
        onDrop={gallery ? (event) => {
          event.preventDefault();
          setDragging(false);
          add(Array.from(event.dataTransfer.files));
        } : undefined}
      >
        {gallery && <><span className={s.uploadSymbol} aria-hidden="true">＋</span><strong>{busy ? "Your photos are uploading" : "Drop a batch of photos here"}</strong></>}
        <span>Choose {multiple ? "photos" : "a photo"}</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple={multiple}
          aria-label={multiple ? "Choose photos" : "Choose a photo"}
          disabled={disabled}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            add(files);
          }}
        />
      </label>
      {gallery && jobs.current.length > 0 && <div className={s.uploadSummary}>
        <p role="status">{completed} of {jobs.current.length} photos saved</p>
        <progress value={completed} max={jobs.current.length} aria-label="Photos saved" />
      </div>}
      <ul className={s.queue} aria-live="polite">
        {jobs.current.map((job) => (
          <li key={job.id}>
            {job.file.name}: {gallery ? ({waiting: "Waiting", thumbnail: "Preparing image", original: "Uploading photo", "thumbnail upload": "Finishing upload", saving: "Saving photo", done: "Saved", failed: "Needs retry"} as const)[job.phase] : job.phase}
            {job.error && <span className={s.error}> ... {job.error}</span>}
            {job.phase === "failed" && (
              <>
              {gallery && <button disabled={busy} onClick={() => void run(job.id)} aria-label={`Retry ${job.file.name}`}>Retry image</button>}
              <button
                disabled={busy}
                onClick={() => {
                  jobs.current = jobs.current.filter((j) => j.id !== job.id);
                  notify();
                }}
              >
                Remove failed item
              </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {jobs.current.some((j) => j.phase === "failed") && (
        <button disabled={busy} onClick={() => void run()}>
          Retry failed uploads
        </button>
      )}
      {busy && <p role="status">Uploading... Please keep this editor open.</p>}
    </section>
  );
}
