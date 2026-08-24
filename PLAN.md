# Plan: DBAS Admin Dashboard — Supabase-backed Events & Team Management

**One-line goal:** A DBAS committee member can sign in at `/admin`, fill in a form, press Submit, and see a new event or team member appear on the live public site within seconds — with no code edits, no JSON files, and no redeployment.

---

## Classification

**Track:** Feature — a new capability (an authenticated admin dashboard plus a database backing) added to an existing, working Next.js codebase. A tech decision (which database, which hosting) sat inside it and was resolved during the interview rather than run as a separate track.

**Parked secondary asks:**
- Third-party CMS (Sanity / Contentful / Decap) — rejected because their editing UI cannot be made to match DBAS branding, which was an explicit requirement.
- Moving hosting to Vercel with server-side API routes — a valid alternative, rejected to avoid a hosting migration. Conditions that would justify revisiting it are recorded in Key Decisions.
- Managing the home page carousel filler slides and the Instagram grid through the dashboard — out of scope for v1.

---

## Interview Ledger

| # | Question | Outcome |
|---|---|---|
| Q1 | Keep GitHub Pages + hosted backend, or move hosting to a server platform | Keep GitHub Pages, use Supabase (user) |
| Q2 | How committee members get accounts | Invite-only; self-signup disabled; ~10 app accounts (user) |
| Q3 | Auto-sort events by date, or manual buckets | Auto-sort by date + a "featured" flag (user) |
| Q4 | Two roles or one | Two roles: admin / editor (accepted recommendation) |
| Q5 | Society-owned or personal Supabase account | Personal for now; ownership transfer is an explicit final phase (user). Supabase backend administered by the AI committee, ~5 people (user) |

**Questions spent: 5**, plus one approval turn. Everything else was settled by reading the repository, checking vendor documentation, or adopting a tagged default — see the Assumptions Ledger.

**Review record:** this plan was rewritten after two independent blind critics reviewed it against the live repository and both returned FAIL. Their findings are folded in below. The most consequential were: the static-export configuration does not work the way the first draft claimed (see Current State), a privilege-escalation hole in the `profiles` table (see Row Level Security), and storage policies that were not path-scoped.

---

## Goal & Success Criteria

Done when all of these are observably true:

1. An admin signs in at `https://<site>/admin` with an email and password and reaches a dashboard styled in DBAS branding — dark `#110d0a` ground, gold `#e7c84c` accents, Playfair Display headings.
2. The dashboard has two clearly separated sections reachable from one place — **Events** and **Team** — matching the "switch between entering events or changing the people on the about page" requirement.
3. Creating an event through the form makes it appear on `/events` within 10 seconds of a page refresh, with no rebuild and no file edit.
4. Editing a team member through the form changes `/about` within 10 seconds of a page refresh.
5. An **editor** account can create and edit events, is shown no way to modify the team list, and a direct API attempt to write `team_members` or to change their own role is rejected **by the database**, not by the UI.
6. A signed-out visitor can read all published events and team members, and every write attempt is rejected by the database.
7. Both public pages render correct content when Supabase is unreachable, falling back to the JSON files committed in the repository.
8. Every scrollbar on the site — public pages and dashboard — uses the same gold-on-dark custom styling.
9. `npm run build` completes locally with no errors, and the Vercel deployment of the same commit serves `/`, `/about`, `/events`, and `/admin` without a 404.

---

## Current State

- **Next.js 16.1.6 / React 19.2.3 / Tailwind v4 / TypeScript**, plus `framer-motion`, `motion`, `lucide-react`, `react-icons` (verified: `package.json`).
- **There is no test framework.** `package.json` declares only `dev`, `build`, `start`, `lint`, and no test runner appears in dependencies (verified). Every check in this plan is therefore a command or an observation, never "write a test", unless a phase installs a runner first — none do.
- **Hosting is Vercel, not GitHub Pages — this corrects the original premise of this plan.** (user, Q7). The live site is **`deakinbas.vercel.app`**, serving HTTP 200 with the title "DBAS — Deakin Business & Analytics Society" and `/_next/image` optimization active (verified: `curl` this session) — which independently confirms a server-backed Vercel deployment, not a static export. An earlier URL, `dbas-web-phi.vercel.app`, returns `DEPLOYMENT_NOT_FOUND` and was a stale or renamed deployment, not the live site.
  - **Consequence: there IS a server.** Static-export constraints do not apply. No `output: 'export'`, no `images: { unoptimized: true }`, no `basePath`, and dynamic route segments are permitted. Server-side rendering is available, which makes [A2] cheaply reversible later.
  - `npm run build` succeeds against the repository as committed — Next.js 16.1.6 with Turbopack, 4 routes, all prerendered as static, no errors (verified: build output, this session). **The repo is deployable to Vercel with zero code changes.**
  - The Supabase architecture below is unchanged by this. Browser-direct Supabase with RLS works identically on Vercel; it is simply no longer *forced*. Keeping it means the admin dashboard needs no server code, which stays the simpler design.
- **The GitHub Pages workflow in the repository was never the live deploy path, and is misleading.**
  - The deploy workflow uses `actions/configure-pages@v5` with `static_site_generator: next` and uploads `./out` (verified: `.github/workflows/nextjs.yml`).
  - That action injects `output: 'export'`, `basePath`, and `images.unoptimized: true` — but its config detection looks only for `next.config` with extensions **`.js`, `.mjs`, `.cjs`** (verified: [`src/set-pages-config.js`](https://raw.githubusercontent.com/actions/configure-pages/main/src/set-pages-config.js)).
  - This repository has **`next.config.ts`**, which contains no configuration at all (verified). The action therefore writes a *separate* `next.config.js` in CI, which Next.js prefers over the `.ts` file — so the deployed build is configured by a generated file nobody in the project can see, and the committed `next.config.ts` is dead. This mismatch is a known, reported problem with the action ([actions/configure-pages#107](https://github.com/actions/configure-pages/issues/107)).
  - **Consequence:** `npm run build` on a developer's machine produces an ordinary server build with **no `out/` directory** — it does not reproduce what gets deployed. A blind critic confirmed this by running the build against the repository as committed.
  - **Consequence:** `images.unoptimized` is set only in CI, so nobody can catch an image-optimization mistake locally.
  - Because hosting is Vercel, none of this affects production today. The workflow is dormant clutter that misrepresents how the site is built. Phase 1 decides whether to delete it; nothing depends on it either way.
- Content lives in two files under `public/data/` (verified):
  - `events.json` — an object with `current` (one event), `upcoming[]` (1 entry), `past[]` (3 entries). The "Connect & Catch Up" event is duplicated verbatim between `current` and `upcoming`, so the file describes 4 distinct events in 5 records. Dates and times are free-text strings (`"21 July 2026"`, `"6:00 PM"`). **None of the 3 past events has a `description` field.**
  - `team.json` — 9 members with `id`, `name`, `role`, `image`, `bio`, `tags[]`.
- The two pages load data by **two different mechanisms** (verified):
  - `app/about/page.tsx:40` — a server component reading from disk with `fs.readFileSync` at **build time**.
  - `app/events/page.tsx:86` — a client component calling `fetch("/data/events.json")` at **runtime**.
- Images are static files under `public/`. Adding one currently requires a commit and a rebuild (verified: `public/` listing).
- **`next/image` is used on the About page** for the hero logo, the story image, and all 9 team photos (verified: `app/about/page.tsx`, `components/team-section/team-section.tsx`). **On Vercel this works as intended and images are optimized** — no configuration needed. Recorded because it would have broken on GitHub Pages without `images: { unoptimized: true }`: a blind critic reproduced that by building with `output: 'export'` and finding `srcSet="/_next/image?url=%2Fwho-we-are.png&w=384…"` in `out/about.html`. That is now a reason not to move to Pages, rather than a task.
- Brand tokens (verified):
  - `app/globals.css` — body background `#1a1512`; `.heading_on_black` / `.heading_on_white` using `"Playfair Display", serif` at `clamp(24px, 8vw, 52px)` weight 500; `.heading_accent` in `#e7c84c` with a `#bf8b48` text-shadow.
  - `app/about/global.css:2-5` — `--about-gold: #e7c84c`, `--about-gold-deep: #c99537`, `--about-ink: #110d0a`, `--about-cream: #f4efe7`. Scoped to `.about-page`, not global. Note that the gradient at `app/about/global.css:87` uses **different literal values** (`#efcc55`, `#d69a39`) than those tokens — do not assume they match.
- **No custom scrollbar styling exists** — `grep -rni "scrollbar" app components` returns **zero** matches (verified).
- **Three latent defects found during recon** (verified):
  1. `app/layout.tsx` imports `Geist` and `Geist_Mono` from `next/font/google` and applies neither, and **Playfair Display is never loaded at all** — so every `.heading_on_*` has been falling back to the browser's default serif. In scope, because brand consistency was an explicit requirement.
  2. `app/globals.css` body references `var(--background)` and `var(--foreground)`, defined nowhere in the project (verified: grep across all CSS). The `background-color: #1a1512` on the next line masks it.
  3. `components/team-section/team-section.tsx:6` imports `FaLinkedinIn` but **never renders it** — zero JSX usages (verified). There is no LinkedIn field in the data or the type today.
- `app/events/page.tsx:103` calls `toSlide(data.current)` unconditionally (verified), so the page **crashes** if no current event exists. Today `events.json` always supplies one; a database makes "no featured event" a realistic state.
- `.gitignore:34` contains `.env*` (verified) — local environment files are already excluded.
- The local folder is a **ZIP download, not a git clone** (no `.git` directory), and **GitHub CLI is not installed**; git 2.53.0 is (verified).
- Documented conventions (verified: `README.md`): component styles in `*.module.css` referenced as `styles.x`; site-wide styles in `app/globals.css` referenced as plain strings; `MaxWidth` wraps content inside a full-width `<section>`.

---

## Scope (v1)

A `/admin` area inside the existing Next.js app, with:

- Email + password sign-in and sign-out.
- An **Events** section: list, create, edit, delete, feature one, publish/unpublish.
- A **Team** section: list, create, edit, delete, reorder, publish/unpublish. Admin-only.
- Image upload for both, into Supabase Storage.
- A Supabase Postgres database holding both content types, with role-based write rules enforced in the database.
- The two public pages rewired to read Supabase, with a JSON fallback.
- Site-wide custom scrollbar styling, and Playfair Display actually loaded.
- An explicit, self-consistent static-export configuration.
- A weekly automated job that keeps the Supabase project from idling out and refreshes the fallback JSON.
- A written handover document.

---

## Out of Scope & Parked Items

- **Public/member-facing accounts.** No customer logins (user).
- **Home page content, the events-page filler slides (`GENERIC_SLIDES`, `app/events/page.tsx:43`), and the Instagram grid.** They stay hardcoded — not named in the ask, and each has a different shape that would triple the form work.
- **A rich-text editor.** Plain textarea in v1: rich text means storing and sanitising HTML, a security surface for no current benefit — existing bios are plain prose (verified).
- **Audit log / edit history.** `updated_at` is stored, which makes adding one later straightforward.
- **Image cropping or resizing in the browser.**
- **Moving hosting to Vercel.** Revisit only if database credentials must be kept off the browser entirely, or server-rendered pages become an SEO requirement.
- **Cloning the repository and pushing to GitHub.** Requires credentials the executor must not handle — see Open Items.

---

## Approach

Four ideas carry the design.

**1. The browser talks to the database directly, and the database polices itself.**
There is no server (verified above), so there is nowhere to run trusted code. Supabase is built for this: the site ships a *public* key, and every table carries Row Level Security policies deciding per request what the caller may do based on their role. **The security boundary is the database, not the UI.** Every "editors cannot touch the team list" rule is a SQL policy; hiding the tab is convenience only.

**2. One events table, sorted by a real timestamp.**
The current three-bucket JSON already contains a duplicated event (verified). The database stores one `events` table with `starts_at timestamptz`; upcoming and past become queries, and the carousel headline becomes `is_featured`. An event moves itself into Past when its date passes.

**3. The JSON files stay, demoted to a safety net.**
Both files remain in the repository. Public pages try Supabase and fall back to them on failure. A weekly GitHub Actions job regenerates them from the live database — which keeps the Supabase project active, keeps the repository active, and keeps the fallback fresh.

**4. Hosting is Vercel, and the repository should say so.**
No static-export configuration is added — it would be wrong. `next.config.ts` stays minimal. The dormant GitHub Pages workflow is removed or documented as unused so the next person is not misled the way this plan's first draft was.

**Admin routes are static paths by choice, not by constraint.** `/admin`, `/admin/events`, `/admin/team`, with record selection held in client state or a query string. On Vercel a dynamic `[id]` segment would work; it is simply unnecessary here and adds routing for no gain. If a later requirement wants shareable per-record URLs, the constraint that once forbade it is gone.

*Genuine executor's choice:* component file naming, form field order within a section, whether shared inputs live in one file or several, and validation message wording.

---

## Requirements

| ID | Requirement | Acceptance check |
|---|---|---|
| R1 | WHEN an unauthenticated visitor opens `/admin`, THE SYSTEM SHALL show a sign-in form and no content data. | Open `/admin` in a private window. |
| R2 | WHEN valid credentials for an existing account are submitted, THE SYSTEM SHALL sign the user in; invalid credentials SHALL show an inline error and leave them signed out. | Try both. |
| R3 | THE SYSTEM SHALL NOT allow anyone to create their own account. | `supabase.auth.signUp()` from the browser console is rejected. |
| R4 | WHEN a signed-in `admin` or `editor` submits the event form, THE SYSTEM SHALL insert the event and it SHALL appear on `/events` on next load. | Create an event; reload `/events`. |
| R5 | WHEN a signed-in `editor` attempts any write to `team_members`, THE SYSTEM SHALL reject it at the database. | Insert against `team_members` from an editor session; expect a policy violation. |
| R6 | THE SYSTEM SHALL classify an event as upcoming or past solely by comparing `starts_at` to the current time. | Set an event to yesterday; it appears under Past unaided. |
| R7 | THE SYSTEM SHALL allow at most one featured event at a time, enforced in the database. | Feature a second event; the first un-features. Verify via direct API call, not just the UI. |
| R8 | WHEN an image is uploaded, THE SYSTEM SHALL store it in Supabase Storage and save its public URL; existing `/public` image paths SHALL continue to render. | Upload a new image; confirm a legacy record (`events/party.png`) still renders. |
| R9 | WHEN Supabase is unreachable, THE SYSTEM SHALL render `/events` and `/about` from the committed JSON rather than erroring or showing an empty page. | Block the Supabase domain in devtools; reload both. |
| R10 | THE SYSTEM SHALL apply gold-on-dark scrollbar styling site-wide. | Confirm on `/`, `/events`, `/about`, `/admin` in Chrome and Firefox. |
| R11 | THE SYSTEM SHALL load Playfair Display so heading classes render in it. | Devtools computed `font-family` resolves to Playfair Display. |
| R12 | THE SYSTEM SHALL run a job at least weekly that reads Supabase and commits refreshed JSON. | Trigger manually; confirm a green run and a commit. |
| R13 | WHEN a required field is missing or a date malformed, THE SYSTEM SHALL block submission and name the field. | Submit an empty form. |
| R14 | THE SYSTEM SHALL confirm before deleting any event or team member. | Click delete. |
| R15 | THE SYSTEM SHALL NOT allow a non-admin to change any account's role, including their own. | From an editor session: `update profiles set role='admin' where id=auth.uid()` — expect rejection. |
| R16 | The Vercel deployment SHALL serve `/`, `/about`, `/events`, and `/admin` without a 404, from an account the AI committee controls. | Open all four on the deployed URL. |

---

## Key Decisions

| Decision | Choice | Basis |
|---|---|---|
| Database & backend | Supabase (hosted Postgres, Auth, Storage) | (user) |
| Hosting | **Vercel**, redeployed under a committee-controlled account | (user, Q7). Supersedes the Q1 assumption of GitHub Pages, which the repository implied but which was never the live path (verified: the site served from `dbas-web-phi.vercel.app`). |
| Not Oracle, not self-hosted SQL Server | Rejected | Licensing and operational weight far beyond a 9-member society (verified: `team.json`); and neither is reachable from a static site without a server you would also have to run and secure. |
| Static export configuration | **None** — deliberately not added | It would be wrong on Vercel. `next.config.ts` stays minimal and `npm run build` already succeeds as committed (verified this session). |
| Account creation | Invite-only; "Allow new users to sign up" disabled | (user, Q2) + (verified: [Supabase General configuration](https://supabase.com/docs/guides/auth/general-configuration)) |
| Sign-in method | Email + password | (user, Q2) |
| Roles | `admin` and `editor` | (user, Q4) |
| Role storage | A `profiles` table keyed to `auth.users` | [assumed: default — if wrong: roles move to JWT custom claims via an auth hook, a Phase 2-only change] |
| Event model | One table, `starts_at timestamptz`, `is_featured` boolean | (user, Q3) |
| Publishing latency | Immediate — public pages read Supabase in the browser | [A2] |
| Fallback | Committed JSON, refreshed weekly by CI | Follows from the free-tier pausing risk (verified below) |
| Supabase project ownership | Personal initially; transfer is Phase 8 | (user, Q5) |
| Supabase administrators | AI committee, ~5 people | (user, Q5) |
| Repository write access | AI committee only; everyone else edits content through `/admin`, never through code | Separating content editing from repository access is the point of the project — this answers the user's question about permissions on "the coding thing". |
| Admin location | `/admin` in the same app, absent from the public nav, static routes only | [A3] + the static-export constraint above |
| Timezone | Stored `timestamptz`, displayed `Australia/Melbourne` | Every event location is a Deakin campus in Victoria (verified: `events.json`). |

---

## Data & State Changes

### Table: `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | references `auth.users(id) on delete cascade` |
| `email` | `text` | display only |
| `full_name` | `text` | |
| `role` | `text not null default 'editor'` | `check (role in ('admin','editor'))` |
| `created_at` | `timestamptz not null default now()` | |

A trigger on `auth.users` insert creates the matching row with role `editor`, so an admin only promotes the few who need more. `[assumed: an admin-created or invited user still fires the auth.users insert trigger while self-signup is disabled — the toggle gates the public signUp endpoint, not admin creation — if wrong: Phase 2 falls back to inserting the profiles row by hand from the dashboard, which for ~10 accounts is trivial. Checked in Phase 2 Step 6 by creating a user and confirming the row appears.]`

### Table: `events`

| Column | Type | Maps from JSON |
|---|---|---|
| `id` | `uuid` PK `default gen_random_uuid()` | replaces the integer `id` |
| `slug` | `text unique not null` | derived from title + date — gives the import script a stable idempotency key |
| `title` | `text not null` | `title` |
| `tag` | `text not null default 'Social'` | `tag` |
| `description` | `text` | `description` — nullable; none of the 3 past events has one (verified) |
| `starts_at` | `timestamptz not null` | `date` + `time` combined |
| `location` | `text` | `location` |
| `image_url` | `text` | `image` |
| `cta` | `text` | `cta` |
| `link` | `text` | `link` |
| `is_featured` | `boolean not null default false` | the `current` event becomes `true` |
| `is_published` | `boolean not null default true` | new |
| `created_at`, `updated_at` | `timestamptz not null default now()` | new |

### Table: `team_members`

| Column | Type | Maps from JSON |
|---|---|---|
| `id` | `uuid` PK `default gen_random_uuid()` | |
| `slug` | `text unique not null` | the existing string `id` (`livroop-gill`) |
| `name` | `text not null` | `name` |
| `role` | `text not null` | `role` — **the person's job title**, not a permission |
| `image_url` | `text` | `image` |
| `bio` | `text` | `bio` |
| `tags` | `text[] not null default '{}'` | `tags` |
| `linkedin_url` | `text` | new — see the note below |
| `sort_order` | `int not null default 0` | new — preserves the current hand-ordered sequence |
| `is_published` | `boolean not null default true` | new |
| `created_at`, `updated_at` | `timestamptz not null default now()` | |

> **Naming collision, deliberate:** `profiles.role` is a *permission level*; `team_members.role` is a *job title*. Never conflate them in policy code.

> **On `linkedin_url`:** `FaLinkedinIn` is imported but never rendered (verified: `team-section.tsx:6`, zero JSX usages). Storing the column without rendering it would produce data with no route to the page, so Phase 5 **extends** the `TeamMember` type with an optional `linkedin?: string` and renders the already-imported icon when present. This is an additive change to a type other code reads — existing records without a LinkedIn URL keep working unchanged.

### Row Level Security

RLS is enabled on all three tables. Policies on `events` and `team_members` must read the caller's role, so a `security definer` helper avoids recursive policy evaluation:

```sql
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;
```

**Privilege escalation guard (R15).** Without this, an editor can simply promote themselves and every other policy collapses. A blind critic found exactly this hole in the first draft. The fix is a trigger, not a policy, because column-level grants cannot express "unless the caller is an admin":

```sql
create or replace function public.prevent_role_self_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and coalesce(public.current_user_role(), '') <> 'admin' then
    raise exception 'only an admin may change a role';
  end if;
  return new;
end $$;

create trigger profiles_guard_role
before update on public.profiles
for each row execute function public.prevent_role_self_escalation();
```

**At most one featured event (R7).** The `when` clause prevents the inner update from recursing:

```sql
create or replace function public.enforce_single_featured()
returns trigger language plpgsql as $$
begin
  update public.events set is_featured = false
  where is_featured and id <> new.id;
  return null;
end $$;

create trigger events_single_featured
after insert or update of is_featured on public.events
for each row when (new.is_featured) execute function public.enforce_single_featured();
```

**Policies:**

- `events` — SELECT: everyone, where `is_published`; all rows for any authenticated user with a profile. INSERT / UPDATE / DELETE: `current_user_role() in ('admin','editor')`.
- `team_members` — SELECT: same public rule. INSERT / UPDATE / DELETE: `current_user_role() = 'admin'`.
- `profiles` — SELECT: own row, plus all rows for an admin. UPDATE: own row (role changes blocked by the trigger above) or any row for an admin. **No INSERT or DELETE policy at all**, so the client cannot create or destroy profiles; the auth trigger does that.

### Storage

One bucket, `media`, public read. Write policies are **path-scoped so they mirror the table rules** — a blanket "any authenticated user" policy would let an editor overwrite or delete team photos even though the `team_members` table is admin-only. This was a blind-critic finding:

```sql
create policy "public read media" on storage.objects
  for select using (bucket_id = 'media');

create policy "event media writable by staff" on storage.objects
  for all to authenticated
  using  (bucket_id = 'media' and (storage.foldername(name))[1] = 'events'
          and public.current_user_role() in ('admin','editor'))
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'events'
          and public.current_user_role() in ('admin','editor'));

create policy "team media writable by admin only" on storage.objects
  for all to authenticated
  using  (bucket_id = 'media' and (storage.foldername(name))[1] = 'team'
          and public.current_user_role() = 'admin')
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'team'
          and public.current_user_role() = 'admin');
```

Paths: `events/<uuid>.<ext>`, `team/<slug>.<ext>`. 5 MB per file, image MIME types only, enforced in both the bucket configuration and the UI.

### Migration and rollback

- **Migration:** `scripts/import-json.mjs` (authored in Phase 7, Step 1) reads the two JSON files and upserts them using the Supabase **service role** key from an environment variable. Idempotent on `slug` for both tables — which is why `events` carries a `slug`. The `current` event imports once with `is_featured = true`; its duplicate inside `upcoming` is skipped. That de-duplication is the point.
- **Rollback:** the original JSON files are never deleted and the fallback path stays. Reverting means reverting the commits; the site returns to reading JSON with no database involvement. **No destructive operation is performed on any existing file or data anywhere in this plan.**

---

## Interfaces, Integrations & Credentials

- **`@supabase/supabase-js`** — `[assumed: current major is v2, importing { createClient } from '@supabase/supabase-js' — if wrong: every query call changes shape. Verified in Phase 1 Step 4 by reading the installed package's own type definitions before any query is written.]`
- **Public environment variables** (safe in the client bundle by design):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

  Locally in `.env.local` (already ignored — verified: `.gitignore:34`). In CI they must be added as `env:` entries on the **Build with Next.js** step of `.github/workflows/nextjs.yml`, sourced from GitHub repository variables. The existing workflow passes no environment to that step (verified), so **without this the deployed build ships an undefined URL and every page silently falls back to JSON forever.**
- **`SUPABASE_SERVICE_ROLE_KEY`** — obtained in Phase 0 Step 5, used only by `scripts/import-json.mjs` and the weekly export job. Never referenced under `app/` or `components/`. Never committed. In CI it is a GitHub Actions **secret**, not a variable.
- **Contracts that must be extended, never reshaped:** the `TeamMember` type at `components/team-section/team-section.tsx:9-16` and the `Slide` type consumed by `components/carousel/carousel.tsx` (verified). Public-page rewiring maps database rows *into* these shapes. Phase 5 adds one optional field to `TeamMember`; nothing else about either type moves.
- **`basePath`** — not applicable. Vercel serves from a domain root, so existing absolute `/public` asset paths resolve unchanged (user, Q7). This was a Phase 1 gate while GitHub Pages was assumed; it is now closed.

---

## Edge Cases & Failure Handling

| Case | Behavior |
|---|---|
| Supabase unreachable, public page | Fall back to committed JSON; console warning. Never an empty page. |
| Supabase unreachable, dashboard | Explicit error banner naming the failure. Never pretend a save succeeded. |
| Session expires mid-edit | Form contents preserved; re-authentication prompt; resubmit resumes. |
| Editor types `/admin/team` directly | Redirected with an explanation. The database rejects writes regardless. |
| No events in the database | `/events` shows a styled empty state, not a blank region. |
| No featured event | Carousel shows only the two `GENERIC_SLIDES`. **`app/events/page.tsx:103` currently assumes a current event always exists and will crash without one** (verified) — Phase 7 makes it conditional. |
| Two events marked featured | Impossible — the database trigger above un-features the others, including on direct API calls. |
| Editor tries to promote themselves | Rejected by `profiles_guard_role` (R15). |
| Editor tries to overwrite a team photo in Storage | Rejected by the path-scoped storage policy. |
| Image upload fails or is oversized | Record not saved; error names the limit. No orphaned half-saved row. |
| Deleting a team member | Allowed after confirmation. The stored image is left in Storage — cheap, and prevents accidental loss. |
| Malformed date | Blocked by the date-time input and by `timestamptz`. |
| Legacy image path alongside Storage URLs | A render helper treats values starting with `http` as absolute and anything else as a `/public` path. Both work indefinitely. |

---

## Risks, Landmines & Adaptations

| Constraint | How the plan adapts |
|---|---|
| **The repository misrepresented its own deployment** — it contains a full GitHub Pages workflow, but the site was served from Vercel (verified: `dbas-web-phi.vercel.app`, and `npm run build` produces no `out/`). This misled the first draft of this plan into designing around constraints that did not apply. | Corrected throughout. Phase 1 removes or annotates the dormant workflow so the next reader is not misled the same way. **General lesson recorded deliberately: config files in a repo are evidence of intent, not proof of what is running.** |
| **The live site at `deakinbas.vercel.app` is the club's production site and must not be disturbed** (user). Development happens in a personal **fork**, never in the club's repository. | No push to the club repo, no pull request, and no change to the club's Vercel project without explicit approval. The fork gets its own separate Vercel project for previews — it is never attached to the existing one. `HANDOVER.md` still lists Vercel, Supabase, and GitHub as accounts requiring succession, since the Q5 ownership risk stands regardless. |
| **Browser-direct Supabase means no database password lives in the site.** On Vercel this is now a choice rather than a necessity. | Kept deliberately: it means the admin dashboard needs no server code, and security stays enforced by RLS in one place. If server-side data access is ever wanted, Vercel now permits it without re-architecting. |
| **An editor could promote themselves to admin** — found by a blind critic in the first draft, which specified the intent but no mechanism. | `profiles_guard_role` trigger, R15, and an adversarial check in Verification. |
| **A blanket storage policy would let an editor delete team photos** — also a critic finding. | Path-scoped storage policies mirroring the table rules. |
| **Supabase pauses free projects after 1 week of inactivity; paused projects are restorable for 90 days** (verified: [Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [changelog](https://supabase.com/changelog/27497-paused-free-plan-projects-are-restorable-for-90-days)). | Phase 8's weekly workflow reads the database, which counts as activity. |
| **GitHub disables scheduled workflows in a public repository after 60 days of no repository activity** (verified: [GitHub Docs](https://docs.github.com/actions/managing-workflow-runs/disabling-and-enabling-a-workflow)). | The weekly workflow also **commits** the refreshed JSON. `[assumed: a commit pushed by github-actions[bot] counts as "repository activity" for the 60-day rule — GitHub's documentation states the rule but never defines "activity", and a critic could not find an authoritative answer either. If wrong: the schedule lapses after 60 idle days and the database pauses a week later — which the JSON fallback (R9) already covers, so the site stays correct and only goes stale. Hedge: HANDOVER.md instructs the committee to re-enable the workflow from the Actions tab if it shows as disabled, and to check this at each handover.]` |
| **Committee turns over annually; the project starts under a personal account** (user, Q5). | Phase 8 produces a handover document listing every account, who holds it, and the exact transfer steps — written as a task with a named trigger, not an intention. |
| **The public key is in the site's JavaScript and `/admin` is a public URL.** | Accepted and deliberate — this is how the architecture works. Mitigations: self-signup disabled (R3), every write gated by RLS, and Phase 2's done-check is an *adversarial* test proving anonymous and under-privileged callers are rejected by the database. |
| **Residual: RLS is the entire security boundary.** A wrong policy is a silent, total failure. | Phase 2 is marked important and runs the blind-critic loop; its done-check requires the full adversarial suite to pass before any UI is built on it. |

---

## Assumptions Ledger

| ID | Assumption | Basis | Blast radius if wrong | Check |
|---|---|---|---|---|
| A1 | `@supabase/supabase-js` v2 API shape | Not verified this session | Every query call rewritten | Phase 1 Step 4 — read installed types |
| A2 | No SEO requirement for event or member names in search results | Not raised; events page already loads client-side (verified) | Public pages need build-time pre-rendering and a publish-triggered rebuild | Stated at Q3; user did not object. Reversible |
| A3 | `/admin` in the same app, publicly reachable, is acceptable | Simplest option; protection is RLS regardless | Discoverability only, not security | Phase 3 |
| A4 | ~~Supabase free tier covers this workload~~ — **confirmed, closed 24 August 2026** against supabase.com/pricing: 500 MB database, 1 GB file storage, 50,000 monthly active users, 5 GB egress. This site holds 4 events and 9 members and has perhaps a dozen committee logins; every limit is orders of magnitude clear. Two constraints do bite, and neither is about size: **projects pause after 1 week of inactivity** (the reason `keepalive.yml` exists), and **no automatic backups or point-in-time recovery on Free** (the reason git history is the restore point). One more worth knowing before anyone adds a second project: the free plan allows **2 active projects per account**. | Society-scale traffic; 4 distinct events, 9 members (verified) | A paid tier | Closed |
| A5 | Committee uses modern Chrome, Edge, Firefox, or Safari | Standard for a university society | Scrollbar degrades to default; nothing functional | Phase 3 |
| A6 | Plain textarea suffices for bios and descriptions | Existing content is plain prose (verified) | Rich text becomes a later feature | Phase 4 |
| A7 | ~~`basePath`~~ — **retired.** Vercel serves from a domain root, so no `basePath` applies | (user, Q7) | none | Closed |
| A8 | An admin-created user fires the `auth.users` insert trigger with self-signup disabled | The toggle gates the public endpoint, not admin creation | Profiles rows created by hand — trivial at 10 accounts | Phase 2 Step 6 |
| A9 | The repository is public | Deployed via Pages using the stock public-repo template | If private, the 60-day expiry does not apply and the keep-alive is simply more robust than needed | Phase 8 Step 1 |
| A10 | A bot commit counts as repository activity for the 60-day rule | Undefined in GitHub's docs; not settled | Schedule lapses; JSON fallback covers it | Phase 8 + HANDOVER.md instruction |

---

## Open Items (none blocking)

- **Where the work happens.** Develop in the existing folder (`D:\dbas-web-main\dbas-web-main`) for Phases 1–7. Cloning the real repository and copying the work into it is a **user-performed step before Phase 8**, because the executor must not handle credentials. Phases 1–7 need no git at all.
- **Society-owned email for ownership transfer.** Proceed with a personal account (user, Q5); Phase 8 documents the transfer.
- **Who gets `admin` versus `editor`.** Proceed with: everyone `editor` by default; the AI Officer and President promoted to `admin`. One dashboard click to change.

---

## Verification

```bash
npm install
npm run lint
npm run build                  # must complete with no errors
npm run dev                     # then work through the checks below
```

**Adversarial security suite — the checks that matter most.** From the browser console, **signed out**:

```js
await supabase.from('events').insert({ title: 'unauthorised', starts_at: new Date() })   // expect: policy violation
await supabase.from('team_members').delete().eq('slug', 'livroop-gill')                  // expect: policy violation
await supabase.auth.signUp({ email: 'test@example.com', password: 'test1234' })          // expect: signups disabled
```

Then signed in **as an editor** — all three must still fail:

```js
await supabase.from('team_members').insert({ slug: 'x', name: 'x', role: 'x' })          // expect: policy violation
await supabase.from('profiles').update({ role: 'admin' }).eq('id', (await supabase.auth.getUser()).data.user.id)  // expect: rejected — R15
await supabase.storage.from('media').remove(['team/livroop-gill.png'])                   // expect: policy violation
```

**How you personally confirm it is done:**
1. Sign in at `/admin`, add an event dated next month with an uploaded image, press Submit.
2. Open `/events` in a different browser — the event is under Upcoming, with its image.
3. Change its date to last month; reload `/events` — it has moved to Past on its own.
4. Sign in as an editor — the Team section is not offered.
5. Open devtools, block `supabase.co`, reload `/events` — content still renders.
6. Scroll any page — the scrollbar is gold on dark.

---

## Build Phases

Nine phases, numbered 0–8. Phase 0 is performed by the user, not the executor. **Phases 2 and 7 are marked important**: for each, run the builder-plus-blind-critic loop against that phase's acceptance criteria, looping to consensus, three rounds maximum, using sub-agents to parallelise where the work allows.

- [x] **Phase 0: User-performed setup** *(the executor cannot do this — it needs account access)*
      Done when: a Supabase project exists, `.env.local` holds the URL and anon key, and the service role key is available to the shell as an environment variable.
      Steps:
      - Create a Supabase project (personal account for now, per Q5). **Region: `ap-southeast-2` (Oceania / Sydney)** — not Singapore, even if the UI recommends it. The browser queries Supabase directly on every public page load, so region distance is user-visible latency; the audience is in Melbourne; and the region cannot be changed later without migrating into a new project (verified: [Migrating within Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase)). Keeping member names, photos, and bios onshore in Australia is also the simpler position for a university society.
      - Supabase → Authentication → Settings → turn **"Allow new users to sign up"** OFF.
      - Copy the project URL and **anon** key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
      - Note the live site's public URL — Phase 1 needs it.
      - Copy the **service role** key from Supabase → Settings → API and export it as `SUPABASE_SERVICE_ROLE_KEY` in the shell only. Do not put it in `.env.local`; do not commit it anywhere.

- [x] **Phase 1: Restore hosting, and verify every load-bearing assumption**
      Done when: the site is live on Vercel under a committee-controlled account and serves `/`, `/about`, `/events` without a 404; the Supabase client is installed and its API shape confirmed by reading the installed types.
      Steps:
      - [x] `npm install @supabase/supabase-js` — installed **2.112.3**; `createClient` confirmed exported from `dist/index.d.mts` (verified this session). **[A1] closed.**
      - [x] Create `lib/supabase.ts` exporting one configured client, returning `null` rather than a broken instance when the environment is absent so public pages can fall back (R9). Connection to the live project already proven by direct REST call — `/rest/v1/events` returned 404 (routed and authenticated, table absent) rather than 401, and `/auth/v1/settings` confirmed `"disable_signup":true` (verified this session). No scratch table needed.
      - [x] `npm run build` succeeds as committed — 4 routes, all prerendered, no errors (verified this session). No configuration change required for Vercel.
      - [x] **User step:** authenticate GitHub CLI (`gh auth login`), then fork the club's repository. Done — `gh` is authenticated as `minhducxD`, and the fork is `minhducxD/dbas-web`, private. `upstream`'s push URL is deliberately set to an invalid value so the club's repo cannot be written to by accident. The club's repo and `deakinbas.vercel.app` are not touched.
      - [ ] Optional: create a **new** Vercel project pointed at the fork. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in that project's Environment Variables. Do not attach the fork to the club's existing Vercel project. **The URL is needed at build time, not just at runtime** — `next.config.ts` derives the allowed `next/image` remote host from it, so a build without it rejects every Storage photo on `/about` as well as serving fallback content.
      - [ ] Read Supabase's current pricing and limits page; confirm or correct [A4].
      - [x] Decide the fate of `.github/workflows/nextjs.yml`: **kept, commented, and disabled under the Actions tab.** The comment alone was not enough — once the work reached `main` the workflow fired on the push and had to be cancelled, because its `on: push: branches: [main]` trigger does not care what the comment says. Disabling it is a repository setting rather than a file change, so the fork stays otherwise identical to its upstream while the question of a PR to the club is still open.
      Covers: R16; checks: A1, A4

- [x] **Phase 2: Schema, roles, and Row Level Security** — ***important: run the critic loop***
      Done when: every check in the adversarial suite is rejected, an admin session can write both tables, and each rejection is shown as actual console output rather than asserted.
      Steps:
      - Create `profiles`, `events`, `team_members` exactly as specified, including `events.slug`.
      - Add `current_user_role()`, `prevent_role_self_escalation()` with its trigger, and `enforce_single_featured()` with its trigger — the SQL is given in full above; do not improvise substitutes.
      - Add the `auth.users` insert trigger creating a `profiles` row defaulting to `editor`.
      - Enable RLS on all three tables and create every policy listed, including the deliberate absence of INSERT and DELETE policies on `profiles`.
      - Create the `media` bucket with the three path-scoped storage policies.
      - Create two accounts from the dashboard and confirm each got a `profiles` row [A8]; promote one to `admin`. Run the full adversarial suite from the anonymous, editor, and admin positions.
      Covers: R3, R5, R6, R7, R15; checks: A1, A8

- [x] **Phase 3: Admin shell — sign-in, branding, scrollbar**
      Done when: `/admin` shows a sign-in form; valid credentials reach a dashboard with Events and Team tabs (empty is fine); an editor sees no Team tab; a heading's computed `font-family` is Playfair Display; scrollbars are gold on dark in Chrome and Firefox.
      Steps:
      - Promote the brand variables from `app/about/global.css:2-5` to `:root` in `app/globals.css` as `--dbas-gold` `#e7c84c`, `--dbas-gold-deep` `#c99537`, `--dbas-ink` `#110d0a`, `--dbas-cream` `#f4efe7`, leaving the existing `.about-page` declarations untouched so nothing currently rendering changes. Also define the missing `--background` and `--foreground` that `globals.css` already references.
      - Load Playfair Display via `next/font/google` in `app/layout.tsx` and apply it to the heading classes (R11).
      - Add site-wide scrollbar styling to `app/globals.css` (R10): `scrollbar-width: thin` and `scrollbar-color` for Firefox, plus `::-webkit-scrollbar`, `-track`, `-thumb`, `-thumb:hover`. Build the thumb gradient from `--dbas-gold` → `--dbas-gold-deep`. **Do not copy the gradient at `app/about/global.css:87`** — it uses different literals (`#efcc55`, `#d69a39`) and would give a subtly different gold.
      - Build `app/admin/layout.tsx` and `app/admin/page.tsx` as client components: session check, sign-in form, sign-out, section switcher. Static routes only — no bracketed folders. Style with the tokens above and the `MaxWidth` convention from `README.md`.
      - Gate the Team tab on the caller's role (UI convenience; the database is the real gate).
      Covers: R1, R2, R10, R11; checks: A3, A5

- [x] **Phase 4: Events section — create, edit, delete**
      Done when: an event created in the form appears in the dashboard list immediately; editing changes it; deleting asks first; an empty submission names the missing field; an event dated yesterday appears under Past without further action.
      Steps:
      - List view: all events by `starts_at` descending, grouped upcoming and past, featured marked.
      - Form: title, tag, description, one date-time picker writing `starts_at`, location, CTA label, link, featured checkbox, published toggle. Generate `slug` from title and date.
      - Client-side validation (R13) and delete confirmation (R14).
      - Verify R6 by hand — set an event to a past date and observe the grouping. There is no test framework in this project (verified), so this is an observation, not an automated test.
      Covers: R4, R6, R7, R13, R14; checks: A6

- [x] **Phase 5: Team section — create, edit, delete, reorder**
      Done when: the same operations work for team members, `sort_order` controls display order, an editor account cannot reach the section, and a member with a LinkedIn URL renders the icon on `/about`.
      Steps:
      - List view ordered by `sort_order`, with move-up and move-down controls.
      - Form: name, job title, slug, bio, tags (multi-entry), LinkedIn URL, published toggle.
      - Extend the `TeamMember` type at `components/team-section/team-section.tsx:9-16` with an optional `linkedin?: string` and render the already-imported `FaLinkedinIn` when it is present. This is additive — members without one are unaffected.
      Covers: R5, R13, R14

- [x] **Phase 6: Image upload**
      Done when: an image chosen in either form uploads to Storage, its URL is saved, and it renders publicly; an oversized file is refused with a message naming the 5 MB limit; a legacy record still renders.
      Steps:
      - Upload helper writing to `media` at `events/<uuid>.<ext>` and `team/<slug>.<ext>`; enforce 5 MB and image MIME types in the UI as well as the bucket.
      - Render helper treating values starting with `http` as absolute Storage URLs and anything else as a `/public` path, so `events/party.png` keeps working (R8).
      Covers: R8

- [x] **Phase 7: Import the data and rewire the public pages** — ***important: run the critic loop***
      Done when: `/events` and `/about` render live database content; blocking `supabase.co` in devtools makes both fall back to JSON with no visible error; an empty database shows a styled empty state; no featured event does not crash the carousel; `npm run build` still produces `out/`.
      Steps:
      - **Write `scripts/import-json.mjs`** per the Migration spec — reads both JSON files, upserts on `slug`, uses `SUPABASE_SERVICE_ROLE_KEY` from the environment, skips the `upcoming` duplicate of the `current` event. Then run it.
      - Rewrite `app/events/page.tsx` to query Supabase, split on `starts_at` versus now, and map rows into the existing `Slide` shape. **Make the featured slide conditional** — line 103 currently assumes a current event always exists (verified) and will crash without one.
      - Convert `app/about/page.tsx` from build-time `fs.readFileSync` (line 40) to a client query, keeping `TeamSection`'s props shape intact.
      - Add the shared fallback: on any query failure, fetch the committed JSON (R9).
      - Re-run `npm run build`; it must still complete with no errors, and the Vercel preview deployment for the branch must serve all four routes.
      Covers: R4, R6, R8, R9, R16

- [x] **Phase 8: Keep-alive, deploy configuration, and handover**
      Done when: `.github/workflows/keepalive.yml` runs green on a manual trigger and commits refreshed JSON; the deploy workflow passes the Supabase variables to the build step; a dashboard-created event is confirmed visible on the **live deployed** site; `HANDOVER.md` exists.
      Steps:
      - Confirm whether the repository is public [A9]. **It is private** (verified 24 August 2026). Vercel deploys private repositories on the free plan, so this blocks nothing; it does mean the deployed site is public while its source is not.
      - Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the **Vercel project → Settings → Environment Variables**, for all environments. **Without these the deployed build silently falls back to JSON forever** — prove otherwise by deploying and confirming a dashboard-created event appears live. Neither belongs in a secret: both ship inside the website's JavaScript by design. The `SUPABASE_SERVICE_ROLE_KEY` belongs nowhere in either system — as built, nothing needs it outside a local one-off import.
      - Add `keepalive.yml`: weekly cron plus `workflow_dispatch`; reads both tables **with the anon key, through the same public read policies the website uses** — an earlier draft of this step said service-role, which would have handed a full-privilege key to CI for a job that only ever reads published rows. Writes `public/data/events.json` and `team.json`, commits only when changed (R12). Pin the runner to **Node 22 or newer**; see below.
      - Write `HANDOVER.md`: every account and who holds it; the two roles and how to change someone's; how to add and remove a committee login; how to transfer the Supabase project to a society-owned account; what to do if the project is found paused; and **how to re-enable the scheduled workflow from the Actions tab if GitHub has disabled it** [A10].
      Covers: R12; checks: A9, A10

      **What this phase got wrong, found on 24 August 2026.** It was ticked without its own "done when" ever being met: the job had never run at all, let alone green. Two reasons, both invisible from the branch it was written on.

      1. *It was not on the default branch.* GitHub reads `schedule:` triggers, and offers the manual Run button, only from a repository's default branch. On `add-supabase-admin-plan` the file existed, looked right, and could never fire — so the anti-pause safety net this whole phase is about was inert, while `HANDOVER.md` sent the reader to an Actions tab that did not list it. Merging to the fork's `main` is what made it real. The lesson generalises: a workflow is not tested until it has run where it will actually live.
      2. *Node 20 has no `WebSocket`.* `@supabase/supabase-js` constructs a realtime client inside `createClient()` whether or not realtime is used, and that needs a global `WebSocket`, which Node gained in 22. The first real run died on line 31 of `export-content.mjs`, before reading a row. It had passed locally throughout because the local machine runs Node 24 — the version pin in CI was the only place the two differed, and pinning to an older runtime than you develop on is what hid it.

      Both are now fixed and the job has run green end to end, reading the database and correctly reporting no changes to commit.
