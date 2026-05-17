# Family OS

A shared family operating system — calendar, chores, meal planner, grocery list,
info hub — designed for a wall-mounted tablet in the kitchen or living room.

Built with React 19 + Vite + Tailwind, Supabase for realtime sync, and Gemini for
voice-to-calendar. Deploys to Vercel.

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
