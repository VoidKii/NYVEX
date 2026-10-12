# NYVEX — Autonomous AI Agent

A futuristic, private-by-default AI workspace built with Node.js and plain browser JavaScript. NYVEX can chat, create a mission plan, and use a bounded set of tools: public web search, safe arithmetic, and a local notes workspace. It does **not** run arbitrary shell commands or control your computer.

## Run it locally (Windows)

1. Install Node.js 20+ from https://nodejs.org/.
2. Clone or download this repository.
3. Copy `.env.example` to `.env`.
4. For the recommended free-tier option, set `GEMINI_API_KEY=your_key_here` and keep `GEMINI_MODEL=gemini-3.1-flash-lite`. NYVEX uses Gemini when that key is present. Alternatively, set `OPENAI_API_KEY` for OpenAI.
5. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` for separate user accounts and personal cloud memory; create the table by running `supabase/schema.sql` in the Supabase SQL Editor.
6. Set `NYVEX_SESSION_SECRET` to a long, random private value. For legacy single-password mode, set `NYVEX_ACCESS_PASSWORD`.
7. In this folder, run `npm start` (or double-click `START-NYVEX.bat`).
8. Open http://localhost:3000.

**Never commit your real `.env` or paste an API key into chat.** `.gitignore` excludes `.env`. Free-tier AI has usage limits, and sharing the app means all users share the same provider quota. Do not enable paid billing unless a parent/guardian who manages the account has reviewed it.

## Deploy to Render

Create a Node Web Service from this repository. Use build command `npm install` and start command `npm start`. In Render **Environment**, configure `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-3.1-flash-lite` (or the OpenAI variables), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `NYVEX_SESSION_SECRET`. Keep the existing `NYVEX_ACCESS_PASSWORD` for legacy fallback mode. NYVEX prefers Gemini whenever `GEMINI_API_KEY` is present. Free AI tiers have quotas; do not enable paid billing without the account holder/guardian reviewing it. Use only the Supabase publishable/anon key in `SUPABASE_ANON_KEY`; never use a service-role/secret key in frontend configuration. Run `supabase/schema.sql` in the Supabase SQL Editor. Since newer Supabase projects may not expose new tables through the Data API by default, ensure the `public.nyvex_memories` table is exposed/enabled in the project's Data API settings after creation. Email confirmation may be required at signup. Share the NYVEX access password only with people you trust: everyone shares the same model quota.

## Use NYVEX on a phone

NYVEX is a responsive web app and can be added to a phone's home screen from its browser. Open the Render URL over HTTPS, unlock the workspace, then:

- **Android:** open the browser menu and choose **Install app** or **Add to Home screen**. The in-page Install button opens the install prompt where supported.
- **iPhone:** open the page in Safari, tap **Share**, then **Add to Home Screen**.

The app shell can open from cache after it has been visited, but chat, login, research, and AI requests still need an internet connection. Do not treat this as a fully offline AI app. Each person signs in with their own Supabase account. Personal memories are stored in the cloud and shared across that account's signed-in devices; chat transcripts remain stored per account on each browser for now. Voice input depends on browser support and a user gesture; NYVEX does not always-listen for a wake phrase.

## What is included

- DREAM, FORGE, SCOUT, and TACTIC modes.
- Chat and structured mission planner.
- Bounded tool loop (up to four rounds) with visible tool activity.
- Web search, safe arithmetic, and workspace note creation/listing.
- Browser-side chat history and checkable mission tasks.
- Responsive phone layout, installable web-app manifest, and a small offline app-shell cache that never caches AI/API responses.
- Supabase email/password accounts, account-specific browser chat storage, and cloud-saved personal memories protected by row-level security.
- Push-to-talk speech recognition where the browser supports it, read-aloud response buttons, and optional auto-spoken replies. Voice features require microphone permission and internet/provider access for AI responses.
- Password-protected access, signed HttpOnly sessions, request-size limits, per-IP throttling, security headers, and same-origin API checks.
- No local AI model required, so the laptop does not need to run a large model. Cloud API limits and charges still apply.

## Roadmap

This is a starter agent, not a fully autonomous computer operator. It doesn't run forever in the background, edit arbitrary projects, make purchases, or control the OS. Image generation, uploads/document understanding, cloud-synced chat transcripts, a true wake phrase, approval-gated project editing, background task queues, and multiple specialist agents can be added later.
