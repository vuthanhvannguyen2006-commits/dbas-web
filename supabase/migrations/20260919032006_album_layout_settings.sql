-- Album layout composer: a saved, allowlisted format and template per album.
-- Additive only. Two new columns with defaults; no data is rewritten, no policy,
-- grant, trigger or function is touched. Every existing album (and every album
-- inserted by an older client that never mentions these columns) is the regular
-- grid, exactly as it rendered before.
--
-- The allowlist below is mirrored by ALBUM_TEMPLATES in lib/album-layout.ts and
-- a test compares the two, so extending one without the other fails the local tests.
--
-- Rollback: restore the previous frontend; retain these columns and authored
-- layout settings. Do not drop populated content or layout settings.
alter table public.memory_albums
  add column layout_format text not null default 'grid',
  add column layout_template text not null default 'regular',
  add constraint memory_albums_layout_allowed check (
    (layout_format, layout_template) in (
      ('grid', 'regular'),
      ('gallery-wall', 'salon'),
      ('gallery-wall', 'symmetry'),
      ('mosaic', 'tiles'),
      ('mosaic', 'bands'),
      ('story', 'chapters'),
      ('story', 'filmstrip')
    )
  );
