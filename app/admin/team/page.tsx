"use client";

import { useAdminSession } from "@/components/admin/admin-session";
import styles from "../admin.module.css";

export default function AdminTeamPage() {
  const { role } = useAdminSession();

  // The tab is hidden for editors, but the URL can still be typed. This is a
  // courtesy message, not a security control — the database refuses an
  // editor's writes to team_members whatever the browser decides to render.
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

  return (
    <>
      <h1 className={styles.page_heading}>
        <span className={styles.accent}>Team</span>
      </h1>
      <p className={styles.page_sub}>
        The member list and its form arrive in a later step.
      </p>

      <div className={styles.placeholder}>
        <p>Coming next: add, edit, reorder, and remove committee members.</p>
      </div>
    </>
  );
}
