# DBAS website — handover

For whoever maintains this next. You do not need to have built it, and you do
not need to be a developer to do most of what is here.

Written on 18 August 2026.

---

## What changed, in one paragraph

Events and committee members used to live in two files in the code
(`public/data/events.json` and `team.json`), so changing them meant editing
code and redeploying. They now live in a **Supabase** database, and the
committee edits them through a form at **`/admin`** on the website. Changes
appear on the public site within seconds. The JSON files are still there, but
demoted to a safety net — see [If the site shows old content](#if-the-site-shows-old-content).

---

## Accounts this depends on

Losing any of these loses something. **All three should be held by more than
one person.**

| Account | What it holds | What breaks without it |
|---|---|---|
| **GitHub** — repository `minhducxD/dbas-web` (private) | All the code | No one can change or deploy the site |
| **Supabase** — project `tqdlzrtepwdssgzjpngk`, region Sydney | Every event and committee member, and everyone's login | Events and the team page fall back to whatever was last saved to the JSON files, and nobody can sign in to `/admin` |
| **Vercel** — project `dbas-web`, team `dbas1` | The deployment, live at **https://dbas-web-tau.vercel.app** | The site goes offline |

The live address is `dbas-web-tau.vercel.app`. Vercel also answers on
`dbas-web-dbas1.vercel.app`, which is an internal alias sitting behind Vercel's
own login — if you test that one you will be bounced to a Vercel sign-in page
and conclude the site is broken when it is fine. When in doubt, the production
URL is the one `vercel project ls` prints, not the one the naming pattern
suggests.

> **This has already happened once.** An earlier Vercel deployment
> (`dbas-web-phi.vercel.app`) returns "deployment not found" because the
> project behind it was removed. The site survived only because a second
> deployment existed. Do not let any of these sit with one person.

### Before an outgoing committee leaves

1. **Supabase** → Organization → Team → add the incoming person as an Owner,
   *before* the outgoing one leaves. If the project sits on a personal account,
   transfer it to an organisation owned by the society.
2. **Vercel** → Project → Settings → Members → same.
3. **GitHub** → add the incoming person as an admin of the repository.
4. Update the table above with who holds what, and commit it.

---

## Managing content

Go to `/admin` on the site and sign in.

- **Events** — add, edit, delete, and choose which one is featured on the
  carousel. Upcoming and past are worked out from the date, so an event moves
  itself into Past once its date passes. Nothing needs moving by hand.
- **Team** — add, edit, remove and reorder committee members. The order in the
  list is the order on the About page.

Both accept an uploaded image, up to 5 MB, PNG/JPEG/WebP/GIF.

Events accept a **second, optional picture** — "Carousel image". It is used only
for the wide banner at the top of the Events page, and only while that event is
the featured one. Leave it empty and the banner uses the event's main image, as
it always did. It exists because the banner crops to a wide strip, so a tall
poster loses its top and bottom there while looking fine on the event's card
below — this lets one event use a different picture in each place.

Underneath it, **"Position on the carousel"** decides which part of that picture
stays visible. Size it with the **Size** slider — anywhere from 20% to 400% —
then **drag the picture around**. It moves under your cursor, and the box shows
only the part that will appear on the site.

**The whole picture is always kept.** The banner is a window onto it, never a
crop of it, so nothing is ever trimmed away no matter how you size or place it.
At 100% the entire picture fits inside the banner with the site's dark
background above and below; turn the size up until those dark edges disappear if
you want it to fill the banner instead.

You can also drag the picture right off the edge, partly or completely. That is
allowed rather than prevented, so **Reset** is there to put it back if you
overshoot.

Positioning is drag-only, so it needs a mouse or a touchscreen. Only the size can
be set from the keyboard.

Check both shapes before saving. The heading and button sit **over the picture**,
on the right on a computer and along the bottom on a phone, and the preview
outlines exactly where. A face placed dead centre disappears behind the text on
one shape or the other — which is the reason this control exists at all.

### The two roles

| Role | Can do |
|---|---|
| **admin** | Everything, including the committee list |
| **editor** | Events only |

Editors are not shown the Team tab, but that is only the screen being tidy —
the database itself refuses their writes, so it holds even for someone poking
at it directly.

### Adding someone

1. Supabase → Authentication → Users → **Add user** → **Create new user**.
2. **Turn on "Auto Confirm User"**, or they will not be able to sign in. There
   is no email provider configured, so the confirmation email never arrives.
3. They start as an **editor**. To make them an admin, run this in Supabase →
   SQL Editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'them@example.com';
   ```

   This only works from the SQL Editor. From the website itself, only an
   existing admin can change a role.

### Removing someone

Supabase → Authentication → Users → delete the user. Their permission record
goes with them automatically. Deleting a login does **not** remove them from
the About page — that is the Team section, and separate.

---

## If the site shows old content

Almost certainly the Supabase project is paused. **Free projects pause after a
week with no activity**, and the site then falls back to the last saved copy of
the content instead of going blank.

1. Open the Supabase dashboard. A paused project says so, with a Restore
   button. Restoring takes a few minutes and loses nothing.
2. Check the **Refresh content and keep Supabase awake** workflow under the
   repository's Actions tab. It runs weekly and exists to stop exactly this.
   **If GitHub has disabled it**, re-enable it there — GitHub switches off
   scheduled workflows in a repository with no activity for 60 days, and
   *always* switches them off in a fork.

A paused project can be restored for 90 days. After that the data is gone, so
do not leave it.

---

## If the dashboard works but the public site never changes

The deployment is missing its database settings, so it is serving the fallback
files forever. It looks like it works, which is what makes this one sneaky.

Vercel → Project → Settings → Environment Variables. Both of these must be
present, for all environments:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Copy them from Supabase → Settings → API. Both are safe to expose — they ship
inside the website's JavaScript by design. **The `service_role` key is not**;
it bypasses every security rule and belongs nowhere near the website or Vercel.
Redeploy after adding them.

---

## The weekly job

`.github/workflows/keepalive.yml` runs on Sundays and does three things at once:

1. Reads the database, which stops the free project idling out.
2. Rewrites `public/data/events.json` and `team.json` from live content, so the
   safety net stays current instead of freezing.
3. Commits the result — which counts as repository activity, so GitHub does not
   switch the schedule off after 60 days.

It needs two repository **variables** (not secrets): Settings → Secrets and
variables → Actions → Variables → `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`.

You can run it by hand any time from the Actions tab.

**It only runs from the default branch.** GitHub reads `schedule:` triggers,
and offers the manual Run button, only from a repository's default branch —
`main` here. On any other branch the file sits there looking correct and never
runs once. If you move this work to another repository, it is not live until
it is merged to that repository's default branch.

**It needs Node 22 or newer.** The Supabase client builds a realtime connection
the moment it is created, whether or not anything uses realtime, and that needs
a `WebSocket` that Node only gained in 22. On Node 20 the job fails on its first
line. The same applies to running `node scripts/export-content.mjs` by hand.

---

## Backups — read this before you need it

**The Supabase free plan has no automatic backups.** Supabase back up Pro,
Team and Enterprise projects daily; Free is not included, and point-in-time
recovery is not available on it either. If someone deletes every event, there
is nothing on Supabase's side to restore from.

What does protect you:

| What | Where it lives | Gap |
|---|---|---|
| Published events and team members | `public/data/*.json`, rewritten and committed by the weekly job | Up to a week out of date; published rows only |
| Tables, security rules, roles | `supabase/migrations/` in this repository | None — re-runnable from scratch |
| **Committee logins** | **Nowhere** | Would have to be re-created by hand in Supabase |

Because the weekly job commits its output, git history is effectively a
versioned backup of the site's content. To recover something deleted, look
through the history of `public/data/` or the migration files, rather than
Supabase.

**Before anything risky** — a bulk delete, a schema change, handing over to a
new committee — take a manual snapshot by running the workflow from the Actions
tab, or locally:

```
node scripts/export-content.mjs
```

Then commit the result. That is a restore point.

---

## Backing out entirely

If this ever needs to be undone, the old way still works. The public pages read
the database first and the JSON files second, so reverting returns the site to
reading the JSON files with no database involved. Nothing in this project
deletes those files.

All of it arrived on `main` as one merge commit, so backing it out is a single
`git revert -m 1 <that commit>` rather than unpicking twenty.

---

## Where things are

| | |
|---|---|
| `PLAN.md` | Why every decision was made, and what was deliberately left out |
| `supabase/migrations/` | Every database change, in order, re-runnable |
| `app/admin/` | The dashboard |
| `lib/content.ts` | Loading content, and the fallback logic |
| `scripts/export-content.mjs` | Writes the JSON safety net from the database |
| `public/data/*.json` | The safety net itself |

One other workflow, `.github/workflows/nextjs.yml`, is a leftover GitHub Pages
deploy inherited from the original repository. It is **disabled** under the
Actions tab, because it is not how this site deploys and it fails on every
push to `main` if left on. The file was kept rather than deleted so this
repository stays otherwise identical to the one it was forked from. If you
re-enable it by accident, disable it again — it deploys nothing anyone uses.

The migrations are worth reading in order if you need to understand the
security rules. `0001` sets them up and explains the reasoning; `0003` explains
what was tightened and why.
