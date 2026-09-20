"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { AI_LIMITS } from "@/lib/album-ai";
import s from "./admin.module.css";

/* Optional writing help. The committee member's own notes go to a server route
   that checks their session and role; the reply is only ever a proposal in an
   editable box. It reaches the story field solely through the Apply button, and
   even then it is not saved until the usual Save changes. */
export default function AlbumAiAssist({
  title,
  eventDate,
  currentStory,
  disabled,
  apply,
}: {
  title: string;
  eventDate: string;
  currentStory: string;
  disabled: boolean;
  apply: (text: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const [proposal, setProposal] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState(false);

  const tooShort = notes.trim().length < AI_LIMITS.minNotesChars;

  async function generate() {
    if (busy || disabled || tooShort) return;
    setBusy(true);
    setError("");
    setStatus("");
    setConfirming(false);
    try {
      const token = (await supabase?.auth.getSession())?.data.session
        ?.access_token;
      if (!token) throw new Error("Sign in again to use writing help.");
      const response = await fetch("/api/admin/album-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes, title, eventDate: eventDate || null }),
        signal: AbortSignal.timeout(AI_LIMITS.timeoutMs + 5000),
      });
      const body = (await response.json().catch(() => null)) as {
        proposal?: string;
        warnings?: string[];
        error?: string;
      } | null;
      if (!response.ok || typeof body?.proposal !== "string")
        throw new Error(
          body?.error ?? "Writing help is unavailable. Write the story by hand.",
        );
      setProposal(body.proposal);
      setWarnings(body.warnings ?? []);
      setStatus("Proposal ready. Edit it, then choose Apply to story.");
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e.message
          : "Writing help took too long. Try again or write the story by hand.",
      );
    } finally {
      setBusy(false);
    }
  }

  function applyNow() {
    if (proposal === null || !proposal.trim()) return;
    apply(proposal.trim());
    setProposal(null);
    setWarnings([]);
    setConfirming(false);
    setStatus("Applied to the story field. It is not saved until you choose Save changes.");
  }

  return (
    <details className={s.field}>
      <summary>Draft the story from my notes (optional)</summary>
      <p className={s.hint}>
        Type facts about the event. The assistant turns only those notes into a
        draft for you to edit. It cannot see the photos, and nothing is
        changed until you choose Apply. Writing by hand always works.
      </p>
      <p className={s.hint}>
        Writing help sends your notes, album title and date to the AI provider
        when you request a draft. Photos are not sent.
      </p>
      <label className={s.field}>
        <span>Your notes</span>
        <textarea
          rows={5}
          maxLength={AI_LIMITS.maxNotesChars}
          value={notes}
          disabled={busy || disabled}
          onChange={(e) => setNotes(e.target.value)}
        />
        <small className={s.hint}>
          {notes.length} / {AI_LIMITS.maxNotesChars}. At least{" "}
          {AI_LIMITS.minNotesChars} characters.
        </small>
      </label>
      <div className={s.actions}>
        <button
          type="button"
          disabled={busy || disabled || tooShort}
          onClick={() => void generate()}
        >
          {busy ? "Drafting..." : proposal === null ? "Draft from notes" : "Draft again"}
        </button>
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
      {proposal !== null && (
        <>
          <label className={s.field}>
            <span>Proposed story (editable, not yet applied)</span>
            <textarea
              rows={7}
              maxLength={AI_LIMITS.maxOutputChars}
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
            />
          </label>
          {warnings.length > 0 && (
            <ul className={s.hint}>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <p className={s.hint}>
            This was written by an AI from your notes. Check every fact before
            you use it.
          </p>
          <div className={s.actions}>
            {confirming ? (
              <>
                <span>This replaces the story text you have now.</span>
                <button type="button" onClick={applyNow}>
                  Confirm replace
                </button>
                <button type="button" onClick={() => setConfirming(false)}>
                  Keep my text
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={!proposal.trim() || disabled}
                onClick={() =>
                  currentStory.trim() ? setConfirming(true) : applyNow()
                }
              >
                Apply to story
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setProposal(null);
                setWarnings([]);
                setConfirming(false);
                setStatus("Proposal discarded.");
              }}
            >
              Discard proposal
            </button>
          </div>
        </>
      )}
    </details>
  );
}
