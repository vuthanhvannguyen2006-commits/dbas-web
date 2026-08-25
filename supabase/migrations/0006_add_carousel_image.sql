-- ============================================================================
-- A separate picture for the carousel banner
-- ============================================================================
-- The featured event appears in two places at once: as a wide banner at the top
-- of /events, and as a card in the grid below. The banner is rendered with
-- object-fit: cover, so a tall poster gets centre-cropped and loses its top and
-- bottom, while the same poster is perfectly fine on a card. Until now both read
-- image_url, so the only way to fix the banner was to ruin the card.
--
-- Nullable, and no backfill. Every existing row gets null and keeps rendering
-- exactly as it does today, because the site falls back to image_url whenever
-- this is empty. That fallback is the reason this can be added to a live site
-- without a coordinated deploy.
--
-- No grants and no policy changes are needed. The grants in 0003 are
-- table-level (grant select on public.events to anon), not column-level, so a
-- new column is covered the moment it exists; and the RLS policies restrict
-- which *rows* an account may touch, never which columns.

alter table public.events
  add column if not exists carousel_image_url text;

-- Same two shapes image_url accepts, and for the same reason: uploads are
-- absolute Supabase Storage URLs, while anything carried over from the old JSON
-- is a path into /public such as "events/party.png". lib/storage.ts
-- resolveImageUrl() renders both.
comment on column public.events.carousel_image_url is
  'Optional wide image for the /events carousel banner, used only while the event is featured. Falls back to image_url when null. Either a full Storage URL or a legacy /public path.';
