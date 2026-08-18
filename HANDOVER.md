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
| **GitHub** — the repository | All the code | No one can change or deploy the site |
| **Supabase** — project `tqdlzrtepwdssgzjpngk`, region Sydney | Every event and committee member, and everyone's login | Events and the team page fall back to whatever was last saved to the JSON files, and nobody can sign in to `/admin` |
| **Vercel** — the project serving the live site | The deployment | The site goes offline |

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

---

## Backing out entirely

If this ever needs to be undone, the old way still works. The public pages read
the database first and the JSON files second, so reverting the commits on this
branch returns the site to reading the JSON files with no database involved.
Nothing in this project deletes those files.

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

The migrations are worth reading in order if you need to understand the
security rules. `0001` sets them up and explains the reasoning; `0003` explains
what was tightened and why.
