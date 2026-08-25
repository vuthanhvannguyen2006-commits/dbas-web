-- ============================================================================
-- Free positioning for the carousel banner
-- ============================================================================
-- 0007 and 0008 positioned the banner picture with object-position and scaled
-- it with a transform. That combination has a hard limit built into it:
-- object-position is defined as a position *within* the box, so it clamps at
-- the picture's own edges. You can choose which part shows, but you can never
-- push the picture past the edge, and you can never make it smaller than the
-- box — cover always fills.
--
-- Both of those are things people expect from a crop tool, so panning moves to
-- a translate transform, which has no such limit.
--
-- The focal columns are renamed rather than dropped and re-added, because the
-- meaning is genuinely the same thing measured differently: where the picture
-- sits. What changes is the frame of reference — 0..100 as a point inside the
-- box becomes a signed offset from centre, so 50 (the old centre) becomes 0.
-- Every existing row is at the old default, so that conversion is exact.
--
-- Renaming is safe against already-deployed code: the reader does
-- `carousel_focal_x ?? 50`, so a column that has gone missing falls back to
-- centre rather than throwing.

alter table public.events rename column carousel_focal_x to carousel_offset_x;
alter table public.events rename column carousel_focal_y to carousel_offset_y;

alter table public.events
  drop constraint if exists events_carousel_focal_range,
  drop constraint if exists events_carousel_zoom_range;

-- 50 meant centre under the old scheme; 0 means centre under the new one.
update public.events
set carousel_offset_x = 0, carousel_offset_y = 0
where carousel_offset_x = 50 and carousel_offset_y = 50;

alter table public.events
  alter column carousel_offset_x set default 0,
  alter column carousel_offset_y set default 0;

-- Percentages of the banner's own width and height. +-200 is enough to push a
-- picture completely out of sight, which is recoverable with Reset; leaving it
-- unbounded would let a stray drag store a value nobody could interpret later.
alter table public.events
  add constraint events_carousel_offset_range
    check (carousel_offset_x between -200 and 200
       and carousel_offset_y between -200 and 200);

-- Down to 20 so the picture can sit smaller than the banner with the
-- background showing around it, which is the point of this migration.
alter table public.events
  add constraint events_carousel_zoom_range
    check (carousel_zoom between 20 and 400);

comment on column public.events.carousel_offset_x is
  'How far the banner picture is shifted horizontally, as a percentage of the banner width. 0 is centred, negative moves it left. Constrained because it is rendered into an inline style.';
comment on column public.events.carousel_offset_y is
  'How far the banner picture is shifted vertically, as a percentage of the banner height. 0 is centred, negative moves it up.';
comment on column public.events.carousel_zoom is
  'Size of the banner picture as an integer percentage. 100 fills the banner; below 100 leaves the background showing around it.';
