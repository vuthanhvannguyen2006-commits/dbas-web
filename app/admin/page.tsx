"use client";

import Link from "next/link";
import { useAdminSession } from "@/components/admin/admin-session";
import styles from "./admin.module.css";

export default function AdminOverviewPage() {
  const { role } = useAdminSession();

  return (
    <>
      <h1 className={styles.page_heading}>
        <span className={styles.accent}>Manage</span> the site
      </h1>
      <p className={styles.page_sub}>
        Changes you make here appear on the public website straight away. No
        rebuild, no code, no files to edit.
      </p>

      <div className={styles.card_grid}>
        <Link href="/admin/events" className={styles.card}>
          <h2>Events</h2>
          <p>
            Add and edit events. Upcoming and past are sorted automatically from
            the date, so nothing needs moving between lists.
          </p>
          <span className={styles.card_cta}>Open Events →</span>
        </Link>

        {role === "admin" ? (
          <Link href="/admin/team" className={styles.card}>
            <h2>Team</h2>
            <p>
              Add, edit and reorder the committee members shown on the About
              page.
            </p>
            <span className={styles.card_cta}>Open Team →</span>
          </Link>
        ) : (
          <div className={`${styles.card} ${styles.card_locked}`}>
            <h2>Team</h2>
            <p>
              Editing the committee list is limited to admin accounts. Ask an
              admin if you need a change made here.
            </p>
            <span className={styles.card_cta}>Admin only</span>
          </div>
        )}
      </div>
    </>
  );
}
