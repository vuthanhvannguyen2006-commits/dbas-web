-- ============================================================================
-- The banner never crops the picture
-- ============================================================================
-- object-fit: cover trims the picture to the banner's shape *before* the zoom
-- and offset are applied, so what you drag around is an already-trimmed
-- rectangle — the edges it removed are gone, and no amount of dragging brings
-- them back. Shrinking the picture then showed a cropped fragment floating in
-- the background, which is nobody's intent.
--
-- The banner is now always a window onto the whole picture. carousel_fit no
-- longer decides anything: nothing reads it.
--
-- It is deliberately NOT dropped. The deployment currently serving the club
-- site still writes this column on every save, and 0010 exists because
-- removing a column out from under a live writer is exactly the mistake made
-- one migration earlier. Drop it only once no deployment writes it, together
-- with the focal shims from 0010 — one cleanup, after everything is aligned.

comment on column public.events.carousel_fit is
  'DEPRECATED and unread. The banner always shows the whole picture; size and position come from carousel_zoom and carousel_offset_x/y. Kept only so deployments still writing it do not fail. Drop alongside the 0010 shims once nothing writes any of them.';
