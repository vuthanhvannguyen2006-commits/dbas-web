"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminSessionProvider, useAdminSession } from "@/components/admin/admin-session";
import SignInForm from "@/components/admin/sign-in-form";
import styles from "./admin.module.css";

function AdminChrome({ children }: { children: React.ReactNode }) {
  const { status, email, role, signOut } = useAdminSession();
  const pathname = usePathname();

  if (status === "unconfigured") {
    return (
      <div className={styles.sign_in_screen}>
        <div className={styles.sign_in_card}>
          <h1 className={styles.sign_in_heading}>Not configured</h1>
          <p className={styles.sign_in_sub}>
            NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are missing
            from this deployment&apos;s environment variables.
          </p>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return <div className={styles.loading}>Loading…</div>;
  }

  if (status === "signed-out") {
    return <SignInForm />;
  }

  // Signed in but with no profiles row — the account exists in Auth but was
  // never given a permission level. Say so plainly rather than showing an
  // empty dashboard that looks broken.
  if (!role) {
    return (
      <div className={styles.sign_in_screen}>
        <div className={styles.sign_in_card}>
          <h1 className={styles.sign_in_heading}>No access level set</h1>
          <p className={styles.sign_in_sub}>
            This account has no role assigned yet. An admin needs to add it in
            Supabase before you can manage content.
          </p>
          <button className={styles.ghost_button} onClick={signOut}>Sign out</button>
        </div>
      </div>
    );
  }

  const tabs = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/events", label: "Events" },
    // Editors are not offered the team section. The database refuses their
    // writes regardless — this only avoids showing a door that will not open.
    ...(role === "admin" ? [{ href: "/admin/team", label: "Team" }] : []),
  ];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.header_inner}>
          <div className={styles.brand}>
            <span className={styles.accent}>DBAS</span> Admin
          </div>

          <nav className={styles.tabs}>
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={pathname === tab.href ? styles.tab_active : styles.tab}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          <div className={styles.account}>
            <span className={styles.role_pill}>{role}</span>
            <span className={styles.email}>{email}</span>
            <button className={styles.ghost_button} onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionProvider>
      <AdminChrome>{children}</AdminChrome>
    </AdminSessionProvider>
  );
}
