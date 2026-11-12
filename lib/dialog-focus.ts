import type { KeyboardEvent } from "react";

/** Keep Tab within a native modal, including when its heading owns focus. */
export function trapDialogTab(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab" || !event.currentTarget.matches(":modal")) return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], [tabindex="0"]',
    ),
  );
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) return;
  const focused = document.activeElement as HTMLElement;
  if (event.shiftKey && (focused === first || !controls.includes(focused))) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    (focused === last || !controls.includes(focused))
  ) {
    event.preventDefault();
    first.focus();
  }
}
