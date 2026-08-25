-- ============================================================================
-- Framing for the carousel banner
-- ============================================================================
-- 0006 let the featured event use a different picture up in the banner. Which
-- part of that picture survives was still hardcoded: object-fit: cover with
-- object-position: center. Centre is a poor default here for a reason that is
-- invisible from the admin screen — half the banner is covered by the text.
--
-- On desktop the overlay is a left-to-right gradient, opaque by 80%, with the
-- text card on the right at up to 42% width, so the usable area is roughly the
-- LEFT half. Below 768px the gradient turns vertical and the card goes full
-- width along the bottom, so the usable area becomes roughly the TOP half. One
-- focal point has to serve both, which is why the admin preview shows each.
--
-- Numbers and a two-value enum, deliberately, rather than one text column
-- holding an object-position string. These values are composed into an inline
-- style attribute, so a free-text column would be a CSS injection route
-- straight out of the events table. A smallint that cannot leave 0..100 and a
-- fit that cannot be anything but cover or contain make an invalid value
-- unstorable — including from a direct PostgREST call that never touches the
-- form's validation.
--
-- Defaults reproduce today's rendering exactly: 50/50 is centre, cover is what
-- the stylesheet already does. So no backfill, and every existing event renders
-- unchanged whether or not the new code has deployed yet.

alter table public.events
  add column if not exists carousel_focal_x smallint not null default 50,
  add column if not exists carousel_focal_y smallint not null default 50,
  add column if not exists carousel_fit     text     not null default 'cover';

alter table public.events
  drop constraint if exists events_carousel_focal_range,
  drop constraint if exists events_carousel_fit_valid;

alter table public.events
  add constraint events_carousel_focal_range
    check (carousel_focal_x between 0 and 100
       and carousel_focal_y between 0 and 100),
  add constraint events_carousel_fit_valid
    check (carousel_fit in ('cover', 'contain'));

comment on column public.events.carousel_focal_x is
  'Horizontal focal point for the carousel banner, 0-100. Becomes the first half of object-position. 50 is centre.';
comment on column public.events.carousel_focal_y is
  'Vertical focal point for the carousel banner, 0-100. Becomes the second half of object-position. 50 is centre.';
comment on column public.events.carousel_fit is
  'How the banner picture fills its strip: cover crops to fill, contain shows the whole image letterboxed. Constrained because it is rendered into an inline style.';
