"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import styles from "@/app/admin/admin.module.css";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Deliberately vague: naming which half was wrong tells an attacker
      // whether an address is a real committee account.
      setError("That email and password combination was not recognised.");
      setBusy(false);
      return;
    }
    // On success the session listener in AdminSessionProvider takes over.
  }

  return (
    <div className={styles.sign_in_screen}>
      <form className={styles.sign_in_card} onSubmit={handleSubmit}>
        <Image
          src="/dbas-logo.png"
          alt="DBAS logo"
          width={64}
          height={64}
          className={styles.sign_in_logo}
        />
        <h1 className={styles.sign_in_heading}>
          <span className={styles.accent}>DBAS</span> Admin
        </h1>
        <p className={styles.sign_in_sub}>Committee sign-in</p>

        <label className={styles.field}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className={styles.field}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <button type="submit" className={styles.primary_button} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className={styles.sign_in_note}>
          Accounts are created by an admin. There is no public sign-up.
        </p>
      </form>
    </div>
  );
}
