-- ============================================================================
-- Compatibility shim for the renamed focal columns
-- ============================================================================
-- 0009 renamed carousel_focal_x/y to carousel_offset_x/y. That was safe for
-- *reading* — the old reader does `carousel_focal_x ?? 50` and falls back to
-- centre — but not for writing. The admin form sends every column by name, so
-- a deployment still on the old code fails outright when saving an event:
-- "column carousel_focal_x of relation events does not exist".
--
-- The two sites share one database, so a rename lands on both the moment it is
-- applied, whether or not both are running the code that expects it. That is
-- the mistake: a rename is only safe when nothing writing to the old name is
-- still deployed anywhere, and here something was.
--
-- These columns exist purely to absorb those writes until every deployment is
-- on the offset columns. Nothing reads them. Once both sites are updated they
-- can be dropped, and dropping them is the whole of that change.
--
-- Nullable rather than NOT NULL: new code never mentions them, so an insert
-- from new code has to be allowed to leave them empty.

alter table public.events
  add column if not exists carousel_focal_x smallint default 50,
  add column if not exists carousel_focal_y smallint default 50;

comment on column public.events.carousel_focal_x is
  'DEPRECATED compatibility shim for pre-0009 deployments that still write this name. Nothing reads it. Drop once every deployment uses carousel_offset_x.';
comment on column public.events.carousel_focal_y is
  'DEPRECATED compatibility shim for pre-0009 deployments that still write this name. Nothing reads it. Drop once every deployment uses carousel_offset_y.';
