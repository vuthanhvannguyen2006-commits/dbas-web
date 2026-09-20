import { supabase } from "./supabase";
import {
  memoryWriteError,
  photoAltFromName,
  type UploadJob,
} from "./memories-core";
export function database() {
  if (!supabase)
    throw new Error(
      "Memories are temporarily unavailable. Please try again later.",
    );
  return supabase;
}
export function checkWrite(result: {
  data: unknown[] | null;
  error: { message: string; code?: string } | null;
}) {
  if (result.error) throw new Error(memoryWriteError(result.error));
  if (!result.data?.length)
    throw new Error(
      "Nothing changed. This item may have been removed, changed elsewhere, or your access has expired. Reload and try again.",
    );
}
export async function makeThumbnail(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    let scale = Math.min(
      1,
      960 / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    for (let attempt = 0; attempt < 6; attempt++) {
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error(
          "Your browser cannot create thumbnails. Try another browser.",
        );
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.65, 0.45]) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality),
        );
        if (!blob || blob.type !== "image/webp")
          throw new Error(
            "This browser cannot create WebP thumbnails. Try a current browser.",
          );
        if (blob.size <= 300 * 1024) return blob;
      }
      scale *= 0.7;
    }
    throw new Error(
      "Could not make a small enough thumbnail. Try a smaller image.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function uploadMemoryObject(
  folder: "gallery" | "past-members",
  id: string,
  blob: Blob,
  original: boolean,
): Promise<string> {
  const ext = (
    {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
    } as Record<string, string>
  )[blob.type];
  if (!ext) throw new Error("Unsupported image format.");
  const path = `${folder}/${id}/${original ? `original.${ext}` : "thumbnail.webp"}`;
  const bucket = database().storage.from("media");
  const { error } = await bucket.upload(path, blob, {
    upsert: false,
    cacheControl: "3600",
    contentType: blob.type,
  });
  if (error) {
    // A lost response may mean the immutable object already exists. Verify its
    // bytes before accepting a duplicate; never overwrite another object.
    if (!/already exists|duplicate/i.test(error.message))
      throw new Error(error.message);
    const existing = await bucket.download(path);
    if (existing.error || !existing.data)
      throw new Error("Unable to verify the previous upload. Retry.");
    const [a, b] = await Promise.all([
      blob.arrayBuffer(),
      existing.data.arrayBuffer(),
    ]);
    const [ha, hb] = await Promise.all([
      crypto.subtle.digest("SHA-256", a),
      crypto.subtle.digest("SHA-256", b),
    ]);
    if (String(new Uint8Array(ha)) !== String(new Uint8Array(hb)))
      throw new Error(
        "An image already exists at this address with different contents. Choose the file again.",
      );
  }
  return bucket.getPublicUrl(path).data.publicUrl;
}
export async function saveAlbumPhoto(albumId: string, job: UploadJob) {
  if (!job.originalUrl || !job.thumbnailUrl)
    throw new Error("Both image versions must finish uploading first.");
  const payload = {
    id: job.id,
    album_id: albumId,
    image_url: job.originalUrl,
    thumbnail_url: job.thumbnailUrl,
    alt_text: photoAltFromName(job.file.name),
  };
  const result = await database()
    .from("memory_photos")
    .insert(payload)
    .select();
  if (result.error?.code === "23505") {
    const existing = await database()
      .from("memory_photos")
      .select("*")
      .eq("id", job.id)
      .single();
    if (
      !existing.error &&
      existing.data?.album_id === albumId &&
      existing.data?.image_url === job.originalUrl &&
      existing.data?.thumbnail_url === job.thumbnailUrl
    )
      return;
  }
  checkWrite(result);
}
