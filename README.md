# Family OS

A shared family operating system — calendar, chores, meal planner, grocery list,
info hub — designed for a wall-mounted tablet in the kitchen or living room.

Built with React 19 + Vite + Tailwind, Supabase for realtime sync, and Gemini for
voice-to-calendar. Deploys to Vercel.

## Deploy the MVP in one tap

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjustdoylewv%2Ffamily-os&project-name=family-os&repository-name=family-os)

The MVP runs with **no env vars**: data stays in the device's `localStorage`,
voice and Google Calendar sync are gracefully disabled. Once you're ready,
follow the Supabase + Google setup below and paste the env vars into the
Vercel dashboard — no redeploy needed for Vite to pick them up on the next
build.

---

## Quick start (local dev, no backend)

```bash
npm install
npm run dev
```

Without env vars set, the app runs in demo mode against `localStorage` —
useful for poking at the UI. Two tablets will not share state in demo mode.

## Full setup (sync + auth + voice)

### 1. Create a Supabase project

1. Sign up at <https://supabase.com>, create a new project, choose a region.
2. In the SQL editor, paste and run [`supabase/schema.sql`](supabase/schema.sql).
3. **Authentication → Users → Add user**: create one user with a known email and
   a password. This password becomes the *family password* every tablet uses.
   - Email: anything (e.g. `family@yourdomain.local`). It never receives mail.
   - Password: pick something memorable for your family.
   - Auto-confirm the user (toggle the box, or in SQL: `update auth.users set
     email_confirmed_at = now()`).

### 2. Google Cloud (optional, for Calendar sync + Gemini voice)

- **Gemini API key** — <https://aistudio.google.com/app/apikey>
- **Google OAuth client** for Calendar — Cloud Console → APIs & Services →
  Credentials → Create OAuth client (Web). Add redirect URI
  `https://<your-vercel-domain>/api/auth/google/callback`.

### 3. Env vars

Copy `.env.example` to `.env.local` for dev, and set the same vars in your
Vercel project for production:

| Var | What |
| --- | --- |
| `VITE_SUPABASE_URL` | From Supabase → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Same place. Safe to ship to browser. |
| `VITE_FAMILY_EMAIL` | The email you set in step 1.3 (if not the default) |
| `VITE_ADMIN_PASSWORD` | Temporary client-side admin gate (will move server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. From Supabase API settings. |
| `GEMINI_API_KEY` | From AI Studio |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | From Cloud Console |
| `ANTHROPIC_API_KEY` | Server-only. Claude API key for the fridge photo scan (console.anthropic.com) |
| `SHORTCUT_TOKEN` | Server-only. Any long random string; the Siri shortcut sends it |

### 4. Deploy

```bash
npx vercel
```

Vercel auto-detects Vite. Paste the env vars from step 3 into the project
settings. The app lives at `https://<project>.vercel.app`.

---

## Scripts

| Command | What |
| --- | --- |
| `npm run dev` | Vite dev server on `localhost:3000` |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run typecheck` | TS strict check, no emit |
| `npm run preview` | Serve the built `dist/` locally |

## Tablet kiosk mode (iPad)

After the web app is live, on the tablet:

1. Open the Vercel URL in Safari.
2. Share → **Add to Home Screen** → open from the home screen.
3. The PWA manifest puts it in fullscreen with the status bar styled to match.
4. Settings → Accessibility → Guided Access (optional) locks the tablet to the
   app so kids can't browse away.

A native iPad/Mac app build comes in a later phase using Tauri or Capacitor.

## Groceries: voice, fridge scan, Siri

- **Type or say several items at once:** "milk, eggs and mac and cheese" becomes three items, each
  filed under its aisle automatically. Items already on the list are skipped; pantry items move back.
- **Buy again:** things in the pantry show as one-tap chips under the add bar.
- **Scan fridge:** take a photo; Claude compares it with the list and the pantry, then suggests
  what to add and what's already stocked. Nothing changes until you tap **Update list**.
  Needs `ANTHROPIC_API_KEY`.
- **"Hey Siri, add groceries"** (each iPhone): Shortcuts app → new shortcut "Add groceries" →
  **Dictate Text** → **Get Contents of URL** (`https://<your-app>/api/add-groceries`, POST,
  JSON body: `token` = your `SHORTCUT_TOKEN`, `text` = Dictated Text) → **Speak Text** (Contents of URL).

## Google Calendar (two-way sync)

The app keeps the family's Google Calendar in sync on its own: new, changed and deleted events
flow in every 10 minutes while the app is open, and events added in Family OS go onto Google
Calendar. The Google sign-in is stored on the server (Supabase, server-only table), so it never
expires on the tablet. Categories and family members you set in the app are kept on every sync.

One-time setup:

1. **Supabase → SQL editor:** run [`supabase/migrations/20261011_google_calendar_sync.sql`](supabase/migrations/20261011_google_calendar_sync.sql).
2. **Google Cloud Console** → your OAuth client: the redirect URI must be
   `https://<your-app>/api/auth/google/callback`, and the **Google Calendar API** must be enabled.
   The app asks for calendar read access plus permission to add events.
3. **Vercel:** `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` set.
4. In the app: **Calendar → Connect Google**, sign in with the account that has the family calendar.
   It picks the calendar with "Family" in its name (the Maurer Family calendar) automatically.

Optional backup sync when no screen is open: set `CRON_SECRET` in Vercel and add a cron for
`/api/calendar/sync` in `vercel.json`.

## Wall tablet: message board and photo slideshow

- **Board:** sticky notes and finger-drawn doodles, each optionally signed by a family member.
  Run [`supabase/migrations/20261011_message_board.sql`](supabase/migrations/20261011_message_board.sql) once.
- **Photo slideshow:** after a few minutes untouched (default 3), family photos rotate full screen
  with the clock and what's next; a tap brings the app back. The **Photos** button starts it any time.
  Set it up in **Info Hub → Admin Mode → Photo slideshow** by pasting a shared Google Photos album
  link (Google Photos → album → Share → Create link). Photos added to the album show up within a few hours.

## Money: bills & subscriptions

A register of every recurring payment: amount, how often, a due date, autopay or not, which
card or account pays it (last four only), and which email the account is under. The page shows
the true monthly total, what's due in the next 30 days, overdue manual bills (with **Mark paid**),
and yearly renewals coming up in the next 60 days. It sits behind Admin Mode so finances aren't on
the family-room wall. Run [`supabase/migrations/20261011_bills.sql`](supabase/migrations/20261011_bills.sql) once.

Logins and passwords belong in a family password manager (1Password Families, Bitwarden), never in the app.
Next step once the family email exists: a daily inbox reader that fills this register from receipts
and renewal emails and flags new subscriptions and price increases.

## Database changes to run

Paste [`supabase/upgrade-2026-10.sql`](supabase/upgrade-2026-10.sql) into Supabase → SQL editor → Run.
It contains the three migrations in `supabase/migrations/` and is safe to run more than once.

## Weather

The Home screen shows live weather from [Open-Meteo](https://open-meteo.com) (free, no API key):
current temperature and conditions, today's high/low and rain chance, and the next three days.
Set the town in **Info Hub → Admin Mode → Weather** (e.g. "Columbus, OH"); left blank, it uses the
tablet's location if allowed. Refreshes every 30 minutes.
