export type MemoryAlbum = {
  id: string;
  title: string;
  event_date: string | null;
  story: string | null;
  linked_event_id: string | null;
  cover_photo_id: string | null;
  cover_offset_x: number;
  cover_offset_y: number;
  cover_zoom: number;
  /* Saved layout. Optional because rows read before the layout migration is
     applied do not carry these columns; resolveLayout() treats absent or
     unrecognised values as the regular grid. */
  layout_format?: string;
  layout_template?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
export type MemoryPhoto = {
  id: string;
  album_id: string;
  image_url: string;
  thumbnail_url: string;
  alt_text: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};
// The admin preview and public album cover use the same 4:3 image box.
export function coverImageStyle(album: Partial<Pick<MemoryAlbum,
  "cover_offset_x" | "cover_offset_y" | "cover_zoom"
>>) {
  return {
    objectFit: "contain" as const,
    transform: `translate(${album.cover_offset_x ?? 0}%, ${album.cover_offset_y ?? 0}%) scale(${(album.cover_zoom ?? 100) / 100})`,
  };
}
export type PastMember = {
  id: string;
  name: string;
  former_role: string | null;
  years_active: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  bio: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => Array.from(s)[0])
    .join("")
    .toUpperCase();
}
export function pageRange(page: number, size: number): [number, number] {
  const start = (Math.max(1, Math.floor(page)) - 1) * size;
  return [start, start + size - 1];
}
export function imageProblem(file: {
  type: string;
  size: number;
}): string | null {
  if (
    !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)
  )
    return "Use a PNG, JPEG, WebP or GIF image.";
  if (!file.size || file.size > 5 * 1024 * 1024)
    return "Images must be non-empty and no larger than 5 MiB.";
  return null;
}
export type UploadPhase =
  | "waiting"
  | "thumbnail"
  | "original"
  | "thumbnail upload"
  | "saving"
  | "done"
  | "failed";
export type UploadJob = {
  id: string;
  file: File;
  phase: UploadPhase;
  error?: string;
  thumb?: Blob;
  originalUrl?: string;
  thumbnailUrl?: string;
};
export type UploadSteps = {
  thumbnail: (file: File) => Promise<Blob>;
  upload: (id: string, blob: Blob, original: boolean) => Promise<string>;
  save: (job: UploadJob) => Promise<void>;
};
// Successful phases stay on the job, so retries never regenerate or replace an object.
export async function runUpload(
  job: UploadJob,
  steps: UploadSteps,
  changed: () => void,
): Promise<void> {
  if (job.phase === "done") return;
  job.error = undefined;
  try {
    const problem = imageProblem(job.file);
    if (problem) throw new Error(problem);
    if (!job.thumb) {
      job.phase = "thumbnail";
      changed();
      job.thumb = await steps.thumbnail(job.file);
    }
    if (
      job.thumb.type !== "image/webp" ||
      job.thumb.size > 300 * 1024 ||
      !job.thumb.size
    )
      throw new Error(
        "Could not create a supported thumbnail. Try another image.",
      );
    if (!job.originalUrl) {
      job.phase = "original";
      changed();
      job.originalUrl = await steps.upload(job.id, job.file, true);
    }
    if (!job.thumbnailUrl) {
      job.phase = "thumbnail upload";
      changed();
      job.thumbnailUrl = await steps.upload(job.id, job.thumb, false);
    }
    job.phase = "saving";
    changed();
    await steps.save(job);
    job.phase = "done";
  } catch (error) {
    job.phase = "failed";
    job.error =
      error instanceof Error
        ? error.message
        : "Upload failed. Retry this image.";
  }
  changed();
}
export function batchIncomplete(jobs: Pick<UploadJob, "phase">[]): boolean {
  return jobs.some((j) => j.phase !== "done");
}

export function photoAltFromName(name: string): string {
  return name.replace(/\.[^.]+$/, "").trim() || name.trim() || "Event photo";
}
export function memoryWriteError(error: {
  message: string;
  code?: string;
}): string {
  if (
    error.code === "40P01" ||
    error.code === "40001" ||
    /deadlock detected|could not serialize access/i.test(error.message)
  )
    return "Another edit happened at the same time; reload and try again.";
  return error.message;
}
