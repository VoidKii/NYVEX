# NYVEX — Autonomous AI Agent

A futuristic, private-by-default AI workspace built with Node.js and plain browser JavaScript. NYVEX can chat, create a mission plan, and use a bounded set of tools: public web search, safe arithmetic, and a local notes workspace. It does **not** run arbitrary shell commands or control your computer.

## Run it locally (Windows)

1. Install Node.js 20+ from https://nodejs.org/.
2. Clone or download this repository.
3. Copy `.env.example` to `.env`.
4. For the recommended free-tier option, set `GEMINI_API_KEY=your_key_here` and keep `GEMINI_MODEL=gemini-3.1-flash-lite`. NYVEX uses Gemini when that key is present. Alternatively, set `OPENAI_API_KEY` for OpenAI.
5. Set `NYVEX_ACCESS_PASSWORD` to a strong, unique password in `.env`.
6. In this folder, run `npm start` (or double-click `START-NYVEX.bat`).
7. Open http://localhost:3000.

**Never commit your real `.env` or paste an API key into chat.** `.gitignore` excludes `.env`. Free-tier AI has usage limits, and sharing the app means all users share the same provider quota. Do not enable paid billing unless a parent/guardian who manages the account has reviewed it.

## Deploy to Render

Create a Node Web Service from this repository. Use build command `npm install` and start command `npm start`. In the Render service's **Environment** settings, add `GEMINI_API_KEY`, set `GEMINI_MODEL=gemini-3.1-flash-lite`, and set a strong, unique `NYVEX_ACCESS_PASSWORD`. NYVEX prefers Gemini whenever `GEMINI_API_KEY` is present; it can fall back to `OPENAI_API_KEY` if no Gemini key is set. Google offers a free tier for eligible Gemini API models, but project/model quotas apply and can change. Use the free tier only; don't attach paid billing just to make this work. If Google requires the account holder to be an adult, ask a parent/guardian to create and manage the key—do not bypass age or account rules. Enter the key directly in Render; never put it in the repo or share it in chat. GitHub repository secrets do not automatically become environment variables for a running web service. Share the NYVEX access password only with people you trust: everyone shares the same model quota.

## What is included

- DREAM, FORGE, SCOUT, and TACTIC modes.
- Chat and structured mission planner.
- Bounded tool loop (up to four rounds) with visible tool activity.
- Web search, safe arithmetic, and workspace note creation/listing.
- Browser-side chat history and checkable mission tasks.
- Password-protected access, signed HttpOnly sessions, request-size limits, per-IP throttling, security headers, and same-origin API checks.
- No local AI model required, so the laptop does not need to run a large model. Cloud API limits and charges still apply.

## Roadmap

This is a starter agent, not a fully autonomous computer operator. It doesn't run forever in the background, edit arbitrary projects, make purchases, or control the OS. Image generation, uploads/document understanding, durable cloud memory, approval-gated project editing, background task queues, and multiple specialist agents can be added later.
