# Hall of Memories: operation and release guide

The feature adds `/hall-of-memories` and independent Gallery and Past Members
admin sections. It does not move current committee members or alter existing
event content. New records start as drafts.

## Creative album composer — 19 September 2026

Visual refinement later on 19 September: Filmstrip now uses a contained photo
beside a story/control panel on desktop, stacked on phones, with a clean
thumbnail row. The Hall and album pages share a viewport-sized particle canvas
clipped to the full main section, including content below the hero. Cursor
repulsion and cursor movement impart velocity; particles coast and gradually
slow through friction instead of returning to starting positions. Yellow,
cream and white colors remain. Reduced motion produces a static field; touch
scrolling and controls are not intercepted. The main website homepage is outside
this change, as confirmed by the user. No database changes or deployment.
Validation: 53 Node tests, focused lint, TypeScript/build, composer desktop/mobile
walkthrough and an instrumented browser check for scrolling coverage, physical
repulsion, coasting, static reduced motion, mobile fit and clickable controls.
The final particle tuning reduces cursor force and maximum speed, adds a brighter
glow, and replaces edge wrapping with invisible respawn into distributed regions
followed by a 1.4-second fade-in. Focused physics tests and browser checks passed.

## Club release handoff — 20 September 2026

Target: `https://deakinbas.vercel.app`, hosted in the club member's Vercel account.
Review and merge this feature PR into the club's connected production branch.
Then confirm Vercel builds that merge commit; if automatic deployment is disabled,
redeploy the production branch from that project's dashboard. Keep Node 24 and
the existing `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` settings.
No local `.env` files or local development credentials belong in the deployment.

The three Hall migrations are already registered on the shared production
Supabase project. Do not replay them or run an unrestricted `supabase db push`.
The release check on 20 September found zero albums, photos, past members,
Hall storage objects and known synthetic test accounts. No demo import is needed;
the Hall starts with empty-state messages, ready for the committee to add content.
Existing events, team and homepage content remain intact. Automated test fixtures
are kept for development and excluded from deployment inputs with `.vercelignore`.

After deployment, verify the desktop/mobile Hall navigation, both empty Hall tabs,
and the Gallery/Past Members admin sections with an existing authorized account.
Editors can manage Gallery; only admins can manage Past Members. AI writing help
remains optional and unavailable until the owner configures its two server-only
variables described below. Manual editing needs no AI key.
For rollback, restore the preceding frontend deployment and keep the database
tables and content. No production merge or deployment is performed by this PR.

Claude implemented the composer in a sanitized staging copy. The coordinator
integrated it, fixed stale layout draft handling, and verified the actual app.
The admin Gallery editor now offers these saved formats and templates:

| Format | Templates |
| --- | --- |
| Regular grid | Regular |
| Gallery wall | Salon hang, Symmetrical hang |
| Mosaic | Tessellate, Banded |
| Story | Chapters, Filmstrip |

Choose a format and template under **Album layout**, preview at desktop, tablet
or phone width, then **Save layout**. Existing albums remain regular grids.
The preview and public page share one responsive renderer. Preview scrolling
keeps large albums from pushing the controls out of reach. Frames follow the
saved photo order; frame crops do not change the originals. Clicking a photo
opens its full image and description. Filmstrip also supports swipe and
arrow/Home/End keys. Bulk uploads, direct photo dragging, double-click details,
independent cover framing and Past Members retain their existing behavior.

Unsaved layout settings block publishing. Failed saves retain the selected
template. A layout draft cannot silently overwrite another editor's saved
layout when a photo update refreshes the album timestamp; discard the draft
to adopt the newer settings, then choose again.

Migration `20260919032006_album_layout_settings` is applied locally and on the
authorized Supabase project `tqdlzrtepwdssgzjpngk`. It adds only
`layout_format`, `layout_template` and their allowed-pair constraint to
`memory_albums`. No other table, policy, grant, function or stored image changes.
The protected `pre-album-composer-20260919/full-database.dump` passed an isolated
restore and rolled-back migration trial. Live before/after comparisons matched
the entire existing-content/schema/permission/bucket baseline. The restore
drill excluded owner/ACL replay; the database archive includes Storage metadata,
not media bytes. Frontend deployment has **not** occurred.

Verification: 50 Node tests, 157 local database assertions, TypeScript,
production build and changed-file lint passed. Full-project lint remains at its
recorded **one existing error and 13 warnings**. Seven composer browser scenario
groups passed, including every template at desktop/phone widths with 1, 2, 3,
8 and 25 photos; 24+1 pagination; thumbnail-only layouts; viewer focus/Escape;
touch swiping; reduced motion; save failure/retry; concurrent edits; and hiding
unpublished content from signed-in public views. Five existing photo-editor
regression groups passed for bulk upload, direct mouse/touch reordering,
description recovery, cover framing and mobile dialogs.

### Optional AI story drafts

An editor/admin can expand **Draft the story from my notes**, enter factual
notes, request a proposal, edit it, and explicitly **Apply to story**. Existing
story text requires a replace confirmation. **Save changes** is a separate
action. Generation never saves or publishes automatically. Only the supplied
notes, album title and date go to the provider; images and member records do not.

Configure `OPENAI_API_KEY` and `OPENAI_MODEL` in the server environment to enable
real generation. The model must support the OpenAI Responses API. Neither
variable may use a `NEXT_PUBLIC_` prefix or be committed. Restart the local
server after configuring it; production environment changes require the usual
approved deployment. These variables are currently absent, so the interface
reports that writing help is unavailable and manual writing remains functional.
No real provider request or paid generation was made during verification.

The API validates the bearer token with Supabase and reads the caller's current
database role. Limits: 8 KiB request, 2,000-character notes, 1,500-character
proposal, 500 output tokens, 15-second provider timeout, four requests/minute,
20/hour per user and three concurrent requests. Rate/concurrency limits are
per server instance, not a shared deployment-wide quota. The proposal warns
about unsupported figures/quotes but cannot verify all facts; editors review
the text before applying. Mocked provider tests cover successful suggestions,
errors, timeouts and refusals; actual local endpoint checks verify 401/403 and
the unconfigured 503 behavior. Real provider/model compatibility still needs a
smoke test after configuration.

Rollback restores the previous frontend and retains the new columns, settings,
tables and images. Do not drop authored content or replay older migrations.

## Implementation status — 8 September 2026

Implemented on `codex/hall-of-memories`. Migration
`20260908094023_hall_of_memories` and the follow-up
`20260908111601_hall_cover_and_photo_order` are applied and registered on the authorized
Supabase project `tqdlzrtepwdssgzjpngk`. The three live Hall tables are empty.
Before/after checks confirmed existing event/team data, table definitions,
functions, grants, policies and media bucket settings remain unchanged.

Passed: 140 local database assertions, 8 Node tests, TypeScript, production
build, 10 browser scenarios with simulated failures, and 7 real local browser
scenario groups including 25 photos and 13 members. Full lint retains the
existing one error and 13 warnings; changed files add no lint errors.

Gallery now supports mouse/touch drag ordering, independent cover selection,
and a 4:3 cover preview with drag positioning, size, keyboard position inputs
and reset. Six additional browser checks verify order persistence, description
preservation, cover framing, save failure/retry, mobile layout and Escape
cancellation. Public and admin photo order use the same sort_order/id order.
Opus independently reviewed the additive change; its bulk-delete and fallback
framing findings were addressed and covered by database/browser checks.
A fresh full archive in the protected `pre-gallery-cover-20260908` backup
folder restored successfully; the migration passed a rolled-back trial there.
Live checks confirmed existing content, schema, grants and policies unchanged.

The admin album editor now uses compact square thumbnails with direct image
dragging and a floating preview. Double-click or use the Edit button to open
photo details, descriptions and cover framing. Touch devices have an Arrange
photos mode so normal scrolling remains available. Five browser scenario groups
passed for the revised view, including save failure recovery, retained drafts,
modal focus, mobile layout and touch dragging. This refinement required no
database change.

The public Hall includes a widely spread interactive particle field on black,
mixing six shades of gold, yellow, cream and white, plus refined tabs/cards
and gentle hover/focus treatments.
Nearby particles move away from and brighten around the cursor. There is no
scroll-driven animation. A lightweight canvas draws 300 points on desktop
and 110 on narrow screens, caps pixel density, and stops animating when the
header is offscreen or the document is hidden. It cannot intercept clicks or
touch scrolling. The pause control was removed at the user's request;
reduced-motion settings automatically make the field static and disable
cursor response. Cursor response, color diversity, offscreen pause,
reduced motion, mobile layout, focused lint, TypeScript and the
production build were checked. The local preview uses clearly labelled demo albums with existing
DBAS website photos; none of that demo content was added to production.

A complete native database archive and CLI logical backups are retained in
the user-restricted folder
`C:\Users\dle45\AppData\Local\DBAS\backups\pre-hall-20260908`, outside Git.
The archive restored in isolation with matching existing content hashes;
the new migration also passed a rolled-back trial on that restored schema.
Ownership/ACL replay was excluded from the restore drill. Storage metadata is
backed up; existing image objects were retained, not copied or deleted.

The frontend has not been deployed. The verified personal deployment target is
`dbas1/dbas-web` at `https://dbas-web-tau.vercel.app`, whose production database
matches the authorized project. Deployment still needs the release approval
specified in the agreed plan. The club's separate deployment is not verified
or authorized. No repository was pushed; the upstream push guard is intact.

## Local development

Use Node 22 or newer and Docker Desktop with working Linux containers. On
Windows Home, enable/install WSL 2 before starting Docker. A Windows feature
change may require administrator approval and a restart; do not restart while
unsaved work is open. The Supabase CLI is pinned in the project lockfile.

From this repository:

```text
npm ci
npm run db:start
npm run test:db
npm test
npm run dev:local
```

`dev:local` obtains the local API URL and public key from the CLI, validates
that the URL is loopback, and overrides the website process environment. It
refuses to start when local Supabase is unavailable. It does not overwrite
`.env.local`, print keys, or silently connect the development UI to production.

Database tests use synthetic accounts and records inside a rolled-back
transaction. Do not run permission or destructive test scenarios against the
shared production database. `npm run db:stop` stops the local stack.

## Publishing content

Editors and admins can manage Gallery. Only admins can manage Past Members.
Use the existing admin login; no new accounts or roles are introduced.

- Gallery: create an album, optionally copy a published event's title and date,
  write the story, and create the draft. Select multiple photos in one batch
  or drag a batch into the upload area. Progress counts saved photos; retry an
  individual failed image or the remaining failed uploads. Arrange the numbered
  thumbnails by dragging the image itself to its new position. On a phone,
  choose Arrange photos first, then Done arranging to return to browsing.
  Ordering saves immediately; Escape cancels a drag. Double-click a photo to
  open its details, or use its Edit button on a phone or with the keyboard.
  The details window contains the optional description, accessible image text,
  keyboard ordering controls and cover settings. Choose Set as cover there,
  then drag the cover preview and adjust
  Size or the position fields. Save cover applies the selected photo and framing
  together. Reset framing restores its original position and size. Until a
  cover is selected, the first photo is used; adjusting its framing pins that
  photo as the cover. Later reordering preserves your selected cover. Removing
  the selected photo resets the cover to the first remaining photo.
  Save one description in its details window or use Save all descriptions.
  Closing details retains unsaved drafts for later editing.
  These descriptions appear directly beneath public gallery photos, including
  paragraph breaks; visitors do not have to open the full-image viewer to read
  them. Unsaved descriptions survive reordering, uploads and other photo saves.
  Partial save failures preserve unsuccessful drafts and report what succeeded.
  Publish only after all intended uploads and descriptions are saved.
- Past Members: enter a name and any optional photo, former role, years, or
  biography. Publish when ready. Missing photos display initials.
- Saving a published record changes the public version. To prepare changes out
  of public view, unpublish the record first. A fresh visit shows saved changes
  without rebuilding the website.
- Removing an album's last photo also unpublishes the album. Deleting the
  linked event preserves its independent memory album.
- A failed request keeps the form text. Retry failed uploads instead of
  selecting the same batch again. If ordering changed elsewhere, reload the
  current order before retrying the move.

Images must be PNG, JPEG, WebP, or GIF, at most 5 MiB each. Uploads create a
small static WebP thumbnail as well as the original; GIF thumbnails are static.
Grid views load thumbnails, while the viewer opens the original.

## Drafts and complete image removal

Unpublishing hides an entry from the website. It does not make image files
private: the existing media bucket is public, and known URLs remain readable.
Only upload images intended for public use. Deleting a record or removing an
image reference normally retains stored files, avoiding accidental shared-file
loss. Interrupted uploads can also leave unused files.

The DBAS admin owns complete removal requests:

1. Unpublish the affected album/member.
2. Before deleting its database record, record the exact original and thumbnail
   URLs. Resolve their paths inside the `media` bucket, under `gallery/` or
   `past-members/`. Keep this inventory outside Git/public files.
3. Check all image/thumbnail references in the Hall collections, current events
   and current-team content. Do not delete an object still used by another
   record; replace/remove that reference deliberately first.
4. Using the authorized Supabase Storage interface, delete only the verified
   object paths. Also inspect the same stable upload-ID folder for obsolete
   files from a failed or replaced upload; avoid broad prefix deletion.
5. Verify the object no longer exists in Storage and its origin URL stops
   serving it after relevant cache expiry. Remove the database record if
   required. Review access-controlled backups under the owner's retention rules.

Browser caches, downloaded files, and third-party copies cannot be recalled.
Do not report an instant global erasure merely because the listing disappeared.

## Release checklist

- Verify the actual deployment/database mapping and PostgreSQL version. The
  handover records shared production data across independently deployed sites;
  confirm the current arrangement before any live migration.
- Preserve all existing migrations, compatibility columns, and the disabled
  upstream push URL. Do not push to the club repository without the required
  owner authorization.
- Pass the local migration and permission tests, unit tests, TypeScript, build,
  and changed-file lint. Compare full-project lint with its pre-existing
  baseline rather than silently claiming a clean repository.
- Demonstrate admin publish/unpublish, a 25-photo album, 13 past members,
  pagination, lightbox keyboard/focus behavior, upload failure/retry, and
  unavailable/empty states on desktop and mobile.
- Check that a signed-in admin browsing the public Hall still sees published
  content only. Check original image bytes are not loaded by the grids.
- After production approval, take a complete authorized database backup,
  including drafts, and a Storage inventory. Retain media objects or make a
  separate protected media backup; a database dump does not contain image
  bytes. Verify the backup can be read/restored in isolation.
- Existing public JSON exports are not full backups and do not include Hall
  data. Do not export Hall/member snapshots into `public/data` or Git.
- Apply the new additive migration once to the approved database, then deploy
  the reviewed code to the approved site. Check public and admin behavior.
  If a second site needs the feature, arrange its own reviewed code deployment;
  sharing a database does not update its navigation or frontend.

The live migration history uses timestamp versions for older changes, while
this repository retains its original `0001`–`0011` filenames. Do not run an
unrestricted `db push` against that project: it may attempt to replay old
migrations. Apply only the missing Hall migrations, in order:
`20260908094023_hall_of_memories.sql`, then
`20260908111601_hall_cover_and_photo_order.sql`, then
`20260919032006_album_layout_settings.sql`. Record each exact version and
source in `supabase_migrations.schema_migrations` in the same transaction as
that migration. All three are already applied to the authorized project. Check the
history first and skip any version already applied.
Use a short lock timeout so an active website request cannot be held up by
an indefinitely waiting schema change. Do not rewrite old history entries.

## Rollback

Restore the previous frontend deployment. Retain the additive Hall tables and
stored images so rollback does not destroy authored content. Unpublish new
content if necessary. Do not drop populated tables, rename existing columns,
or remove compatibility shims as a rollback step.

## Data availability

The Hall intentionally loads live published data with distinct loading, empty,
and unavailable/retry states. It does not resurrect unpublished records from
committed snapshots. Existing event/team fallbacks and their exporter remain
unchanged.
