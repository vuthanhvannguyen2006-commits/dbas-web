"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ImageField from "@/components/admin/image-field";
import type { TeamMemberRow } from "@/lib/types";
import { useAdminSession } from "@/components/admin/admin-session";
import styles from "../admin.module.css";

type Draft = {
  name: string;
  role: string;
  slug: string;
  bio: string;
  tags: string;
  imageUrl: string;
  linkedinUrl: string;
  isPublished: boolean;
};

const EMPTY: Draft = {
  name: "",
  role: "",
  slug: "",
  bio: "",
  tags: "",
  imageUrl: "",
  linkedinUrl: "",
  isPublished: true,
};

function toDraft(m: TeamMemberRow): Draft {
  return {
    name: m.name,
    role: m.role,
    slug: m.slug,
    bio: m.bio ?? "",
    tags: m.tags.join(", "),
    imageUrl: m.image_url ?? "",
    linkedinUrl: m.linkedin_url ?? "",
    isPublished: m.is_published,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function AdminTeamPage() {
  const { role } = useAdminSession();

  const [members, setMembers] = useState<TeamMemberRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TeamMemberRow | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyMove, setBusyMove] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  // Once someone edits the web address by hand, typing in Name must stop
  // overwriting it — otherwise fixing a typo in the name silently discards
  // their edit.
  const [slugTouched, setSlugTouched] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await sb
        .from("team_members")
        .select("*")
        // created_at breaks ties. Without a second key, two rows sharing a
        // sort_order can come back in a different order each time.
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setMembers([]);
        return;
      }
      setLoadError(null);
      setMembers((data ?? []) as TeamMemberRow[]);
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // The tab is hidden for editors and the database refuses their writes; this
  // only stops a typed URL rendering a form that could never save.
  if (role !== "admin") {
    return (
      <>
        <h1 className={styles.page_heading}>Admin only</h1>
        <p className={styles.page_sub}>
          Editing the committee list is limited to admin accounts. Ask an admin
          if something here needs changing.
        </p>
      </>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    if (!draft.name.trim()) return setFieldError("Name is required.");
    if (!draft.role.trim()) return setFieldError("Role is required.");

    // A name of only punctuation slugifies to an empty string, which the
    // database would accept because "" is not null. Catch it here rather than
    // storing a member with a blank web address.
    const slug = draft.slug.trim() || slugify(draft.name);
    if (editing === "new" && !slug) {
      return setFieldError("Name needs at least one letter or number.");
    }
    setFieldError(null);

    const tags = draft.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      name: draft.name.trim(),
      role: draft.role.trim(),
      bio: draft.bio.trim() || null,
      tags,
      image_url: draft.imageUrl.trim() || null,
      linkedin_url: draft.linkedinUrl.trim() || null,
      is_published: draft.isPublished,
    };

    setSaving(true);
    let error;
    if (editing === "new") {
      // New members go to the end of the list. Spaced by 10 so someone can be
      // moved between two others later without renumbering everyone.
      const nextOrder = (members ?? []).reduce((m, x) => Math.max(m, x.sort_order), -10) + 10;
      ({ error } = await supabase.from("team_members").insert({
        ...payload,
        slug,
        sort_order: nextOrder,
      }));
    } else {
      ({ error } = await supabase
        .from("team_members")
        .update(payload)
        .eq("id", (editing as TeamMemberRow).id));
    }
    setSaving(false);

    if (error) {
      setSaveError(
        error.code === "23505"
          ? "Another member already uses that web address name. Try a different one."
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
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    setDeleting(null);
    setConfirmDelete(null);
    if (error) {
      setLoadError(error.message);
      return;
    }
    reload();
  }

  /* One database call, one transaction. Doing this as two separate updates
     from here meant a failure between them left both rows sharing a
     sort_order, with the screen still showing the old order. */
  async function move(index: number, direction: -1 | 1) {
    if (!supabase || !members) return;
    const a = members[index];
    const b = members[index + direction];
    if (!a || !b) return;

    setBusyMove(true);
    const { error } = await supabase.rpc("swap_team_sort_order", {
      id_a: a.id,
      id_b: b.id,
    });
    setBusyMove(false);

    if (error) setLoadError(error.message);
    // Reload either way. On failure the local list may no longer match the
    // database, and showing a stale order is worse than showing the error.
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
          <span className={styles.accent}>member</span>
        </h1>

        <form className={styles.form_panel} onSubmit={save}>
          <div className={styles.field_row}>
            <label className={styles.field}>
              <span>Name</span>
              <input
                value={draft.name}
                onChange={(e) => {
                  set("name", e.target.value);
                  if (editing === "new" && !slugTouched) {
                    set("slug", slugify(e.target.value));
                  }
                }}
              />
            </label>

            <label className={styles.field}>
              <span>Role</span>
              <input
                value={draft.role}
                onChange={(e) => set("role", e.target.value)}
                placeholder="Director of Marketing"
              />
            </label>
          </div>

          <label className={styles.field}>
            <span>Web address name</span>
            <input
              value={draft.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
              disabled={editing !== "new"}
            />
            <small className={styles.hint}>
              {editing === "new"
                ? "Filled in from the name. Letters, numbers and dashes only."
                : "Fixed once created, because other things may already point at it."}
            </small>
          </label>

          <label className={styles.field}>
            <span>Bio</span>
            <textarea rows={5} value={draft.bio} onChange={(e) => set("bio", e.target.value)} />
          </label>

          <label className={styles.field}>
            <span>Tags</span>
            <input
              value={draft.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="Marketing, Design, Content Creation"
            />
            <small className={styles.hint}>Separate with commas.</small>
          </label>

          <ImageField
            label="Photo"
            value={draft.imageUrl}
            onChange={(v) => set("imageUrl", v)}
            folder="team"
            baseName={draft.slug}
          />

          <label className={styles.field}>
            <span>LinkedIn URL</span>
            <input
              value={draft.linkedinUrl}
              onChange={(e) => set("linkedinUrl", e.target.value)}
              placeholder="https://linkedin.com/in/…"
            />
          </label>

          <div className={styles.toggle_row}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={draft.isPublished}
                onChange={(e) => set("isPublished", e.target.checked)}
              />
              <span>Visible on the About page</span>
            </label>
          </div>

          {fieldError && <p className={styles.error} role="alert">{fieldError}</p>}
          {saveError && <p className={styles.error} role="alert">{saveError}</p>}

          <div className={styles.form_actions}>
            <button type="submit" className={styles.primary_button} disabled={saving}>
              {saving ? "Saving…" : "Save member"}
            </button>
            <button type="button" className={styles.ghost_button} onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      </>
    );
  }

  /* ---------- List ---------- */

  return (
    <>
      <div className={styles.page_header_row}>
        <h1 className={styles.page_heading}>
          <span className={styles.accent}>Team</span>
        </h1>
        <button
          className={styles.primary_button}
          onClick={() => {
            setDraft(EMPTY);
            setEditing("new");
            setFieldError(null);
            setSaveError(null);
            setSlugTouched(false);
          }}
        >
          New member
        </button>
      </div>

      <p className={styles.page_sub}>
        The order here is the order they appear on the About page. Use the
        arrows to move someone up or down.
      </p>

      {loadError && <p className={styles.error} role="alert">{loadError}</p>}

      {members === null ? (
        <div className={styles.placeholder}><p>Loading members…</p></div>
      ) : members.length === 0 ? (
        <div className={styles.placeholder}><p>No members yet.</p></div>
      ) : (
        <ul className={styles.rows}>
          {members.map((m, i) => (
            <li key={m.id} className={styles.row}>
              <div className={styles.move_group}>
                <button
                  className={styles.move_button}
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || busyMove}
                  aria-label={`Move ${m.name} up`}
                >
                  ↑
                </button>
                <button
                  className={styles.move_button}
                  onClick={() => move(i, 1)}
                  disabled={i === members.length - 1 || busyMove}
                  aria-label={`Move ${m.name} down`}
                >
                  ↓
                </button>
              </div>

              <div className={styles.row_main}>
                <div className={styles.row_title}>
                  {m.name}
                  {!m.is_published && <span className={styles.badge_muted}>Hidden</span>}
                </div>
                <div className={styles.row_meta}>
                  {m.role}
                  {m.tags.length ? ` · ${m.tags.join(", ")}` : ""}
                </div>
              </div>

              <div className={styles.row_actions}>
                {confirmDelete === m.id ? (
                  <>
                    <span className={styles.confirm_text}>Remove {m.name}?</span>
                    <button
                      className={styles.danger_button}
                      onClick={() => remove(m.id)}
                      disabled={deleting === m.id}
                    >
                      {deleting === m.id ? "Removing…" : "Yes, remove"}
                    </button>
                    <button className={styles.ghost_button} onClick={() => setConfirmDelete(null)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={styles.ghost_button}
                      onClick={() => {
                        setDraft(toDraft(m));
                        setEditing(m);
                        setFieldError(null);
                        setSaveError(null);
                        setSlugTouched(true);
                      }}
                    >
                      Edit
                    </button>
                    <button className={styles.ghost_button} onClick={() => setConfirmDelete(m.id)}>
                      Remove
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
