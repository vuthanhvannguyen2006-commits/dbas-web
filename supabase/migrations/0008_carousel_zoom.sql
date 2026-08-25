-- ============================================================================
-- Zoom for the carousel banner
-- ============================================================================
-- 0007 gave the banner a focal point, which decides which part of a picture
-- stays visible. It could not change how much of the picture you see: the
-- crop was always exactly as much as object-fit: cover happened to give.
--
-- This adds a zoom, so the banner becomes a proper crop tool — size the picture
-- first, then drag it to the part you want. Stored as an integer percentage
-- (100 = actual size) rather than a float, for the same reason 0007 stored
-- percentages: it is composed into an inline style, so a value that cannot
-- leave a checked integer range cannot become anything else.
--
-- Capped at 400 because past roughly 4x a committee photo is visibly mushy,
-- and an uncapped zoom mostly produces banners nobody meant to publish.
--
-- Default 100 reproduces today's rendering exactly, so no backfill and every
-- existing event is unchanged.

alter table public.events
  add column if not exists carousel_zoom smallint not null default 100;

alter table public.events
  drop constraint if exists events_carousel_zoom_range;

alter table public.events
  add constraint events_carousel_zoom_range
    check (carousel_zoom between 100 and 400);

comment on column public.events.carousel_zoom is
  'How much the carousel banner picture is enlarged, as an integer percentage. 100 is actual size. Constrained because it is rendered into an inline style.';
