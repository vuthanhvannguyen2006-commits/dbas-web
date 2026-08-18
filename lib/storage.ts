import { supabase } from "./supabase";

const BUCKET = "media";

/* Kept in step with the bucket configuration in 0001_initial_schema.sql.
   Checking here too means the user gets a useful message instead of a raw
   storage error — but the bucket is what actually enforces it, so a crafted
   request cannot get around these. */
export const MAX_BYTES = 5 * 1024 * 1024;
export const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Turns a stored value into something an <img> can use.

    Two shapes exist and both must keep working: uploaded images are absolute
    Supabase Storage URLs, while everything imported from the old JSON is a
    path into /public, sometimes with a leading slash and sometimes not
    ("/social.jpeg" vs "events/party.png"). */
export function resolveImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return v.startsWith("/") ? v : `/${v}`;
}

export function describeFileProblem(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "That file is not an image. Use a PNG, JPEG, WebP or GIF.";
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `That image is ${mb} MB. The limit is 5 MB — try compressing it first.`;
  }
  return null;
}

function extensionFor(file: File): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : "";
  if (fromName && /^[a-z0-9]{1,5}$/i.test(fromName)) return fromName.toLowerCase();
  return file.type === "image/png" ? "png" : file.type === "image/gif" ? "gif" : "jpg";
}

/** Uploads and returns the public URL, or a message explaining why it failed.

    `folder` decides which storage policy applies: "events" allows admins and
    editors, "team" is admin-only. Passing the wrong one is refused by the
    database, not here. */
export async function uploadImage(
  file: File,
  folder: "events" | "team",
  baseName?: string
): Promise<{ url: string } | { error: string }> {
  if (!supabase) return { error: "Not connected to the database." };

  const problem = describeFileProblem(file);
  if (problem) return { error: problem };

  const base = (baseName || crypto.randomUUID()).replace(/[^a-zA-Z0-9-]/g, "") || crypto.randomUUID();
  const path = `${folder}/${base}-${Date.now()}.${extensionFor(file)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    // The storage layer says "new row violates row-level security policy" when
    // the folder is one this account may not write to. That is true but
    // unhelpful to a committee member.
    return {
      error: /row-level security|Unauthorized/i.test(error.message)
        ? "You do not have permission to upload images here."
        : error.message,
    };
  }

  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}
