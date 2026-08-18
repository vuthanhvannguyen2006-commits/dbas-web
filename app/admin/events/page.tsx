"use client";

import styles from "../admin.module.css";

export default function AdminEventsPage() {
  return (
    <>
      <h1 className={styles.page_heading}>
        <span className={styles.accent}>Events</span>
      </h1>
      <p className={styles.page_sub}>
        The event list and its form arrive in the next step. Sign-in, roles and
        the database behind this page are already in place.
      </p>

      <div className={styles.placeholder}>
        <p>Coming next: create, edit, delete, and feature an event.</p>
      </div>
    </>
  );
}
