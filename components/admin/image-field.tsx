"use client";

import { useRef, useState } from "react";
import { resolveImageUrl, uploadImage } from "@/lib/storage";
import styles from "@/app/admin/admin.module.css";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  folder: "events" | "team";
  /** Used to name the stored file so it is recognisable in the bucket. */
  baseName?: string;
};

export default function ImageField({ label, value, onChange, folder, baseName }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = resolveImageUrl(value);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    const result = await uploadImage(file, folder, baseName);
    setBusy(false);

    if ("error" in result) {
      setError(result.error);
      // Clear the picker so choosing the same file again re-triggers onChange.
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onChange(result.url);
  }

  return (
    <div className={styles.field}>
      <span>{label}</span>

      <div className={styles.image_field}>
        {preview ? (
          // A plain img, not next/image: the source is user-supplied at runtime
          // and this is an admin-only preview, so optimisation buys nothing.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className={styles.image_preview} />
        ) : (
          <div className={styles.image_placeholder}>No image</div>
        )}

        <div className={styles.image_controls}>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => handleFile(e.target.files?.[0])}
            disabled={busy}
          />
          {value && (
            <button
              type="button"
              className={styles.ghost_button}
              onClick={() => {
                onChange("");
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Remove image
            </button>
          )}
        </div>
      </div>

      {busy && <small className={styles.hint}>Uploading…</small>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/social.jpeg"
      />
      <small className={styles.hint}>
        Upload a file above, or type a path to an image already in the site.
        Both work. Max 5 MB, PNG/JPEG/WebP/GIF.
      </small>
    </div>
  );
}
